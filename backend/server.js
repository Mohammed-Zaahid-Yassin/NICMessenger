require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = 'nic-messenger-secret-key-2024';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'nic-messenger/avatars',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'face' }]
    }
});

const attachmentStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: { folder: 'nic-messenger/attachments', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] }
});

const uploadAvatar = multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadAttachment = multer({ storage: attachmentStorage, limits: { fileSize: 10 * 1024 * 1024 } });

const io = new Server(server, {
    cors: { origin: "http://localhost:5173", methods: ["GET", "POST"], credentials: true }
});

const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                is_active BOOLEAN DEFAULT 1,
                avatar_url TEXT DEFAULT NULL,
                status TEXT DEFAULT 'Online',
                bio TEXT DEFAULT 'Hey there! I am using NIC Messenger.',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) return reject(err);
            
            db.run(`
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    username TEXT NOT NULL,
                    content TEXT,
                    image_url TEXT DEFAULT NULL,
                    recipient_id INTEGER DEFAULT NULL,
                    channel_id INTEGER DEFAULT NULL,
                    timestamp DATETIME,
                    is_pinned BOOLEAN DEFAULT 0,
                    is_deleted BOOLEAN DEFAULT 0,
                    deleted_by TEXT DEFAULT NULL,
                    edited BOOLEAN DEFAULT 0,
                    is_read BOOLEAN DEFAULT 0,
                    reply_to INTEGER DEFAULT NULL,
                    reply_to_username TEXT DEFAULT NULL,
                    reply_to_content TEXT DEFAULT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `, (err) => {
                if (err) return reject(err);
                
                db.run("ALTER TABLE messages ADD COLUMN image_url TEXT DEFAULT NULL", () => {});
                db.run("ALTER TABLE messages ADD COLUMN recipient_id INTEGER DEFAULT NULL", () => {});
                db.run("ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT 0", () => {});
                db.run("ALTER TABLE messages ADD COLUMN channel_id INTEGER DEFAULT NULL", () => {});
                
                db.run(`
                    CREATE TABLE IF NOT EXISTS reactions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        message_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        user_username TEXT NOT NULL,
                        emoji TEXT NOT NULL,
                        FOREIGN KEY (message_id) REFERENCES messages(id),
                        FOREIGN KEY (user_id) REFERENCES users(id),
                        UNIQUE(message_id, user_id, emoji)
                    )
                `, (err) => {
                    if (err) return reject(err);

                    db.run(`
                        CREATE TABLE IF NOT EXISTS channels (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            name TEXT NOT NULL,
                            description TEXT DEFAULT '',
                            is_private BOOLEAN DEFAULT 1,
                            created_by INTEGER,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (created_by) REFERENCES users(id)
                        )
                    `, () => {
                        db.run(`
                            CREATE TABLE IF NOT EXISTS channel_members (
                                channel_id INTEGER,
                                user_id INTEGER,
                                role TEXT DEFAULT 'member',
                                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                FOREIGN KEY(channel_id) REFERENCES channels(id),
                                FOREIGN KEY(user_id) REFERENCES users(id),
                                UNIQUE(channel_id, user_id)
                            )
                        `, () => {
                            console.log('✅ All Database tables ready');
                            resolve();
                        });
                    });
                });
            });
        });
    });
}

function createAdminAccount() {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
            if (err) return reject(err);
            if (!row) {
                const hashedPassword = bcrypt.hashSync('admin123', 10);
                db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hashedPassword, 'admin'], () => {
                    console.log('✅ Admin account created successfully');
                    resolve();
                });
            } else resolve();
        });
    });
}

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    try {
        db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
            if (user) return res.status(400).json({ error: 'Username already taken' });
            const hashedPassword = await bcrypt.hash(password, 10);
            db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
                if (err) return res.status(500).json({ error: 'Error creating user' });
                const token = jwt.sign({ id: this.lastID, username, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
                res.json({ success: true, token, user: { id: this.lastID, username, role: 'user', avatar_url: null, status: 'Online', bio: 'Hey there! I am using NIC Messenger.' } });
            });
        });
    } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'User not found' });
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role, avatar_url: user.avatar_url, status: user.status, bio: user.bio } });
    });
});

app.post('/api/profile/update', (req, res) => {
    const { userId, bio, status } = req.body;
    db.run('UPDATE users SET bio = ?, status = ? WHERE id = ?', [bio, status, userId], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to update profile' });
        res.json({ success: true, message: 'Profile updated successfully' });
        db.get('SELECT id, username, status, avatar_url, bio FROM users WHERE id = ?', [userId], (err, user) => {
            if (!err && user) io.emit('user profile updated', user);
        });
    });
});

app.post('/api/profile/avatar', uploadAvatar.single('avatar'), (req, res) => {
    if (!req.file || !req.file.path) return res.status(400).json({ error: 'No image uploaded' });
    const { userId } = req.body;
    const avatarUrl = req.file.path;
    db.run('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, userId], function(err) {
        res.json({ success: true, avatarUrl });
        db.get('SELECT id, username, status, avatar_url, bio FROM users WHERE id = ?', [userId], (err, user) => {
            if (!err && user) io.emit('user profile updated', user);
        });
    });
});

app.post('/api/messages/image', (req, res) => {
    uploadAttachment.single('image')(req, res, function (err) {
        if (err || !req.file) return res.status(500).json({ error: 'Upload error' });
        res.json({ success: true, imageUrl: req.file.path });
    });
});// ===== SECURE SOCKET SETUP & ROUTING =====
const connectedUsers = {};
const typingUsers = {};

async function startServer() {
    await initializeDatabase();
    await createAdminAccount();
    server.listen(4000, '0.0.0.0', () => console.log(`🚀 NIC Messenger running securely on port 4000`));
    setupSocketIO();
}

function setupSocketIO() {
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication required'));
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.userId = decoded.id;
            socket.username = decoded.username;
            socket.role = decoded.role;
            next();
        } catch (error) { next(new Error('Invalid token')); }
    });

    io.on('connection', (socket) => {
        socket.join(socket.userId.toString());
        
        db.all(`SELECT channel_id FROM channel_members WHERE user_id = ?`, [socket.userId], (err, rows) => {
            if (rows) rows.forEach(r => socket.join(`channel_${r.channel_id}`));
        });
        
        db.get('SELECT avatar_url, status, bio FROM users WHERE id = ?', [socket.userId], (err, userProfile) => {
            connectedUsers[socket.id] = {
                id: socket.userId, username: socket.username, role: socket.role,
                avatar_url: userProfile ? userProfile.avatar_url : null,
                status: userProfile ? userProfile.status : 'Online',
                bio: userProfile ? userProfile.bio : ''
            };
            io.emit('user list', Object.values(connectedUsers));
        });

        const sendChannelsToClient = () => {
            db.all(`
                SELECT c.*, cm.role 
                FROM channels c 
                INNER JOIN channel_members cm ON c.id = cm.channel_id
                WHERE cm.user_id = ?
            `, [socket.userId], (err, rows) => {
                if (!err && rows) socket.emit('channel list', rows);
            });
        };
        sendChannelsToClient();
        
        const executeMessageFetch = (targetRecipientId = null, targetChannelId = null) => {
            let query = `
                SELECT m.*, u.avatar_url,
                       GROUP_CONCAT(DISTINCT r.emoji) as reactions, 
                       GROUP_CONCAT(DISTINCT r.user_username) as reaction_users 
                FROM messages m 
                LEFT JOIN users u ON m.user_id = u.id
                LEFT JOIN reactions r ON m.id = r.message_id 
                WHERE m.is_deleted = 0 
            `;
            const params = [];

            if (targetRecipientId) {
                query += ` AND m.channel_id IS NULL AND ((m.user_id = ? AND m.recipient_id = ?) OR (m.user_id = ? AND m.recipient_id = ?)) `;
                params.push(socket.userId, targetRecipientId, targetRecipientId, socket.userId);
            } else if (targetChannelId) {
                query += ` AND m.channel_id = ? `;
                params.push(targetChannelId);
            } else {
                query += ` AND m.recipient_id IS NULL AND m.channel_id IS NULL `;
            }

            query += ` GROUP BY m.id ORDER BY m.timestamp ASC LIMIT 100`;

            db.all(query, params, (err, rows) => {
                if (err) return console.error('❌ Fetch Error:', err);
                const messages = rows.map(row => ({ 
                    ...row, reactions: row.reactions ? row.reactions.split(',') : [], reaction_users: row.reaction_users ? row.reaction_users.split(',') : [] 
                }));
                socket.emit('previous messages', messages);
            });
        };

        const sendMessagesToClient = (targetRecipientId = null, targetChannelId = null) => {
            if (targetChannelId) {
                db.get('SELECT 1 FROM channel_members WHERE channel_id = ? AND user_id = ?', [targetChannelId, socket.userId], (err, row) => {
                    if (!row) return socket.emit('error', 'Access Denied: Not a member of this channel.');
                    executeMessageFetch(targetRecipientId, targetChannelId);
                });
            } else {
                executeMessageFetch(targetRecipientId, targetChannelId);
            }
        };

        sendMessagesToClient(null, null);

        socket.on('switch chat', ({ recipientId, channelId }) => {
            sendMessagesToClient(recipientId || null, channelId || null);
        });

        socket.on('create channel', (data) => {
            if (socket.role !== 'admin' && socket.username !== 'admin') return; 

            const { name, description, members } = data;
            const safeName = String(name).trim();
            if (!safeName) return;
            
            db.run('INSERT INTO channels (name, description, is_private, created_by) VALUES (?, ?, 1, ?)', 
                [safeName, description || '', socket.userId], 
                function(err) {
                    if (err) return socket.emit('error', 'Failed to create channel');
                    const newChannelId = this.lastID;
                    
                    db.run('INSERT INTO channel_members (channel_id, user_id, role) VALUES (?, ?, ?)', [newChannelId, socket.userId, 'admin']);
                    socket.join(`channel_${newChannelId}`);
                    
                    if (members && Array.isArray(members)) {
                        members.forEach(mId => {
                            db.run('INSERT INTO channel_members (channel_id, user_id, role) VALUES (?, ?, ?)', [newChannelId, mId, 'member'], () => {
                                io.to(mId.toString()).socketsJoin(`channel_${newChannelId}`);
                                io.to(mId.toString()).emit('force channel fetch');
                            });
                        });
                    }
                    io.to(socket.userId.toString()).emit('force channel fetch');
                }
            );
        });

        socket.on('get channel members', (channelId) => {
            if (socket.role !== 'admin' && socket.username !== 'admin') return;
            db.all('SELECT user_id FROM channel_members WHERE channel_id = ? AND role != ?', [channelId, 'admin'], (err, rows) => {
                if (!err && rows) {
                    socket.emit(`channel members ${channelId}`, rows.map(r => r.user_id));
                }
            });
        });

        // FIXED: Explicitly process the Edit logic and force a global UI sync
        socket.on('edit channel', (data) => {
            if (socket.role !== 'admin' && socket.username !== 'admin') return;
            
            const channelId = Number(data.channelId);
            const safeName = String(data.name).trim();
            const description = data.description || '';
            const members = data.members || [];
            if (!safeName || !channelId) return;

            db.run('UPDATE channels SET name = ?, description = ? WHERE id = ?', [safeName, description, channelId], function(err) {
                if (err) return console.error(err);
                
                db.run('DELETE FROM channel_members WHERE channel_id = ? AND role != ?', [channelId, 'admin'], () => {
                    if (members.length > 0) {
                        members.forEach(mId => {
                            db.run('INSERT INTO channel_members (channel_id, user_id, role) VALUES (?, ?, ?)', [channelId, mId, 'member'], () => {
                                io.to(mId.toString()).socketsJoin(`channel_${channelId}`);
                                io.to(mId.toString()).emit('force channel fetch');
                            });
                        });
                    }
                    io.emit('force channel fetch');
                    io.emit('channel updated', { id: channelId, name: safeName, description: description });
                });
            });
        });

        // FIXED: Guaranteed multi-stage database cascade deletion
        socket.on('delete channel', (id) => {
            if (socket.role !== 'admin' && socket.username !== 'admin') return;
            
            const channelId = Number(id);
            db.run('DELETE FROM channels WHERE id = ?', [channelId], (err) => {
                if (err) return console.error(err);
                
                db.run('DELETE FROM channel_members WHERE channel_id = ?', [channelId], () => {
                    db.run('DELETE FROM messages WHERE channel_id = ?', [channelId], () => {
                        io.in(`channel_${channelId}`).socketsLeave(`channel_${channelId}`);
                        io.emit('channel deleted', channelId);
                        io.emit('force channel fetch');
                    });
                });
            });
        });

        socket.on('fetch channels', () => sendChannelsToClient());

        socket.on('mark read', ({ senderId }) => {
            if (!senderId) return;
            db.run(`UPDATE messages SET is_read = 1 WHERE recipient_id = ? AND user_id = ? AND is_read = 0`, [socket.userId, Number(senderId)], function(err) {
                    if (!err && this.changes > 0) {
                        io.to(senderId.toString()).to(socket.userId.toString()).emit('messages read', { readerId: socket.userId, senderId: Number(senderId) });
                    }
                }
            );
        });

        socket.on('typing start', () => { 
            typingUsers[socket.id] = socket.username; 
            socket.broadcast.emit('user typing', { username: socket.username, isTyping: true }); 
        });
        socket.on('typing stop', () => { 
            delete typingUsers[socket.id]; 
            socket.broadcast.emit('user typing', { username: socket.username, isTyping: false }); 
        });

        socket.on('chat message', (data) => {
            const safeContent = String(data.content || '').trim();
            const safeImageUrl = data.imageUrl || null;
            const recipientId = data.recipientId || null;
            const channelId = data.channelId || null;
            if (!safeContent && !safeImageUrl) return;
            const timestamp = new Date().toISOString();

            const insertMessage = () => {
                db.run('INSERT INTO messages (user_id, username, content, timestamp, image_url, recipient_id, channel_id, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)', 
                    [socket.userId, socket.username, safeContent, timestamp, safeImageUrl, recipientId, channelId], 
                    function(err) {
                        db.get('SELECT m.*, u.avatar_url FROM messages m LEFT JOIN users u ON m.user_id = u.id WHERE m.id = ?', [this.lastID], (err, msg) => {
                            if (err || !msg) return;
                            const formattedMsg = { ...msg, reactions: [], reaction_users: [], edited: false, is_read: 0 };
                            
                            if (recipientId) {
                                io.to(recipientId.toString()).to(socket.userId.toString()).emit('chat message', formattedMsg);
                            } else if (channelId) {
                                io.to(`channel_${channelId}`).emit('chat message', formattedMsg);
                            } else {
                                io.emit('chat message', formattedMsg);
                            }
                        });
                    }
                );
            };

            if (channelId) {
                db.get('SELECT 1 FROM channel_members WHERE channel_id = ? AND user_id = ?', [channelId, socket.userId], (err, row) => {
                    if (!row) return; 
                    insertMessage();
                });
            } else {
                insertMessage();
            }
        });

        socket.on('reply to message', ({ messageId, content, replyToUsername, replyToContent, recipientId, channelId }) => {
            const safeContent = String(content || '').trim();
            if (!safeContent) return;
            const targetId = Number(messageId);
            const timestamp = new Date().toISOString();
            
            const insertReply = () => {
                db.run('INSERT INTO messages (user_id, username, content, timestamp, reply_to, reply_to_username, reply_to_content, recipient_id, channel_id, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
                    [socket.userId, socket.username, safeContent, timestamp, targetId, replyToUsername || '', replyToContent || '', recipientId || null, channelId || null],
                    function(err) {
                        db.get('SELECT m.*, u.avatar_url FROM messages m LEFT JOIN users u ON m.user_id = u.id WHERE m.id = ?', [this.lastID], (err, msg) => {
                            if (err || !msg) return;
                            const formattedMsg = { ...msg, reactions: [], reaction_users: [], edited: false, is_read: 0 };
                            
                            if (recipientId) {
                                io.to(recipientId.toString()).to(socket.userId.toString()).emit('chat message', formattedMsg);
                            } else if (channelId) {
                                io.to(`channel_${channelId}`).emit('chat message', formattedMsg);
                            } else {
                                io.emit('chat message', formattedMsg);
                            }
                        });
                    }
                );
            };

            if (channelId) {
                db.get('SELECT 1 FROM channel_members WHERE channel_id = ? AND user_id = ?', [channelId, socket.userId], (err, row) => {
                    if (!row) return; 
                    insertReply();
                });
            } else {
                insertReply();
            }
        });

        socket.on('edit message', ({ messageId, content }) => {
            const targetId = Number(messageId);
            const safeContent = String(content || '').trim();
            db.get('SELECT * FROM messages WHERE id = ?', [targetId], (err, message) => {
                if (err || !message) return;
                const isAdmin = socket.role === 'admin';
                const isOwner = Number(message.user_id) === Number(socket.userId);
                if (!isAdmin && !isOwner) return;

                db.run('UPDATE messages SET content = ?, edited = 1 WHERE id = ?', [safeContent, targetId], function(err) {
                    if (!err && this.changes > 0) {
                        const payload = { messageId: targetId, content: safeContent, username: socket.username };
                        if (message.recipient_id) {
                            io.to(message.recipient_id.toString()).to(message.user_id.toString()).emit('message edited', payload);
                        } else if (message.channel_id) {
                            io.to(`channel_${message.channel_id}`).emit('message edited', payload);
                        } else {
                            io.emit('message edited', payload);
                        }
                    }
                });
            });
        });

        socket.on('delete message', (messageId) => {
            const targetId = Number(messageId);
            db.get('SELECT * FROM messages WHERE id = ?', [targetId], (err, message) => {
                if (err || !message) return;
                const isAdmin = socket.role === 'admin';
                const isOwner = Number(message.user_id) === Number(socket.userId);
                if (!isAdmin && !isOwner) return;

                db.run('UPDATE messages SET content = ?, image_url = NULL, is_deleted = 1, deleted_by = ? WHERE id = ?', 
                    ['This message was deleted', socket.username, targetId], 
                    function(err) {
                        if (!err && this.changes > 0) {
                            db.run('DELETE FROM reactions WHERE message_id = ?', [targetId]);
                            db.get('SELECT * FROM messages WHERE id = ?', [targetId], (err, row) => {
                                if (err || !row) return;
                                const payload = { messageId: targetId, content: row.content, deleted_by: row.deleted_by, is_deleted: row.is_deleted };
                                if (message.recipient_id) {
                                    io.to(message.recipient_id.toString()).to(message.user_id.toString()).emit('message deleted', payload);
                                } else if (message.channel_id) {
                                    io.to(`channel_${message.channel_id}`).emit('message deleted', payload);
                                } else {
                                    io.emit('message deleted', payload);
                                }
                            });
                        }
                    }
                );
            });
        });

        socket.on('add reaction', ({ messageId, emoji }) => {
            const targetId = Number(messageId);
            db.get('SELECT * FROM messages WHERE id = ?', [targetId], (msgErr, msgRow) => {
                if (msgErr || !msgRow) return;
                db.get('SELECT * FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?', [targetId, socket.userId, emoji], (err, row) => {
                    if (row) {
                        db.run('DELETE FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?', [targetId, socket.userId, emoji], () => sendReactionUpdate(targetId, msgRow));
                    } else {
                        db.run('INSERT INTO reactions (message_id, user_id, user_username, emoji) VALUES (?, ?, ?, ?)', [targetId, socket.userId, socket.username, emoji], () => sendReactionUpdate(targetId, msgRow));
                    }
                });
            });
        });

        function sendReactionUpdate(messageId, msgRow) {
            db.all('SELECT emoji, user_username FROM reactions WHERE message_id = ?', [messageId], (err, rows) => {
                if (!err) {
                    const payload = { messageId: messageId, reactions: rows.map(r => r.emoji), reactionUsers: rows.map(r => r.user_username) };
                    if (msgRow.recipient_id) {
                        io.to(msgRow.recipient_id.toString()).to(msgRow.user_id.toString()).emit('message reaction', payload);
                    } else if (msgRow.channel_id) {
                        io.to(`channel_${msgRow.channel_id}`).emit('message reaction', payload);
                    } else {
                        io.emit('message reaction', payload);
                    }
                }
            });
        }

        socket.on('kick user', (targetUsername) => {
            if (socket.role !== 'admin') return;
            const target = Object.entries(connectedUsers).find(([_, user]) => user.username === targetUsername);
            if (target) {
                const targetSocket = io.sockets.sockets.get(target[0]);
                if (targetSocket) { targetSocket.emit('kicked', 'You were removed by an admin.'); targetSocket.disconnect(true); }
                delete connectedUsers[target[0]];
                io.emit('user list', Object.values(connectedUsers));
            }
        });

        socket.on('disconnect', () => {
            delete connectedUsers[socket.id];
            delete typingUsers[socket.id];
            io.emit('user list', Object.values(connectedUsers));
            io.emit('user typing', { username: socket.username, isTyping: false });
        });
    });
}

startServer();