const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Use an in-memory or isolated test database
process.env.DATABASE_PATH = ':memory:';
process.env.JWT_SECRET = 'integration-test-secret-2024';

const { app, initializeDatabase, createAdminAccount, db } = require('../server');

let testServer;
let baseUrl;

test.before(async () => {
    await initializeDatabase();
    await createAdminAccount();

    await new Promise((resolve) => {
        testServer = http.createServer(app);
        testServer.listen(0, '127.0.0.1', () => {
            const port = testServer.address().port;
            baseUrl = `http://127.0.0.1:${port}`;
            resolve();
        });
    });
});

test.after(async () => {
    if (testServer) {
        await new Promise((resolve) => testServer.close(resolve));
    }
});

test('Integration: GET /health returns operational status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(data.service, 'NIC Messenger API');
});

test('Integration: POST /api/register creates user and returns JWT token', async () => {
    const res = await fetch(`${baseUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'password123' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.token, 'Token must be returned');
    assert.strictEqual(data.user.username, 'alice');
    assert.strictEqual(data.user.role, 'user');
});

test('Integration: POST /api/register rejects duplicate username', async () => {
    const res = await fetch(`${baseUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'password456' })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Username already taken');
});

test('Integration: POST /api/login verifies valid credentials', async () => {
    const res = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'password123' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.token);
    assert.strictEqual(data.user.username, 'alice');
});

test('Integration: POST /api/login rejects invalid password', async () => {
    const res = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'WrongPassword!' })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Invalid username or password');
});

test('Integration: GET /api/me requires valid Authorization header', async () => {
    // Missing token
    const unauthRes = await fetch(`${baseUrl}/api/me`);
    assert.strictEqual(unauthRes.status, 401);

    // Invalid token
    const invalidRes = await fetch(`${baseUrl}/api/me`, {
        headers: { 'Authorization': 'Bearer invalid.token.signature' }
    });
    assert.strictEqual(invalidRes.status, 403);

    // Valid token
    const loginRes = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'password123' })
    });
    const loginData = await loginRes.json();

    const authRes = await fetch(`${baseUrl}/api/me`, {
        headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    assert.strictEqual(authRes.status, 200);
    const authData = await authRes.json();
    assert.strictEqual(authData.success, true);
    assert.strictEqual(authData.user.username, 'alice');
});

test('Integration: POST /api/profile/update enforces user authorization', async () => {
    // Register second user bob
    const bobRes = await fetch(`${baseUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'bob', password: 'password123' })
    });
    const bobData = await bobRes.json();

    // Alice login
    const aliceRes = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'password123' })
    });
    const aliceData = await aliceRes.json();

    // Alice updates own profile -> Allowed
    const updateSelfRes = await fetch(`${baseUrl}/api/profile/update`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aliceData.token}`
        },
        body: JSON.stringify({
            userId: aliceData.user.id,
            bio: 'Lead Engineer',
            status: 'Away',
            clubRoles: [{ team: 'Tech', post: 'Team Lead' }]
        })
    });
    assert.strictEqual(updateSelfRes.status, 200);

    // Alice tries to update Bob's profile -> Blocked with 403 Forbidden!
    const attackRes = await fetch(`${baseUrl}/api/profile/update`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aliceData.token}`
        },
        body: JSON.stringify({
            userId: bobData.user.id,
            bio: 'Hacked bio',
            status: 'Online',
            clubRoles: []
        })
    });
    assert.strictEqual(attackRes.status, 403, 'Unauthorized user should be blocked with 403');
});

test('Integration: POST /api/profile/password successfully updates password', async () => {
    const loginRes = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'password123' })
    });
    const loginData = await loginRes.json();

    // Wrong current password
    const failRes = await fetch(`${baseUrl}/api/profile/password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginData.token}`
        },
        body: JSON.stringify({
            userId: loginData.user.id,
            currentPassword: 'WrongPassword!',
            newPassword: 'BrandNewSecurePassword123!'
        })
    });
    assert.strictEqual(failRes.status, 400);

    // Correct current password
    const successRes = await fetch(`${baseUrl}/api/profile/password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginData.token}`
        },
        body: JSON.stringify({
            userId: loginData.user.id,
            currentPassword: 'password123',
            newPassword: 'BrandNewSecurePassword123!'
        })
    });
    assert.strictEqual(successRes.status, 200);

    // Login with new password
    const reLogin = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'BrandNewSecurePassword123!' })
    });
    assert.strictEqual(reLogin.status, 200);
});
