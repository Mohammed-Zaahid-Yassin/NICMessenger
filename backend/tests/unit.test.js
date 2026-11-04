const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const TEST_SECRET = 'test-secret-key-nic-2024';

test('Unit: Password hashing and verification with bcrypt', async () => {
    const rawPassword = 'SuperSecretPassword123!';
    const hash = await bcrypt.hash(rawPassword, 10);
    assert.notStrictEqual(hash, rawPassword);
    
    const isValid = await bcrypt.compare(rawPassword, hash);
    assert.strictEqual(isValid, true, 'bcrypt.compare should return true for valid password');

    const isInvalid = await bcrypt.compare('WrongPassword456!', hash);
    assert.strictEqual(isInvalid, false, 'bcrypt.compare should return false for invalid password');
});

test('Unit: JWT token generation and claims verification', () => {
    const payload = { id: 42, username: 'tester', role: 'admin' };
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });
    assert.ok(typeof token === 'string' && token.length > 20);

    const decoded = jwt.verify(token, TEST_SECRET);
    assert.strictEqual(decoded.id, 42);
    assert.strictEqual(decoded.username, 'tester');
    assert.strictEqual(decoded.role, 'admin');

    assert.throws(() => {
        jwt.verify(token, 'wrong-secret-key');
    }, /invalid signature/);
});

test('Unit: Task target tags matching logic', () => {
    // Evaluates how target tags match against user club roles
    const matchUserWithTags = (userClubRoles, targetTags) => {
        let matches = false;
        targetTags.forEach(tag => {
            if (tag.team === 'All Teams' || tag.team === 'Everyone') {
                matches = true;
            } else {
                userClubRoles.forEach(ur => {
                    if (ur.team === tag.team && (tag.post === 'Entire Team' || ur.post === tag.post)) {
                        matches = true;
                    }
                });
            }
        });
        return matches;
    };

    const techLeadUserRoles = [{ team: 'Tech', post: 'Team Lead' }];
    const designMemberRoles = [{ team: 'Design', post: 'Member' }];

    assert.strictEqual(matchUserWithTags(techLeadUserRoles, [{ team: 'Tech', post: 'Entire Team' }]), true);
    assert.strictEqual(matchUserWithTags(techLeadUserRoles, [{ team: 'Tech', post: 'Team Lead' }]), true);
    assert.strictEqual(matchUserWithTags(techLeadUserRoles, [{ team: 'Tech', post: 'Sub-Lead' }]), false);
    assert.strictEqual(matchUserWithTags(designMemberRoles, [{ team: 'Tech', post: 'Entire Team' }]), false);
    assert.strictEqual(matchUserWithTags(designMemberRoles, [{ team: 'All Teams', post: 'Everyone' }]), true);
});

test('Unit: Username and Password Validation Rules', () => {
    const validateCredentials = (username, password) => {
        if (!username || typeof username !== 'string' || username.trim().length < 2) {
            return { valid: false, error: 'Username must be at least 2 characters' };
        }
        if (!password || typeof password !== 'string' || password.length < 4) {
            return { valid: false, error: 'Password must be at least 4 characters' };
        }
        return { valid: true };
    };

    assert.strictEqual(validateCredentials('a', 'password123').valid, false);
    assert.strictEqual(validateCredentials('  ', 'password123').valid, false);
    assert.strictEqual(validateCredentials('user1', '123').valid, false);
    assert.strictEqual(validateCredentials('validUser', 'pass123').valid, true);
});
