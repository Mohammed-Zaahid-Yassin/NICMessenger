// Centralized API and Socket configuration for NIC Messenger

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  if (import.meta.env.PROD) {
    return 'https://nic-club-chat-backend.onrender.com';
  }
  // Default to localhost:4000 in local development
  return 'http://localhost:4000';
};

export const API_URL = getApiUrl();
