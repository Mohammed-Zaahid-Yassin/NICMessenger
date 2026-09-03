import React, { useState } from 'react';

function Login({ onLogin, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (username.trim().length < 2) {
      setLocalError('Username must be at least 2 characters');
      return;
    }
    if (password.length < 4) {
      setLocalError('Password must be at least 4 characters');
      return;
    }
    setLocalError('');
    setLoading(true);
    try {
      await onLogin(username.trim(), password, isSignup);
    } catch (err) {
      setLocalError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-96 transform transition-all">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💬</div>
          <h1 className="text-3xl font-bold text-nic-blue">NIC Messenger</h1>
          <p className="text-gray-500 mt-2">
            {isSignup ? 'Create your account' : 'Sign in to start chatting'}
          </p>
        </div>
        
        {/* We block the form from doing anything naturally */}
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-gray-700 text-sm font-medium mb-2">
              Username
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              type="text"
              placeholder="Enter your username..."
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setLocalError('');
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-nic-blue focus:border-transparent transition"
              autoFocus
              disabled={loading}
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-700 text-sm font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              type="password"
              placeholder="Enter your password..."
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setLocalError('');
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-nic-blue focus:border-transparent transition"
              disabled={loading}
            />
          </div>
          
          {(localError || error) && (
            <p className="text-red-500 text-sm mb-4">{localError || error}</p>
          )}
          
          {/* Button type changed to "button" and onClick added here */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-nic-blue text-white py-3 rounded-xl hover:bg-blue-600 transition font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : (isSignup ? 'Create Account' : 'Sign In')}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setLocalError('');
            }}
            className="text-sm text-nic-blue hover:underline"
            disabled={loading}
          >
            {isSignup ? 'Already have an account? Sign In' : 'New user? Create an account'}
          </button>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            🔒 Secure • Real-time • Free
          </p>
          <p className="text-xs text-gray-300 mt-1">
            Demo Admin: admin / admin123
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;