import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Chat from './components/Chat';

function App() {
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('nic_messenger_token');
    const savedUser = localStorage.getItem('nic_messenger_user');
    
    if (savedToken && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        console.log('🔄 Restoring session for:', user.username);
        setToken(savedToken);
        setUserId(user.id);
        setUsername(user.username);
        setUserRole(user.role);
      } catch (error) {
        console.error('Error restoring session:', error);
        localStorage.removeItem('nic_messenger_token');
        localStorage.removeItem('nic_messenger_user');
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (token) {
      console.log('🔌 Connecting to server with token...');
      
      socketRef.current = io('http://localhost:4000', {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      const socket = socketRef.current;

      socket.on('connect', () => {
        console.log('✅ Connected to server!');
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
        setIsConnected(false);
      });

      socket.on('previous messages', (msgs) => {
        console.log(`📚 Received ${msgs.length} previous messages`);
        setMessages(msgs);
      });

      socket.on('chat message', (msg) => {
        console.log(`📩 New message from ${msg.username}: ${msg.content}`);
        setMessages(prev => [...prev, msg]);
      });

      socket.on('message reaction', (data) => {
        console.log(`🔄 Reaction update for message ${data.messageId}`);
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.messageId) {
            return { 
              ...msg, 
              reactions: data.reactions, 
              reaction_users: data.reactionUsers 
            };
          }
          return msg;
        }));
      });

      socket.on('message edited', (data) => {
        console.log(`✏️ Message ${data.messageId} edited`);
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.messageId) {
            return { ...msg, content: data.content, edited: true };
          }
          return msg;
        }));
      });

      socket.on('message deleted', (data) => {
        console.log(`🗑️ Message ${data.messageId} was deleted`);
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.messageId) {
            return { 
              ...msg, 
              content: data.content || 'This message was deleted',
              is_deleted: true,
              deleted_by: data.deleted_by,
              reactions: [],
              reaction_users: []
            };
          }
          return msg;
        }));
      });

      socket.on('user list', (userList) => {
        console.log(`👥 User list updated: ${userList.length} users`);
        setUsers(userList);
      });

      socket.on('user typing', (data) => {
        setUsers(prev => {
          const updated = prev.map(user => {
            if (user.username === data.username) {
              return { ...user, isTyping: data.isTyping };
            }
            return user;
          });
          if (data.isTyping && !prev.find(u => u.username === data.username)) {
            return [...prev, { username: data.username, isTyping: true, role: 'user' }];
          }
          return updated;
        });
      });

      socket.on('system message', (msg) => {
        console.log(`📢 System: ${msg}`);
        setMessages(prev => [...prev, { 
          username: 'System', 
          content: msg, 
          timestamp: new Date().toISOString(),
          isSystem: true 
        }]);
      });

      socket.on('error', (error) => {
        console.error('❌ Socket error:', error);
        alert(`Error: ${error}`);
      });

      socket.on('kicked', (message) => {
        alert(`⚠️ ${message}`);
        handleLogout();
      });

      return () => {
        console.log('🧹 Cleaning up socket...');
        socket.off('connect');
        socket.off('disconnect');
        socket.off('previous messages');
        socket.off('chat message');
        socket.off('message reaction');
        socket.off('message edited');
        socket.off('message deleted');
        socket.off('user list');
        socket.off('user typing');
        socket.off('system message');
        socket.off('error');
        socket.off('kicked');
        if (socket.connected) {
          socket.disconnect();
        }
      };
    }
  }, [token]);

  const handleLogin = async (username, password, isSignup) => {
    try {
      const endpoint = isSignup ? '/api/register' : '/api/login';
      console.log(`📝 ${isSignup ? 'Registering' : 'Logging in'} as ${username}`);
      
      const response = await fetch(`http://localhost:4000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      console.log('✅ Login successful:', data.user);
      
      localStorage.setItem('nic_messenger_token', data.token);
      localStorage.setItem('nic_messenger_user', JSON.stringify(data.user));
      
      setToken(data.token);
      setUserId(data.user.id);
      setUsername(data.user.username);
      setUserRole(data.user.role);
      setLoginError('');
      
    } catch (error) {
      console.error('❌ Login error:', error);
      setLoginError(error.message);
      throw error;
    }
  };

  const handleLogout = () => {
    console.log('🚪 Logging out...');
    localStorage.removeItem('nic_messenger_token');
    localStorage.removeItem('nic_messenger_user');
    setToken(null);
    setUsername('');
    setUserRole('user');
    setUserId(null);
    setMessages([]);
    setUsers([]);
    setIsConnected(false);
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const sendMessage = (message) => {
    if (message.trim() && socketRef.current && isConnected) {
      console.log(`📤 Sending message: ${message}`);
      socketRef.current.emit('chat message', message);
    }
  };

  const sendTyping = (isTyping) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(isTyping ? 'typing start' : 'typing stop');
    }
  };

  const addReaction = (messageId, emoji) => {
    if (socketRef.current && isConnected) {
      console.log(`👍 Adding reaction ${emoji} to message ${messageId}`);
      socketRef.current.emit('add reaction', { messageId, emoji });
    }
  };

  const replyToMessage = (messageId, content, replyToUsername, replyToContent) => {
    if (socketRef.current && isConnected && content.trim()) {
      console.log(`💬 Replying to message ${messageId}`);
      socketRef.current.emit('reply to message', { messageId, content, replyToUsername, replyToContent });
    }
  };

  const editMessage = (messageId, content) => {
    if (socketRef.current && isConnected) {
      console.log(`✏️ Editing message ${messageId}`);
      socketRef.current.emit('edit message', { messageId, content });
    }
  };

  const handleKick = (targetUsername) => {
    if (socketRef.current && isConnected && userRole === 'admin') {
      console.log(`👢 Kicking user: ${targetUsername}`);
      socketRef.current.emit('kick user', targetUsername);
    }
  };

  const handleDeleteMessage = (messageId) => {
    if (socketRef.current && isConnected) {
      console.log(`🗑️ Deleting message: ${messageId}`);
      socketRef.current.emit('delete message', messageId);
    } else {
      console.warn('⚠️ Cannot delete message - not connected');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4">💬</div>
          <div className="text-gray-500 dark:text-gray-400">Loading NIC Messenger...</div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* 1. Login Page: If logged in, automatically push to chat */}
      <Route path="/login" element={
        username ? (
          <Navigate to="/chat" replace />
        ) : (
          <Login onLogin={handleLogin} error={loginError} />
        )
      } />

      {/* 2. Chat Page: If NOT logged in, push back to login */}
      <Route path="/chat" element={
        username ? (
          <Chat 
            messages={messages} 
            users={users} 
            sendMessage={sendMessage} 
            username={username}
            userRole={userRole}
            userId={userId}
            isConnected={isConnected}
            onKick={handleKick}
            onDeleteMessage={handleDeleteMessage}
            onLogout={handleLogout}
            sendTyping={sendTyping}
            addReaction={addReaction}
            replyToMessage={replyToMessage}
            editMessage={editMessage}
          />
        ) : (
          <Navigate to="/login" replace />
        )
      } />

      {/* 3. Catch-all: Send to chat or login depending on auth state */}
      <Route path="*" element={
        <Navigate to={username ? "/chat" : "/login"} replace />
      } />
    </Routes>
  );
}

export default App;