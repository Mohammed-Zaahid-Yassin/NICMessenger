import React, { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';

function Chat({ 
  messages, 
  users, 
  sendMessage, 
  username, 
  userRole, 
  isConnected, 
  onKick,
  onDeleteMessage,
  onLogout 
}) {
  const [input, setInput] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && isConnected) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex h-screen bg-nic-gray">
      {/* Sidebar - Online Users */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col shadow-lg">
        <div className="p-4 border-b border-gray-200 bg-nic-blue">
          <div className="flex justify-between items-center">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <span>👥</span> Online ({users.length})
            </h2>
            <div className="flex gap-1">
              {userRole === 'admin' && (
                <button
                  onClick={() => setShowAdminPanel(!showAdminPanel)}
                  className="text-white text-xs bg-blue-700 px-2 py-1 rounded hover:bg-blue-800"
                  title="Admin Panel"
                >
                  {showAdminPanel ? '✕' : '⚙️'}
                </button>
              )}
              <button
                onClick={onLogout}
                className="text-white text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-700"
                title="Logout"
              >
                🚪
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {users.length === 0 ? (
            <p className="text-gray-400 text-sm text-center mt-4">No one else is online</p>
          ) : (
            users.map((user, index) => (
              <div key={index} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
                  </div>
                  <span className="text-gray-700 font-medium">{user.username}</span>
                  {user.username === username && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">You</span>
                  )}
                  {user.role === 'admin' && (
                    <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">👑</span>
                  )}
                  {user.role === 'moderator' && (
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">🛡️</span>
                  )}
                </div>
                {showAdminPanel && userRole === 'admin' && user.username !== username && user.username !== 'admin' && (
                  <button
                    onClick={() => onKick(user.username)}
                    className="text-xs text-red-500 hover:text-red-700"
                    title="Kick user"
                  >
                    🚫
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              {userRole === 'admin' ? '👑 Admin' : userRole === 'moderator' ? '🛡️ Moderator' : '👤 User'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <span className="font-semibold text-gray-800"># General Chat</span>
              <p className="text-xs text-gray-400">NIC Messenger</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Logged in as <span className="font-medium text-nic-blue">{username}</span>
              {userRole === 'admin' && <span className="ml-1 text-yellow-500">👑</span>}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <MessageList 
            messages={messages} 
            currentUser={username} 
            userRole={userRole}
            onDeleteMessage={onDeleteMessage}
          />
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="flex space-x-2 max-w-5xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isConnected ? "Type a message..." : "Connecting..."}
              disabled={!isConnected}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-nic-blue focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!isConnected || !input.trim()}
              className="px-6 py-3 bg-nic-blue text-white rounded-xl hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Chat;