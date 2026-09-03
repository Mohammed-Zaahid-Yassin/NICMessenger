import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Chat from './components/Chat';

const playChime = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(987.77, audioCtx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch (e) {}
};

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
  
  const [activeChat, setActiveChat] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  
  // Upgraded Theme Engine: Supports 'light', 'dark', and 'black'
  const [theme, setTheme] = useState(localStorage.getItem('nic_theme') || 'dark');
  
  const activeChatRef = useRef(null);
  const userIdRef = useRef(null);
  const usernameRef = useRef(null);
  const usersRef = useRef([]);
  const socketRef = useRef(null);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  useEffect(() => { userIdRef.current = userId; usernameRef.current = username; }, [userId, username]);
  useEffect(() => { usersRef.current = users; }, [users]);

  // Sync theme with Tailwind and LocalStorage
  useEffect(() => {
    localStorage.setItem('nic_theme', theme);
    if (theme === 'dark' || theme === 'black') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (token && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [token]);

  useEffect(() => {
    const savedToken = localStorage.getItem('nic_messenger_token');
    const savedUser = localStorage.getItem('nic_messenger_user');
    
    if (savedToken && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setToken(savedToken);
        setUserId(user.id);
        setUsername(user.username);
        setUserRole(user.role);
      } catch (error) {
        localStorage.removeItem('nic_messenger_token');
        localStorage.removeItem('nic_messenger_user');
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (token) {
      socketRef.current = io('http://localhost:4000', {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      const socket = socketRef.current;

      socket.on('connect', () => setIsConnected(true));
      socket.on('disconnect', () => setIsConnected(false));
      socket.on('previous messages', (msgs) => setMessages(msgs));
      
      socket.on('chat message', (msg) => {
        const isGeneralMsg = !msg.recipient_id;
        const currentActiveId = activeChatRef.current?.id || null;
        const myId = Number(userIdRef.current);
        const msgUserId = Number(msg.user_id);
        const myUsername = usernameRef.current;
        
        let belongsToActive = false;
        if (isGeneralMsg && currentActiveId === null) {
          belongsToActive = true;
        } else if (!isGeneralMsg) {
          belongsToActive = (msgUserId === currentActiveId) || (Number(msg.recipient_id) === currentActiveId);
        }

        if (belongsToActive) {
          setMessages(prev => [...prev, msg]);
          if (!isGeneralMsg && msgUserId !== myId) {
            socket.emit('mark read', { senderId: msgUserId });
          }
        } else {
          if (isGeneralMsg) {
             setUnreadCounts(counts => ({ ...counts, 'general': (counts['general'] || 0) + 1 }));
          } else if (msgUserId !== myId) {
             setUnreadCounts(counts => ({ ...counts, [msgUserId]: (counts[msgUserId] || 0) + 1 }));
          }
        }

        if (msgUserId !== myId) {
          const isMentioned = myUsername && msg.content && msg.content.includes(`@${myUsername}`);
          const isTabHidden = typeof document !== 'undefined' && document.hidden;
          
          if (!belongsToActive || isTabHidden || isMentioned) {
            playChime();

            if ('Notification' in window && Notification.permission === 'granted' && (isTabHidden || !belongsToActive)) {
              const title = isGeneralMsg ? `#general (${msg.username})` : `DM from ${msg.username}`;
              const body = msg.content ? msg.content : 'Sent an attachment';
              
              const notif = new Notification(title, {
                body,
                icon: msg.avatar_url || undefined,
                tag: isGeneralMsg ? 'general' : `dm-${msgUserId}`
              });

              notif.onclick = () => {
                window.focus();
                if (isGeneralMsg) {
                  changeChat(null);
                } else {
                  const targetUser = usersRef.current.find(u => Number(u.id) === msgUserId) || { id: msgUserId, username: msg.username };
                  changeChat(targetUser);
                }
                notif.close();
              };
            }
          }
        }
      });

      socket.on('messages read', ({ readerId, senderId }) => {
        setMessages(prev => prev.map(m => {
          if (Number(m.recipient_id) === Number(readerId) && Number(m.user_id) === Number(senderId)) {
            return { ...m, is_read: 1 };
          }
          return m;
        }));
      });

      socket.on('message reaction', (data) => {
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.messageId) {
            return { ...msg, reactions: data.reactions, reaction_users: data.reactionUsers };
          }
          return msg;
        }));
      });

      socket.on('message edited', (data) => {
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.messageId) {
            return { ...msg, content: data.content, edited: true };
          }
          return msg;
        }));
      });

      socket.on('message deleted', (data) => {
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.messageId) {
            return { ...msg, content: data.content, image_url: null, is_deleted: true, deleted_by: data.deleted_by, reactions: [], reaction_users: [] };
          }
          return msg;
        }));
      });

      socket.on('user list', (userList) => setUsers(userList));
      
      socket.on('user typing', (data) => {
        setUsers(prev => {
          const updated = prev.map(user => user.username === data.username ? { ...user, isTyping: data.isTyping } : user);
          if (data.isTyping && !prev.find(u => u.username === data.username)) {
            return [...prev, { username: data.username, isTyping: true, role: 'user' }];
          }
          return updated;
        });
      });

      socket.on('system message', (msg) => {
        if (activeChatRef.current === null) {
          setMessages(prev => [...prev, { username: 'System', content: msg, timestamp: new Date().toISOString(), isSystem: true }]);
        }
      });

      socket.on('error', (error) => alert(`Error: ${error}`));
      socket.on('kicked', (message) => { alert(`⚠️ ${message}`); handleLogout(); });

      return () => { if (socket.connected) socket.disconnect(); };
    }
  }, [token]);const handleLogin = async (username, password, isSignup) => {
    try {
      const endpoint = isSignup ? '/api/register' : '/api/login';
      const response = await fetch(`http://localhost:4000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Authentication failed');

      localStorage.setItem('nic_messenger_token', data.token);
      localStorage.setItem('nic_messenger_user', JSON.stringify(data.user));
      
      setToken(data.token);
      setUserId(data.user.id);
      setUsername(data.user.username);
      setUserRole(data.user.role);
      setLoginError('');
      setActiveChat(null);
      setUnreadCounts({});
    } catch (error) {
      setLoginError(error.message);
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nic_messenger_token');
    localStorage.removeItem('nic_messenger_user');
    setToken(null);
    setUsername('');
    setUserRole('user');
    setUserId(null);
    setMessages([]);
    setUsers([]);
    setActiveChat(null);
    setUnreadCounts({});
    setIsConnected(false);
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const changeChat = (chatUser) => {
    setActiveChat(chatUser);
    setMessages([]); 
    const chatKey = chatUser ? chatUser.id : 'general';
    setUnreadCounts(prev => {
       const newCounts = { ...prev };
       delete newCounts[chatKey];
       return newCounts;
    });

    if (socketRef.current && isConnected) {
      socketRef.current.emit('switch chat', chatUser ? chatUser.id : null);
      if (chatUser && chatUser.id) {
        socketRef.current.emit('mark read', { senderId: chatUser.id });
      }
    }
  };

  const sendMessage = (data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('chat message', { ...data, recipientId: activeChat ? activeChat.id : null });
    }
  };

  const sendTyping = (isTyping) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(isTyping ? 'typing start' : 'typing stop');
    }
  };

  const addReaction = (messageId, emoji) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('add reaction', { messageId, emoji });
    }
  };

  const replyToMessage = (messageId, content, replyToUsername, replyToContent) => {
    if (socketRef.current && isConnected && content.trim()) {
      socketRef.current.emit('reply to message', { 
        messageId, content, replyToUsername, replyToContent, 
        recipientId: activeChat ? activeChat.id : null 
      });
    }
  };

  const editMessage = (messageId, content) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('edit message', { messageId, content });
    }
  };

  const handleKick = (targetUsername) => {
    if (socketRef.current && isConnected && userRole === 'admin') {
      socketRef.current.emit('kick user', targetUsername);
    }
  };

  const handleDeleteMessage = (messageId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('delete message', messageId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center text-white">
          <div className="text-4xl mb-4 animate-pulse">⚡</div>
          <div className="text-cyan-400 font-mono tracking-widest text-sm drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">INITIALIZING SYS...</div>
        </div>
      </div>
    );
  }

  // Dynamic background mapping
  const appBg = theme === 'black' ? 'bg-black' : 'bg-slate-50 dark:bg-slate-950';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${appBg}`}>
      <Routes>
        <Route path="/login" element={username ? <Navigate to="/chat" replace /> : <Login onLogin={handleLogin} error={loginError} />} />
        <Route path="/chat" element={username ? (
            <Chat 
              messages={messages} users={users} sendMessage={sendMessage} 
              username={username} userRole={userRole} userId={userId}
              isConnected={isConnected} onKick={handleKick} onDeleteMessage={handleDeleteMessage}
              onLogout={handleLogout} sendTyping={sendTyping} addReaction={addReaction}
              replyToMessage={replyToMessage} editMessage={editMessage}
              activeChat={activeChat} changeChat={changeChat} unreadCounts={unreadCounts}
              theme={theme} setTheme={setTheme}
            />
          ) : <Navigate to="/login" replace />} 
        />
        <Route path="*" element={<Navigate to={username ? "/chat" : "/login"} replace />} />
      </Routes>
    </div>
  );
}

export default App;