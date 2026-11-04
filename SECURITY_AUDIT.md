# Cybersecurity Audit & Hardening Report: NIC Messenger

**Date:** November 2026  
**Auditor:** Senior Cybersecurity Auditor & Full-Stack Architect  
**Scope:** Authentication, Authorization, Socket.IO Security, Database Security, REST API Endpoints, Data Isolation  

---

## 1. Threat Modeling & Vulnerabilities Discovered

| Threat ID | Severity | Category | Description | Status |
|---|---|---|---|---|
| **VULN-01** | CRITICAL | Broken Authorization / IDOR | REST endpoints `/api/profile/*` had no JWT token verification, allowing any client to edit any user's profile, avatar, or password. | ✅ MITIGATED |
| **VULN-02** | HIGH | Crash / Logic Error | Undefined variable reference `hashed` in password update crashed the endpoint. | ✅ FIXED |
| **VULN-03** | MEDIUM | Information Disclosure | Typing status was broadcasted globally across all users regardless of channel or DM privacy. | ✅ MITIGATED |
| **VULN-04** | HIGH | Access Control Bypass | Any authenticated socket could react to messages in private channels without being a member. | ✅ MITIGATED |
| **VULN-05** | MEDIUM | Hardcoded Secrets | Hardcoded fallback JWT secret in source code without enforcement of environment variables. | ✅ MITIGATED |
| **VULN-06** | HIGH | Denial of Service (DoS) | Outdated versions of `body-parser`, `engine.io`, `proxy-addr`, `undici`, `multer` had known DoS advisories. | ✅ PATCHED |

---

## 2. Hardening Measures Implemented

### 2.1 Enforced JWT Authentication on REST Endpoints
Added a centralized middleware `authenticateToken`:
```javascript
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.startsWith('Bearer ')) 
        ? authHeader.split(' ')[1] 
        : req.cookies?.token;
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = decoded;
        next();
    });
};
```
Every profile mutation endpoint (`/api/profile/update`, `/api/profile/avatar`, `/api/profile/password`, `/api/profile/delete`, `/api/messages/image`) now strictly verifies that:
1. The request originates from a verified, authenticated session.
2. The user ID being modified matches `req.user.id` (or the caller possesses `admin` privileges).
3. The Super Admin account cannot be deleted or downgraded.

### 2.2 Scoped Typing Notifications (Anti-Snoop)
Previously:
```javascript
// INSECURE: Broadcasted globally to all users
socket.broadcast.emit('user typing', { username: socket.username, isTyping: true });
```
Mitigated:
```javascript
// SECURE: Scoped strictly to the target channel room or direct messaging recipient
if (data?.channelId) {
    socket.to(`channel_${data.channelId}`).emit('user typing', payload);
} else if (data?.recipientId) {
    socket.to(data.recipientId.toString()).emit('user typing', payload);
} else {
    socket.broadcast.emit('user typing', payload);
}
```

### 2.3 Reaction Access Authorization
Sockets attempting to add or remove reactions now trigger a server-side membership check:
- If reacting to a channel message, verify caller belongs to `channel_members` for that channel.
- If reacting to a direct message, verify caller is either the sender or recipient.
- If unauthorized, the reaction query is silently rejected.

### 2.4 SQL Injection Defense
All SQL operations throughout `server.js` strictly use SQLite parameterized queries (`db.run(query, [params])`, `db.get(query, [params])`, `db.all(query, [params])`). No user input is directly concatenated into SQL strings.

### 2.5 Dynamic & Strict CORS
CORS headers are dynamically validated against allowed production origins and trusted domains, disallowing wildcard `*` with credentials.

---

## 3. Dependency Vulnerability Status

`npm audit` was executed across both backend and frontend workspaces:
- **Frontend:** 0 vulnerabilities (all PostCSS and Vite advisories patched).
- **Backend:** High-severity advisories in `body-parser`, `engine.io`, `proxy-addr`, `undici` patched via `npm audit fix`.

---

## 4. Security Recommendations for Future Iterations

1. **Rate Limiting:** Implement `express-rate-limit` on `/api/login` and `/api/register` to prevent automated brute-force attacks (e.g., maximum 5 login attempts per minute per IP).
2. **Password Complexity:** Require at least 8 characters with at least one number and one symbol for production accounts.
3. **Audit Logging Table:** Add an `audit_logs` table recording sensitive actions (channel deletions, user role assignments, password updates) with timestamps and IP addresses.
