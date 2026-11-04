import React, { useState } from 'react';

function Login({ onLogin, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 dark:from-slate-950 dark:to-slate-900 p-4 transition-colors">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md transform transition-all">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💬</div>
          <h1 className="text-3xl font-extrabold text-nic-blue dark:text-indigo-400">NIC Messenger</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            {isSignup ? 'Create your account to join the workspace' : 'Sign in to start collaborating'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">
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
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-nic-blue dark:focus:ring-indigo-500 focus:border-transparent transition"
              autoFocus
              disabled={loading}
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">
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
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-nic-blue dark:focus:ring-indigo-500 focus:border-transparent transition"
              disabled={loading}
              required
            />
          </div>
          
          {(localError || error) && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-sm">
              {localError || error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-nic-blue hover:bg-blue-600 text-white py-3 rounded-xl transition font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 cursor-pointer"
          >
            {loading ? 'Processing...' : (isSignup ? 'Create Account' : 'Sign In')}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setLocalError('');
            }}
            className="text-sm font-medium text-nic-blue dark:text-indigo-400 hover:underline cursor-pointer"
            disabled={loading}
          >
            {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
        
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            🔒 Real-Time • Secure Channels • Direct Messaging
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono">
            Default Admin: admin / admin123
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
