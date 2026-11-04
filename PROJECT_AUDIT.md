# Project Audit Report: NIC Messenger (Club Chat)
**Date:** November 2026  
**Auditor:** Senior Full-Stack Software Engineer & Cybersecurity Auditor  
**Application Type:** Real-Time Team Collaboration / Slack-like Platform  

---

## 1. Executive Summary

A comprehensive architectural, functional, security, performance, and UI/UX audit was conducted on the existing NIC Messenger application. The platform provides real-time messaging, channels, direct messaging, workflow/task dispatching with role-based mission tracking, reactions, message editing/deletion, image attachments via Cloudinary, and customizable themes.

While the core functionality and foundational architecture are solid, several critical bugs, severe security loopholes (including unauthenticated profile/password modifications), complete breakage of Direct Message visibility due to property name mismatches, lack of mobile responsiveness, and hardcoded localhost URLs were uncovered.

---

## 2. Architecture Review

### 2.1 Frontend
- **Framework & Tooling:** React 19, Vite 8, Tailwind CSS v3, React Router DOM v7.
- **Real-time Client:** `socket.io-client` (v4.8.3) with both WebSocket and polling fallback transports.
- **State Management:** Local React state (`useState`, `useRef`, `useEffect`) managed across `App.jsx`, `Chat.jsx`, `MessageList.jsx`, `SettingsModal.jsx`, `TaskModal.jsx`, and `AnalyticsModal.jsx`.
- **Assets & Styling:** Tailwind CSS utility classes, custom scrollbars, dark/black/light theme modes stored in `localStorage`.

### 2.2 Backend
- **Framework:** Node.js with Express 5 (`express@5.2.1`), HTTP server, Socket.IO (`socket.io@4.8.3`).
- **Database Engine:** SQLite3 (`sqlite3@6.0.1`) with file-backed storage (`database.sqlite`).
- **Authentication:** `bcrypt` for password hashing, `jsonwebtoken` for stateless token verification, `cookie-parser`.
- **Media Storage:** Cloudinary (`cloudinary@1.41.3`, `multer-storage-cloudinary@4.0.0`, `multer@2.3.0`).

---

## 3. Critical Defects & Functional Inconsistencies

### 3.1 [CRITICAL] Password Update Crash (`ReferenceError: hashed is not defined`)
- **Location:** `backend/server.js:206`
- **Issue:** Inside `app.post('/api/profile/password')`, the code hashes the new password with:
  ```js
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, userId], ...);
  ```
  `hashed` is an undeclared variable (ReferenceError). This immediately crashes or aborts the password update process.
- **Fix:** Update `[hashed, userId]` to `[hashedPassword, userId]`.

### 3.2 [CRITICAL] Direct Messages Hidden from View (`Chat.jsx`)
- **Location:** `frontend/src/components/Chat.jsx:125`
- **Issue:** The message quarantine filter checks:
  ```js
  const sId = msg.sender_id || msg.senderId;
  ...
  else if (rId && sId) {
      const isMyDM = (sId === userId && rId === activeChat.id) || (sId === activeChat.id && rId === userId);
      if (!isMyDM) belongsToView = false;
  } else {
      belongsToView = false;
  }
  ```
  In the SQLite database and backend payloads, the user ID column is named `user_id`. `sender_id` is undefined. Consequently, `rId && sId` always evaluates to `undefined`, dropping into `belongsToView = false`. Direct Messages are never rendered to the user.
- **Fix:** Define `const sId = msg.user_id || msg.sender_id || msg.senderId;`.

### 3.3 [CRITICAL] Hardcoded Localhost URLs
- **Locations:**
  - `frontend/src/App.jsx:98` (`http://localhost:4000`)
  - `frontend/src/App.jsx:258` (`http://localhost:4000`)
  - `frontend/src/components/Chat.jsx:75` (`http://localhost:4000`)
  - `frontend/src/components/SettingsModal.jsx:75, 77, 90, 105, 121` (`http://localhost:4000`)
  - `backend/server.js:18, 42` (`http://localhost:5173`)
- **Issue:** Production deployments to Vercel and remote hosts fail completely due to CORS rejections and attempting to connect to client-side localhost.
- **Fix:** Centralize API base URL via `import.meta.env.VITE_API_URL` with dynamic fallbacks; configure dynamic CORS on the backend based on `process.env.CLIENT_URL` and production domains.

### 3.4 [HIGH] Unhandled `delete task` Socket Event
- **Location:** `frontend/src/App.jsx:377`
- **Issue:** The frontend calls `socketRef.current.emit('delete task', data)`, but no corresponding `socket.on('delete task')` handler exists in `backend/server.js`.
- **Fix:** Implement the task deletion and channel dissociation handler on the backend with admin/creator validation.

### 3.5 [MEDIUM] Login Form Enter Key Submission Broken
- **Location:** `frontend/src/components/Login.jsx:43`
- **Issue:** The `<form>` tag has `onSubmit={(e) => e.preventDefault()}` and the button is `type="button"`. Pressing Enter on desktop or mobile keyboards does not trigger sign-in or registration.
- **Fix:** Bind `onSubmit={handleSubmit}` and set button `type="submit"`.

---

## 4. Security Audit Findings

### 4.1 Insecure Direct Object References (IDOR) & Unauthenticated Endpoints
- **Endpoints:**
  - `/api/profile/update`
  - `/api/profile/avatar`
  - `/api/profile/password`
  - `/api/profile/delete`
  - `/api/messages/image`
- **Vulnerability:** None of the above REST endpoints enforce JWT authentication middleware. Any arbitrary client can send a POST request with any `userId` to alter another user's bio, club roles, status, or avatar.
- **Remediation:** Introduce a verified `authMiddleware` extracting and validating the Bearer token or cookie; verify that `req.user.id === targetUserId` or `req.user.role === 'admin'`.

### 4.2 Hardcoded Fallback JWT Secret
- **Location:** `backend/server.js:22`
- **Vulnerability:** Hardcoded `nic-messenger-secret-key-2024`.
- **Remediation:** Enforce `process.env.JWT_SECRET` with cryptographic randomness in production.

### 4.3 Global Privacy Leakage via Typing Indicators
- **Location:** `backend/server.js:599-600`
- **Vulnerability:** `socket.broadcast.emit('user typing', { username: socket.username, isTyping: true })` broadcasts typing notifications to every connected client across all private channels and direct conversations.
- **Remediation:** Scope typing events to specific channel rooms (`channel_${channelId}`) or direct recipient IDs.

### 4.4 Reaction Authorization Bypass
- **Location:** `backend/server.js:683-691`
- **Vulnerability:** Any authenticated socket can toggle reactions on any message ID without verifying whether the user is a member of the channel or a participant in the direct conversation.
- **Remediation:** Validate channel membership or recipient identity before inserting or removing reactions.

### 4.5 Dependency Vulnerabilities
- `npm audit` flagged high-severity advisories:
  - Backend: `body-parser` (DoS), `engine.io` (DoS), `proxy-addr` (IP spoofing), `multer` (DoS on aborted uploads), `undici` (WebSocket decompression DoS).
  - Frontend: `postcss`, `source-map-js`, `vite`.
- **Remediation:** Execute targeted dependency updates and audit fixes without introducing breaking API changes.

---

## 5. Performance and Database Scalability

### 5.1 Missing Database Indexes
- The current schema in `database.sqlite` has zero explicit indexes beyond automatic primary key and unique constraints.
- High-frequency queries:
  - `SELECT * FROM messages WHERE channel_id = ? ORDER BY timestamp DESC LIMIT 50`
  - `SELECT * FROM messages WHERE recipient_id = ? ... ORDER BY timestamp DESC`
  - `SELECT channel_id FROM channel_members WHERE user_id = ?`
  These execute full table scans.
- **Remediation:** Add composite indexes:
  - `idx_messages_channel_timestamp (channel_id, timestamp DESC)`
  - `idx_messages_dm (recipient_id, user_id, timestamp DESC)`
  - `idx_channel_members_user (user_id, channel_id)`
  - `idx_reactions_message (message_id)`
  - `idx_tasks_auto_channel (auto_channel_id)`

### 5.2 N+1 Query Inefficiencies
- Socket connection triggers sequential queries for user channels, recent messages, and member lists. Batching and indexing will significantly reduce SQLite lock contention.

---

## 6. UI/UX and Responsiveness Audit

### 6.1 Mobile Viewport Issues
- The sidebar is fixed at `w-64` (256px). On mobile screens (320px–480px width), the sidebar obscures or completely crowds out the message conversation area.
- No hamburger menu or mobile drawer toggle exists.
- Modals (`SettingsModal`, `TaskModal`, `AnalyticsModal`) have fixed widths (`w-[750px]`, `w-[600px]`, `w-[500px]`) that overflow on mobile screens.

### 6.2 Slack-Like Features Missing or Partial
1. Collapsible mobile sidebar with touch-friendly navigation.
2. Channel search and direct message user filtering.
3. Empty states for channels without messages.
4. Visual feedback for image uploads (progress/spinners).
5. Clean, accessible modal dialogs on all viewports.

---

## 7. Zero-Cost Production Hosting Strategy (Phase 9 Pre-Check)

1. **Frontend:** Vercel (Free tier, zero credit card requirement, unlimited deployments for hobby projects, global edge CDN).
2. **Backend:** Render / Railway / Koyeb / Fly free tiers or Node service with zero credit card activation. Alternatively, Vercel Serverless Functions + WebSockets via Supabase/Pusher/Pusher-free or Render free web service for persistent Socket.IO connections.
3. **Database:** PostgreSQL on Neon (Free tier, 0.5 GB storage, serverless autoscaling, no credit card required) or persistent hosted SQLite.
4. **Media Storage:** Cloudinary free tier (already configured, 25 GB monthly bandwidth/credits, completely free).

---

## 8. Prioritized Remediation Roadmap

1. **Step 1:** Establish safe git baseline & `.gitignore` hygiene.
2. **Step 2:** Fix critical bugs (Password reference error, DM message visibility filter, login submit).
3. **Step 3:** Implement REST authentication middleware & secure API endpoints.
4. **Step 4:** Scope typing events and enforce reaction authorization.
5. **Step 5:** Add missing database indexes and transaction safety.
6. **Step 6:** Implement responsive mobile navigation and optimize modal layouts.
7. **Step 7:** Centralize environment configuration (`VITE_API_URL`, `CLIENT_URL`, `JWT_SECRET`).
8. **Step 8:** Add comprehensive automated unit, integration, and E2E tests.
9. **Step 9:** Execute zero-credit-card deployment and verification.
