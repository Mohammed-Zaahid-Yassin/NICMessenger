# Environment Variables Reference: NIC Messenger

This document details all configuration options for both local development and production environments.

---

## 1. Backend Environment Variables (`backend/.env`)

| Variable | Required | Default | Description | Example |
|---|---|---|---|---|
| `PORT` | Optional | `4000` | The TCP port the Express server binds to. | `4000` or `10000` |
| `NODE_ENV` | Optional | `development` | Environment mode (`development` or `production`). | `production` |
| `JWT_SECRET` | **Required in Prod** | Dev fallback | Cryptographic secret key used to sign and verify JSON Web Tokens. | `e4b3c9f8a1...` |
| `CLIENT_URL` | **Required in Prod** | `http://localhost:5173` | Allowed CORS origin for frontend requests. | `https://your-app.vercel.app` |
| `DATABASE_PATH` | Optional | `./database.sqlite` | Path to the SQLite database file or `:memory:` for testing. | `/data/database.sqlite` |
| `CLOUDINARY_CLOUD_NAME` | **Required** | None | Cloudinary cloud account name for image uploads. | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | **Required** | None | Cloudinary API Key. | `123456789012345` |
| `CLOUDINARY_API_SECRET` | **Required** | None | Cloudinary API Secret. | `abcdefghijklmnopqrstuv` |

### Example `backend/.env.example`
```env
PORT=4000
NODE_ENV=development
JWT_SECRET=your-secure-random-jwt-secret-string-here
CLIENT_URL=http://localhost:5173
DATABASE_PATH=database.sqlite

# Cloudinary Credentials (Free Tier)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 2. Frontend Environment Variables (`frontend/.env`)

| Variable | Required | Default | Description | Example |
|---|---|---|---|---|
| `VITE_API_URL` | **Required in Prod** | `http://localhost:4000` | Full URL of the deployed backend server (HTTP & WebSocket). | `https://nic-messenger-backend.onrender.com` |

### Example `frontend/.env.example`
```env
VITE_API_URL=http://localhost:4000
```
