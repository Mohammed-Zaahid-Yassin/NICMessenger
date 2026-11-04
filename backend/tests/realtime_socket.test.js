const test = require('node:test');
const assert = require('node:assert');
const ioClient = require('socket.io-client');

process.env.DATABASE_PATH = ':memory:';
process.env.JWT_SECRET = 'socket-test-secret-2024';

const { app, server, initializeDatabase, createAdminAccount, db, setupSocketIO, io } = require('../server');

let socketUrl;
let adminToken;
let user1Token;
let user2Token;
let adminUser;
let user1;
let user2;

test.before(async () => {
    await initializeDatabase();
    await createAdminAccount();
    setupSocketIO();

    await new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
            const port = server.address().port;
            socketUrl = `http://127.0.0.1:${port}`;
            resolve();
        });
    });

    // Create test accounts via direct REST API calls
    const adminRes = await fetch(`${socketUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const adminData = await adminRes.json();
    adminToken = adminData.token;
    adminUser = adminData.user;

    const u1Res = await fetch(`${socketUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'member1', password: 'password123' })
    });
    const u1Data = await u1Res.json();
    user1Token = u1Data.token;
    user1 = u1Data.user;

    const u2Res = await fetch(`${socketUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'outsider', password: 'password123' })
    });
    const u2Data = await u2Res.json();
    user2Token = u2Data.token;
    user2 = u2Data.user;
});

test.after(async () => {
    await new Promise((resolve) => {
        io.close(() => {
            server.close(resolve);
        });
    });
});

test('Real-time: Sockets authenticate with JWT and join user room', async () => {
    const socket = ioClient(socketUrl, {
        auth: { token: adminToken },
        transports: ['websocket'],
        forceNew: true
    });

    await new Promise((resolve, reject) => {
        socket.on('connect', resolve);
        socket.on('connect_error', reject);
    });

    assert.strictEqual(socket.connected, true);
    socket.disconnect();
});

test('Real-time: Unauthenticated socket connection is rejected', async () => {
    const socket = ioClient(socketUrl, {
        auth: { token: 'invalid.jwt.token' },
        transports: ['websocket'],
        forceNew: true
    });

    const err = await new Promise((resolve) => {
        socket.on('connect_error', (error) => resolve(error));
    });

    assert.ok(err);
    assert.strictEqual(err.message, 'Invalid token');
    socket.disconnect();
});

test('Real-time: Channel creation, multi-client messaging, reply, reactions & isolation', async () => {
    const adminSocket = ioClient(socketUrl, { auth: { token: adminToken }, transports: ['websocket'], forceNew: true });
    const memberSocket = ioClient(socketUrl, { auth: { token: user1Token }, transports: ['websocket'], forceNew: true });
    const outsiderSocket = ioClient(socketUrl, { auth: { token: user2Token }, transports: ['websocket'], forceNew: true });

    await Promise.all([
        new Promise(r => adminSocket.on('connect', r)),
        new Promise(r => memberSocket.on('connect', r)),
        new Promise(r => outsiderSocket.on('connect', r))
    ]);

    // Step 1: Admin creates a channel with member1
    let createdChannelId;
    const channelCreatedPromise = new Promise((resolve) => {
        memberSocket.on('force channel fetch', () => {
            memberSocket.emit('fetch channels');
        });
        memberSocket.on('channel list', (channels) => {
            const found = channels.find(c => c.name === 'dev-team');
            if (found) {
                createdChannelId = found.id;
                resolve(found);
            }
        });
    });

    adminSocket.emit('create channel', {
        name: 'dev-team',
        description: 'Engineering collaboration',
        members: [user1.id]
    });

    const devChannel = await channelCreatedPromise;
    assert.ok(devChannel);
    assert.strictEqual(devChannel.name, 'dev-team');

    // Step 2: Admin sends a message to the channel; member receives it; outsider does NOT
    let outsiderReceivedMessage = false;
    outsiderSocket.on('chat message', (msg) => {
        if (msg.channel_id === devChannel.id) {
            outsiderReceivedMessage = true;
        }
    });

    const memberReceivedMessagePromise = new Promise((resolve) => {
        memberSocket.on('chat message', (msg) => {
            if (msg.channel_id === devChannel.id && msg.content === 'Hello Engineering!') {
                resolve(msg);
            }
        });
    });

    adminSocket.emit('chat message', {
        channelId: devChannel.id,
        content: 'Hello Engineering!'
    });

    const receivedMsg = await memberReceivedMessagePromise;
    assert.strictEqual(receivedMsg.content, 'Hello Engineering!');
    assert.strictEqual(receivedMsg.username, 'admin');

    // Wait 150ms to guarantee outsider isolation
    await new Promise(r => setTimeout(r, 150));
    assert.strictEqual(outsiderReceivedMessage, false, 'Outsider must not receive messages from private channel');

    // Step 3: Member replies to admin message
    const replyPromise = new Promise((resolve) => {
        adminSocket.on('chat message', (msg) => {
            if (msg.reply_to === receivedMsg.id) {
                resolve(msg);
            }
        });
    });

    memberSocket.emit('reply to message', {
        messageId: receivedMsg.id,
        content: 'Acknowledged and ready!',
        replyToUsername: receivedMsg.username,
        replyToContent: receivedMsg.content,
        channelId: devChannel.id
    });

    const replyMsg = await replyPromise;
    assert.strictEqual(replyMsg.content, 'Acknowledged and ready!');
    assert.strictEqual(replyMsg.reply_to, receivedMsg.id);

    // Step 4: Emoji reaction
    const reactionPromise = new Promise((resolve) => {
        adminSocket.on('message reaction', (payload) => {
            if (payload.messageId === receivedMsg.id && payload.reactions.includes('🚀')) {
                resolve(payload);
            }
        });
    });

    memberSocket.emit('add reaction', {
        messageId: receivedMsg.id,
        emoji: '🚀'
    });

    const reactionPayload = await reactionPromise;
    assert.strictEqual(reactionPayload.reactions.includes('🚀'), true);
    assert.strictEqual(reactionPayload.reactionUsers.includes('member1'), true);

    // Step 5: Direct Message between admin and member1
    const dmPromise = new Promise((resolve) => {
        memberSocket.on('chat message', (msg) => {
            if (!msg.channel_id && msg.recipient_id === user1.id && msg.content === 'Private ping') {
                resolve(msg);
            }
        });
    });

    adminSocket.emit('chat message', {
        recipientId: user1.id,
        content: 'Private ping'
    });

    const receivedDM = await dmPromise;
    assert.strictEqual(receivedDM.content, 'Private ping');
    assert.strictEqual(receivedDM.recipient_id, user1.id);

    // Clean up connections
    adminSocket.disconnect();
    memberSocket.disconnect();
    outsiderSocket.disconnect();
});
