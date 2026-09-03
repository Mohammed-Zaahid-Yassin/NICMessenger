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

// Middleware
app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = 'nic-messenger-secret-key-2024';

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer Storage Configuration for Avatars
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'nic-messenger/avatars',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'face' }]
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});

const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

// ===== DATABASE SETUP =====
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
                    content TEXT NOT NULL,
                    timestamp DATETIME,
                    is_pinned BOOLEAN DEFAULT 0,
                    is_deleted BOOLEAN DEFAULT 0,
                    deleted_by TEXT DEFAULT NULL,
                    edited BOOLEAN DEFAULT 0,
                    reply_to INTEGER DEFAULT NULL,
                    reply_to_username TEXT DEFAULT NULL,
                    reply_to_content TEXT DEFAULT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `, (err) => {
                if (err) return reject(err);
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
                    console.log('✅ All Database tables ready');
                    resolve();
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
                db.run(
                    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                    ['admin', hashedPassword, 'admin'],
                    (err) => {
                        if (err) return reject(err);
                        console.log('✅ Admin account created successfully');
                        resolve();
                    }
                );
            } else {
                resolve();
            }
        });
    });
}

// ===== AUTH & PROFILE ROUTES =====
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    
    try {
        db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (user) return res.status(400).json({ error: 'Username already taken' });
            
            const hashedPassword = await bcrypt.hash(password, 10);
            db.run(
                'INSERT INTO users (username, password) VALUES (?, ?)',
                [username, hashedPassword],
                function(err) {
                    if (err) return res.status(500).json({ error: 'Error creating user' });
                    const token = jwt.sign({ id: this.lastID, username, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
                    res.json({
                        success: true,
                        token,
                        user: {
                            id: this.lastID,
                            username,
                            role: 'user',
                            avatar_url: null,
                            status: 'Online',
                            bio: 'Hey there! I am using NIC Messenger.'
                        }
                    });
                }
            );
        });
    } catch (error) { 
        res.status(500).json({ error: 'Server error' }); 
    }
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'User not found' });
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });
        
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                avatar_url: user.avatar_url,
                status: user.status,
                bio: user.bio
            }
        });
    });
});

app.post('/api/profile/update', (req, res) => {
    const { userId, bio, status } = req.body;
    
    db.run(
        'UPDATE users SET bio = ?, status = ? WHERE id = ?',
        [bio, status, userId],
        function(err) {
            if (err) {
                console.error('❌ DB Error updating profile:', err);
                return res.status(500).json({ error: 'Failed to update profile' });
            }
            res.json({ success: true, message: 'Profile updated successfully' });
            
            db.get('SELECT id, username, status, avatar_url, bio FROM users WHERE id = ?', [userId], (err, user) => {
                if (!err && user) {
                    io.emit('user profile updated', user);
                }
            });
        }
    );
});

// Avatar Image Upload Route
app.post('/api/profile/avatar', upload.single('avatar'), (req, res) => {
    if (!req.file || !req.file.path) {
        return res.status(400).json({ error: 'No image uploaded or invalid file format' });
    }

    const { userId } = req.body;
    const avatarUrl = req.file.path;

    db.run(
        'UPDATE users SET avatar_url = ? WHERE id = ?',
        [avatarUrl, userId],
        function(err) {
            if (err) {
                console.error('❌ Error saving avatar URL to DB:', err);
                return res.status(500).json({ error: 'Database update failed' });
            }

            res.json({ success: true, avatarUrl });

            db.get('SELECT id, username, status, avatar_url, bio FROM users WHERE id = ?', [userId], (err, user) => {
                if (!err && user) {
                    io.emit('user profile updated', user);
                }
            });
        }
    );
});

// ===== SOCKET SETUP =====
const connectedUsers = {};
const typingUsers = {};

async function startServer() {
    await initializeDatabase();
    await createAdminAccount();
    server.listen(4000, '0.0.0.0', () => {
        console.log(`🚀 NIC Messenger running securely on port 4000`);
    });
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
        } catch (error) { 
            next(new Error('Invalid token')); 
        }
    });

    io.on('connection', (socket) => {
        console.log(`🟢 User connected: ${socket.username}`);
        
        db.get('SELECT avatar_url, status, bio FROM users WHERE id = ?', [socket.userId], (err, userProfile) => {
            connectedUsers[socket.id] = {
                id: socket.userId,
                username: socket.username,
                role: socket.role,
                avatar_url: userProfile ? userProfile.avatar_url : null,
                status: userProfile ? userProfile.status : 'Online',
                bio: userProfile ? userProfile.bio : ''
            };
            io.emit('user list', Object.values(connectedUsers));
        });
        
        db.all(`
            SELECT m.*, 
                   GROUP_CONCAT(DISTINCT r.emoji) as reactions, 
                   GROUP_CONCAT(DISTINCT r.user_username) as reaction_users 
            FROM messages m 
            LEFT JOIN reactions r ON m.id = r.message_id 
            WHERE m.is_deleted = 0 
            GROUP BY m.id 
            ORDER BY m.timestamp ASC LIMIT 100
        `, (err, rows) => {
            if (err) {
                console.error('❌ Error fetching previous messages:', err);
                return;
            }
            const messages = rows.map(row => ({ 
                ...row, 
                reactions: row.reactions ? row.reactions.split(',') : [], 
                reaction_users: row.reaction_users ? row.reaction_users.split(',') : [] 
            }));
            socket.emit('previous messages', messages);
        });

        socket.on('typing start', () => { 
            typingUsers[socket.id] = socket.username; 
            socket.broadcast.emit('user typing', { username: socket.username, isTyping: true }); 
        });
        
        socket.on('typing stop', () => { 
            delete typingUsers[socket.id]; 
            socket.broadcast.emit('user typing', { username: socket.username, isTyping: false }); 
        });

        // 📝 STANDARD MESSAGE
        socket.on('chat message', (content) => {
            if (!content || !content.trim()) return;
            const timestamp = new Date().toISOString();
            
            db.run(
                'INSERT INTO messages (user_id, username, content, timestamp) VALUES (?, ?, ?, ?)', 
                [socket.userId, socket.username, content.trim(), timestamp], 
                function(err) {
                    if (err) {
                        console.error('❌ Error saving message:', err);
                        return;
                    }
                    db.get('SELECT * FROM messages WHERE id = ?', [this.lastID], (err, msg) => {
                        if (err || !msg) return;
                        io.emit('chat message', { ...msg, reactions: [], reaction_users: [], edited: false });
                    });
                }
            );
        });

        // ↩️ REPLY MESSAGE
        socket.on('reply to message', ({ messageId, content, replyToUsername, replyToContent }) => {
            if (!content || !content.trim()) return;
            const targetId = Number(messageId);
            const timestamp = new Date().toISOString();
            
            console.log(`💬 ${socket.username} is replying to message ID: ${targetId}`);
            
            db.run(
                'INSERT INTO messages (user_id, username, content, timestamp, reply_to, reply_to_username, reply_to_content) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [socket.userId, socket.username, content.trim(), timestamp, targetId, replyToUsername || '', replyToContent || ''],
                function(err) {
                    if (err) {
                        console.error('❌ DB Error inserting reply:', err);
                        return;
                    }
                    db.get('SELECT * FROM messages WHERE id = ?', [this.lastID], (err, msg) => {
                        if (err || !msg) {
                            console.error('❌ Error fetching inserted reply');
                            return;
                        }
                        io.emit('chat message', { ...msg, reactions: [], reaction_users: [], edited: false });
                    });
                }
            );
        });

        // ✏️ EDIT MESSAGE
        socket.on('edit message', ({ messageId, content }) => {
            const targetId = Number(messageId);
            console.log(`✏️ ${socket.username} attempting to edit message ID: ${targetId}`);
            
            db.get('SELECT * FROM messages WHERE id = ?', [targetId], (err, message) => {
                if (err) {
                    console.error('❌ Database error on edit lookup:', err);
                    return socket.emit('error', 'Database error');
                }
                if (!message) return socket.emit('error', 'Message not found');
                
                const isAdmin = socket.role === 'admin';
                const isOwner = Number(message.user_id) === Number(socket.userId);
                
                if (!isAdmin && !isOwner) {
                    return socket.emit('error', 'Permission denied: You can only edit your own messages.');
                }

                let diffMinutes = 0;
                if (message.timestamp) {
                    const safeTimestamp = String(message.timestamp).includes('Z') ? message.timestamp : message.timestamp.replace(' ', 'T') + 'Z';
                    diffMinutes = (Date.now() - new Date(safeTimestamp).getTime()) / (1000 * 60);
                }

                if (!isAdmin && diffMinutes > 15) {
                    return socket.emit('error', `Time limit exceeded (${diffMinutes.toFixed(1)} mins)`);
                }

                db.run('UPDATE messages SET content = ?, edited = 1 WHERE id = ?', [content.trim(), targetId], function(err) {
                    if (err) {
                        console.error('❌ Error updating message in DB:', err);
                        return;
                    }
                    if (this.changes > 0) {
                        console.log(`✅ Message ${targetId} edited successfully by ${socket.username}`);
                        io.emit('message edited', { messageId: targetId, content: content.trim(), username: socket.username });
                    }
                });
            });
        });

        // 🗑️ DELETE MESSAGE
        socket.on('delete message', (messageId) => {
            const targetId = Number(messageId);
            console.log(`🗑️ ${socket.username} attempting to delete message ID: ${targetId}`);
            
            db.get('SELECT * FROM messages WHERE id = ?', [targetId], (err, message) => {
                if (err) {
                    console.error('❌ Database error on delete lookup:', err);
                    return socket.emit('error', 'Database error');
                }
                if (!message) return socket.emit('error', 'Message not found');
                
                const isAdmin = socket.role === 'admin';
                const isOwner = Number(message.user_id) === Number(socket.userId);
                
                if (!isAdmin && !isOwner) {
                    return socket.emit('error', 'Permission denied: You can only delete your own messages.');
                }

                db.run('UPDATE messages SET content = ?, is_deleted = 1, deleted_by = ? WHERE id = ?', 
                    ['This message was deleted', socket.username, targetId], 
                    function(err) {
                        if (err) {
                            console.error('❌ Error marking message as deleted in DB:', err);
                            return;
                        }
                        
                        if (this.changes > 0) {
                            db.run('DELETE FROM reactions WHERE message_id = ?', [targetId]);
                            db.get('SELECT * FROM messages WHERE id = ?', [targetId], (err, row) => {
                                if (err || !row) return;
                                console.log(`✅ Message ${targetId} deleted successfully by ${socket.username}`);
                                io.emit('message deleted', { 
                                    messageId: targetId, 
                                    content: row.content, 
                                    deleted_by: row.deleted_by, 
                                    is_deleted: row.is_deleted 
                                });
                            });
                        }
                    }
                );
            });
        });

        // 👍 REACTIONS
        socket.on('add reaction', ({ messageId, emoji }) => {
            const targetId = Number(messageId);
            db.get('SELECT * FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?', [targetId, socket.userId, emoji], (err, row) => {
                if (row) {
                    db.run('DELETE FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?', [targetId, socket.userId, emoji], () => sendReactionUpdate(targetId));
                } else {
                    db.run('INSERT INTO reactions (message_id, user_id, user_username, emoji) VALUES (?, ?, ?, ?)', [targetId, socket.userId, socket.username, emoji], () => sendReactionUpdate(targetId));
                }
            });
        });

        function sendReactionUpdate(messageId) {
            db.all('SELECT emoji, user_username FROM reactions WHERE message_id = ?', [messageId], (err, rows) => {
                if (!err) {
                    io.emit('message reaction', { 
                        messageId: messageId, 
                        reactions: rows.map(r => r.emoji), 
                        reactionUsers: rows.map(r => r.user_username) 
                    });
                }
            });
        }

        // 👢 ADMIN KICK
        socket.on('kick user', (targetUsername) => {
            if (socket.role !== 'admin') return;
            const target = Object.entries(connectedUsers).find(([_, user]) => user.username === targetUsername);
            if (target) {
                const targetSocket = io.sockets.sockets.get(target[0]);
                if (targetSocket) { 
                    targetSocket.emit('kicked', 'You were removed by an admin.'); 
                    targetSocket.disconnect(true); 
                }
                delete connectedUsers[target[0]];
                io.emit('user list', Object.values(connectedUsers));
            }
        });

        socket.on('disconnect', () => {
            console.log(`🔴 User disconnected: ${socket.username}`);
            delete connectedUsers[socket.id];
            delete typingUsers[socket.id];
            io.emit('user list', Object.values(connectedUsers));
            io.emit('user typing', { username: socket.username, isTyping: false });
        });
    });
}

startServer();