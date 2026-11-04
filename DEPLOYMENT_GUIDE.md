# Zero-Cost Production Deployment Guide: NIC Messenger

This guide provides instructions to deploy NIC Messenger to production using **100% Free Tier infrastructure with ZERO credit card requirements**.

---

## 1. Hosting Architecture & Free-Tier Verification

| Component | Recommended Free Provider | Free Tier Specifications | Credit Card Required? |
|---|---|---|---|
| **Frontend** | **Vercel** | Unlimited deployments, 100 GB bandwidth/mo, Edge CDN | **NO** (Sign in with GitHub) |
| **Backend & Socket.IO** | **Render** or **Koyeb** | 512 MB RAM, persistent WebSockets, auto-deploy from Git | **NO** (Sign in with GitHub) |
| **Database** | **SQLite (Self-contained)** or **Neon PostgreSQL** | SQLite (0 cost, embedded) / Neon (0.5 GB free serverless PG) | **NO** |
| **Media & File Storage** | **Cloudinary** | 25 GB monthly storage & bandwidth, 25 monthly credits | **NO** |

---

## 2. Step 1: Deploy Backend to Render (Zero Credit Card)

1. Go to [https://render.com](https://render.com) and click **Sign Up** using your **GitHub account** (no credit card asked).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository: `club-chat` (or `NICMessenger`).
4. Configure the Web Service:
   - **Name:** `nic-messenger-backend`
   - **Region:** Any (e.g., Oregon or Frankfurt)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install --omit=dev`
   - **Start Command:** `node server.js`
   - **Instance Type:** `Free`
5. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `JWT_SECRET`: A secure random string (e.g. `c7489a29d84f...`)
   - `CLIENT_URL`: `https://your-app-name.vercel.app` (your Vercel frontend URL)
   - `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name
   - `CLOUDINARY_API_KEY`: Your Cloudinary API key
   - `CLOUDINARY_API_SECRET`: Your Cloudinary API secret
6. Click **Create Web Service**.
7. Once deployed, note down your Render service URL (e.g., `https://nic-messenger-backend.onrender.com`).
8. Verify it by visiting `https://nic-messenger-backend.onrender.com/health` in your browser. You should receive:
   ```json
   {"status":"ok","service":"NIC Messenger API",...}
   ```

*(Alternative: You can use the included `render.yaml` blueprint to auto-configure this service).*

---

## 3. Step 2: Deploy Frontend to Vercel (Zero Credit Card)

1. Go to [https://vercel.com](https://vercel.com) and click **Sign Up** using your **GitHub account** (no credit card required).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository: `club-chat`.
4. Configure the Project:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click Edit and select `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Expand **Environment Variables** and add:
   - `VITE_API_URL`: Your backend URL from Step 1 (e.g., `https://nic-messenger-backend.onrender.com`)
6. Click **Deploy**.
7. Vercel will build the project and output your live production URL (e.g., `https://nic-messenger.vercel.app`).
8. Return to Render and update `CLIENT_URL` to match this production Vercel URL.

---

## 4. Production Verification Checklist

After deployment, perform these tests on the live Vercel URL:

- [ ] **Health Check:** Open `https://<backend-url>/health` in browser.
- [ ] **Registration:** Register a new user on the production Vercel app.
- [ ] **Login:** Log in with the registered user and ensure session persists on page refresh.
- [ ] **Direct Routes:** Refresh on `/chat` or `/login` to verify Vercel single-page rewrites work without 404s.
- [ ] **Real-Time Messaging:** Open two separate browser windows (one regular, one incognito) with two accounts and verify instant message delivery.
- [ ] **Channel Isolation:** Create a private channel and verify uninvited users cannot see or receive messages.
- [ ] **Media Upload:** Upload an avatar and a chat image attachment, verifying Cloudinary storage.
- [ ] **Mobile Responsiveness:** Open on a mobile device and test the collapsible sidebar drawer and modal dialogs.
- [ ] **Security:** Verify that unauthorized API requests are blocked with 401 or 403.
