const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

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

// JWT Secret
const JWT_SECRET = 'nic-messenger-secret-key-2024';

// Set up Socket.IO
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['polling', 'websocket']
});

// Set up SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

// ===== DATABASE SETUP =====

// Function to initialize database
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        // Create users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Error creating users table:', err);
                reject(err);
                return;
            }
            console.log('✅ Users table ready');

            // Create messages table
            db.run(`
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    username TEXT NOT NULL,
                    content TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    is_pinned BOOLEAN DEFAULT 0,
                    is_deleted BOOLEAN DEFAULT 0,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating messages table:', err);
                    reject(err);
                    return;
                }
                console.log('✅ Messages table ready');
                resolve();
            });
        });
    });
}

// Function to create admin account
function createAdminAccount() {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
            if (err) {
                console.error('Error checking admin:', err);
                reject(err);
                return;
            }
            if (!row) {
                const hashedPassword = bcrypt.hashSync('admin123', 10);
                db.run(
                    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                    ['admin', hashedPassword, 'admin'],
                    (err) => {
                        if (err) {
                            console.error('Error creating admin:', err);
                            reject(err);
                        } else {
                            console.log('✅ Admin account created!');
                            console.log('📝 Username: admin');
                            console.log('🔑 Password: admin123');
                            resolve();
                        }
                    }
                );
            } else {
                console.log('✅ Admin account already exists');
                resolve();
            }
        });
    });
}

// ===== AUTHENTICATION ROUTES =====

// Register new user
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    if (username.length < 2) {
        return res.status(400).json({ error: 'Username must be at least 2 characters' });
    }
    if (password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    try {
        db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (user) {
                return res.status(400).json({ error: 'Username already taken' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            db.run(
                'INSERT INTO users (username, password) VALUES (?, ?)',
                [username, hashedPassword],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Error creating user' });
                    }
                    
                    const token = jwt.sign(
                        { id: this.lastID, username, role: 'user' },
                        JWT_SECRET,
                        { expiresIn: '7d' }
                    );
                    
                    res.json({
                        success: true,
                        token,
                        user: { id: this.lastID, username, role: 'user' }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login user
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid password' });
        }

        if (!user.is_active) {
            return res.status(400).json({ error: 'Account has been deactivated' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    });
});

// ===== START SERVER =====

async function startServer() {
    try {
        console.log('📦 Initializing database...');
        await initializeDatabase();
        
        console.log('👑 Setting up admin account...');
        await createAdminAccount();
        
        const PORT = 4000;
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 NIC Messenger server running on http://localhost:${PORT}`);
            console.log(`📡 WebSocket server ready`);
            console.log(`👑 Admin credentials: admin / admin123`);
        });

        setupSocketIO();
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// ===== SOCKET.IO SETUP =====

// Store connected users
const connectedUsers = {};

function setupSocketIO() {
    // Socket authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            console.log('No token provided, rejecting connection');
            return next(new Error('Authentication required'));
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.userId = decoded.id;
            socket.username = decoded.username;
            socket.role = decoded.role;
            console.log(`✅ Auth successful: ${socket.username} (${socket.role})`);
            next();
        } catch (error) {
            console.log('Invalid token, rejecting connection');
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`✅ User connected: ${socket.username} (${socket.role})`);

        // Store user connection
        connectedUsers[socket.id] = {
            id: socket.userId,
            username: socket.username,
            role: socket.role
        };
        
        // Send previous messages
        db.all('SELECT id, username, content, timestamp FROM messages WHERE is_deleted = 0 ORDER BY timestamp ASC LIMIT 50', (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return;
            }
            socket.emit('previous messages', rows);
        });

        // Broadcast updated user list (this updates the green dots)
        broadcastUserList();

        // ===== MESSAGE HANDLING =====

        socket.on('chat message', (content) => {
            if (!content || content.trim() === '') return;
            
            console.log(`📩 Message from ${socket.username}: ${content}`);
            
            db.run(
                'INSERT INTO messages (user_id, username, content) VALUES (?, ?, ?)',
                [socket.userId, socket.username, content.trim()],
                function(err) {
                    if (err) {
                        console.error('Error saving message:', err);
                        return;
                    }
                    const messageData = {
                        id: this.lastID,
                        username: socket.username,
                        content: content.trim(),
                        timestamp: new Date().toISOString()
                    };
                    console.log(`📤 Broadcasting message from ${socket.username}`);
                    io.emit('chat message', messageData);
                }
            );
        });

        // ===== ADMIN ACTIONS =====

        socket.on('kick user', (targetUsername) => {
            if (socket.role !== 'admin') {
                socket.emit('error', '❌ Only admins can kick users');
                return;
            }
            if (targetUsername === socket.username) {
                socket.emit('error', '❌ You cannot kick yourself');
                return;
            }
            if (targetUsername === 'admin') {
                socket.emit('error', '❌ Cannot kick admin');
                return;
            }

            let found = false;
            for (const [id, user] of Object.entries(connectedUsers)) {
                if (user.username === targetUsername) {
                    const targetSocket = io.sockets.sockets.get(id);
                    if (targetSocket) {
                        targetSocket.emit('kicked', `You were kicked by ${socket.username}`);
                        targetSocket.disconnect(true);
                    }
                    delete connectedUsers[id];
                    found = true;
                    break;
                }
            }

            if (found) {
                broadcastUserList();
                io.emit('system message', `🚫 ${targetUsername} was kicked by ${socket.username}`);
            } else {
                socket.emit('error', `User ${targetUsername} not found or already offline`);
            }
        });

        socket.on('delete message', (messageId) => {
            if (socket.role !== 'admin') {
                socket.emit('error', '❌ Only admins can delete messages');
                return;
            }

            db.run(
                'UPDATE messages SET is_deleted = 1 WHERE id = ?',
                [messageId],
                function(err) {
                    if (err) {
                        console.error('Error deleting message:', err);
                        return;
                    }
                    if (this.changes > 0) {
                        io.emit('system message', `🗑️ A message was deleted by ${socket.username}`);
                        io.emit('message deleted', { messageId });
                        console.log(`🗑️ Message ${messageId} deleted by ${socket.username}`);
                    }
                }
            );
        });

        // ===== DISCONNECTION =====

        socket.on('disconnect', () => {
            if (socket.username) {
                console.log(`❌ User disconnected: ${socket.username}`);
                delete connectedUsers[socket.id];
                broadcastUserList();
                // NO "left the chat" message
            }
        });
    });
}

function broadcastUserList() {
    const userList = Object.values(connectedUsers);
    console.log(`📊 Broadcasting user list: ${userList.map(u => u.username).join(', ')}`);
    io.emit('user list', userList);
}

// ===== START THE SERVER =====

startServer();