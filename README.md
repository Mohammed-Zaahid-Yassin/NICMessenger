# NIC Messenger 💬

A modern, high-performance, real-time collaboration and messaging platform designed for student clubs, tech teams, and organizations.

Built with **React 19**, **Vite**, **Tailwind CSS**, **Node.js**, **Express 5**, **Socket.IO**, **SQLite3**, and **Cloudinary**.

---

## 🚀 Key Features

- **⚡ Real-Time Messaging:** Instant bi-directional messaging powered by Socket.IO with WebSocket and polling fallback.
- **🔒 Public & Private Channels:** Create project rooms, invite team members, edit settings, and enforce private isolation.
- **✉️ Direct Messaging (DMs):** Private 1-to-1 conversations with read receipts and active status indicators.
- **🛡️ Mission Control Workflows:** Role-based task dispatching targeting specific club teams (Executive Board, Tech, Design, Media, Content, Operations) or individual users with deadlines and completion tracking.
- **🧵 Threaded Replies & Reactions:** Emoji reactions with aggregate counters and context-preserving message replies.
- **📎 Media Sharing:** Profile avatar uploads and image attachments optimized and hosted securely via Cloudinary CDN.
- **🎨 Multi-Theme Engine:** Seamlessly toggle between Light, Dark, and high-contrast OLED Black modes.
- **📱 Responsive Mobile Experience:** Fully responsive layout with collapsible drawer navigation for mobile and tablet screens.
- **🔍 Message Search:** Instant client-side message search with highlighted query matches.
- **🔐 Enterprise Security:** Hardened JWT authentication, scoped typing indicators, sanitized SQL queries, and IDOR protection.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite 8, Tailwind CSS v3, React Router DOM v7, Socket.io-client.
- **Backend:** Node.js, Express 5, Socket.IO 4, SQLite3, Multer, Cloudinary, Bcrypt, JsonWebToken.
- **Hosting Strategy:** 100% Free Tier (Vercel Frontend + Render/Koyeb Backend + Cloudinary Storage) with **ZERO credit card requirements**.

---

## 📁 Repository Structure

```
club-chat/
├── backend/
│   ├── tests/
│   │   ├── unit.test.js              # Unit tests (bcrypt, JWT, validation, tags)
│   │   ├── api_integration.test.js   # REST API integration tests
│   │   └── realtime_socket.test.js   # Socket.IO multi-client real-time tests
│   ├── Dockerfile                    # Containerization config for cloud deployments
│   ├── server.js                     # Main Express & Socket.IO server
│   ├── package.json                  # Backend dependencies and scripts
│   └── .env.example                  # Backend environment variable template
├── frontend/
│   ├── public/                       # Static icons and assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnalyticsModal.jsx    # Task progress analytics
│   │   │   ├── Chat.jsx              # Workspace interface & navigation
│   │   │   ├── Login.jsx             # Auth screen (Sign in / Sign up)
│   │   │   ├── MessageList.jsx       # Virtualized chat stream & reactions
│   │   │   ├── SettingsModal.jsx     # Profile, team roles, & theme settings
│   │   │   └── TaskModal.jsx         # Workflow dispatch modal
│   │   ├── App.jsx                   # Application state, routes & sockets
│   │   ├── config.js                 # Centralized API configuration
│   │   └── main.jsx                  # Application entry point
│   ├── vercel.json                   # Single-page application routing rewrites
│   ├── package.json                  # Frontend dependencies and scripts
│   └── .env.example                  # Frontend environment variable template
├── render.yaml                       # Render blueprint for zero-credit-card backend deploy
├── PROJECT_AUDIT.md                  # Comprehensive initial audit report
├── SECURITY_AUDIT.md                 # Cybersecurity findings and mitigations
├── TEST_REPORT.md                    # Automated test execution report
├── DEPLOYMENT_GUIDE.md               # Step-by-step production deployment instructions
├── ARCHITECTURE.md                   # System architecture and specifications
└── ENVIRONMENT_VARIABLES.md          # Environment variable documentation
```

---

## 🏃 Quick Start (Local Development)

### Prerequisites
- Node.js v18 or higher (v20+ recommended)
- npm v9 or higher

### 1. Clone & Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Cloudinary credentials if media uploads are needed
npm start
```
The backend server will run on `http://localhost:4000`.

### 2. Setup Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
The frontend application will run on `http://localhost:5173`.

### Default Demo Credentials
- **Username:** `admin`
- **Password:** `admin123`

---

## 🧪 Running Automated Tests

Run the full automated test suite (Unit, REST API Integration, and Multi-Client Real-Time tests):
```bash
cd backend
npm test
```

To run individual test suites:
```bash
node --test tests/unit.test.js
node --test tests/api_integration.test.js
node --test tests/realtime_socket.test.js
```

---

## 🌐 Production Deployment

Refer to [DEPLOYMENT_GUIDE.md](file:///d:/Projects/club-chat/club-chat/DEPLOYMENT_GUIDE.md) for full zero-cost deployment instructions to Vercel and Render/Koyeb without requiring credit cards.

---

## 📄 License

This project is licensed under the ISC License.
