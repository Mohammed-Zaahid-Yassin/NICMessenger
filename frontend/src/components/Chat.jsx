import React, { useState, useRef, useEffect } from 'react';
import ProfileModal from './ProfileModal';
import MessageList from './MessageList';

function Chat({
  messages,
  users,
  sendMessage,
  username,
  userRole,
  userId,
  isConnected,
  onKick,
  onDeleteMessage,
  onLogout,
  sendTyping,
  addReaction,
  replyToMessage,
  editMessage
}) {
    const [newMessage, setNewMessage] = useState('');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const messagesEndRef = useRef(null);

    // Grab your own profile from the live users list so the avatar updates instantly
    const myProfile = users.find(u => u.username === username) || {
        id: userId,
        username: username,
        avatar_url: null,
        status: 'Online',
        bio: ''
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        sendTyping(true);
        clearTimeout(window.typingTimeout);
        window.typingTimeout = setTimeout(() => {
            sendTyping(false);
        }, 1000);
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !isConnected) return;

        if (editingMessage) {
            editMessage(editingMessage.id, newMessage);
            setEditingMessage(null);
        } else if (replyTo) {
            replyToMessage(replyTo.id, newMessage, replyTo.username, replyTo.content);
            setReplyTo(null);
        } else {
            sendMessage(newMessage);
        }
        
        setNewMessage('');
        sendTyping(false);
    };

    // Filter out yourself from the typing list
    const typingUsers = users.filter(u => u.isTyping && u.username !== username);

    // Mock socket object to pass to MessageList so it doesn't break
    const mockSocket = {
        emit: (event, data) => {
            if (event === 'delete message') onDeleteMessage(data);
            if (event === 'add reaction') addReaction(data.messageId, data.emoji);
        }
    };

    return (
        <div className="flex h-screen bg-[#111827] text-white">
            
            {/* SIDEBAR */}
            <div className="w-64 bg-[#1f2937] border-r border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-indigo-400 tracking-wider">NIC MESSENGER</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase">Online Users — {users.length}</h3>
                    {users.map(u => (
                        <div key={u.id || u.username} className="flex items-center gap-3 group">
                            <div className="relative">
                                {u.avatar_url ? (
                                    <img src={u.avatar_url} alt={u.username} className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm">
                                        {u.username?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                )}
                                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#1f2937] ${u.status === 'Online' ? 'bg-green-500' : u.status === 'Away' ? 'bg-yellow-500' : u.status === 'Do Not Disturb' ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                            </div>
                            <div className="flex flex-col flex-1">
                                <span className="text-sm font-medium">{u.username}</span>
                                <span className="text-xs text-gray-400 truncate w-24">{u.status !== 'Online' ? u.status : 'Active'}</span>
                            </div>
                            {userRole === 'admin' && u.username !== username && (
                                <button onClick={() => onKick(u.username)} className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Kick
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                
                {/* Current User Profile Trigger */}
                <div className="p-4 bg-[#111827] border-t border-gray-700 flex items-center justify-between">
                    <div 
                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setIsProfileModalOpen(true)}
                    >
                        {myProfile.avatar_url ? (
                            <img src={myProfile.avatar_url} alt="You" className="w-10 h-10 rounded-full object-cover border border-gray-600" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-lg">
                                {username?.charAt(0).toUpperCase() || '?'}
                            </div>
                        )}
                        <div className="flex flex-col">
                            <span className="font-semibold text-sm">{username}</span>
                            <span className="text-xs text-indigo-400 hover:underline">Edit Profile</span>
                        </div>
                    </div>
                    <button onClick={onLogout} className="text-gray-400 hover:text-red-400 transition-colors" title="Log Out">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                </div>
            </div>

            {/* MAIN CHAT AREA */}
            <div className="flex-1 flex flex-col bg-[#111827]">
                
                <div className="h-16 border-b border-gray-700 flex items-center justify-between px-6 bg-[#1f2937]/50 shadow-sm">
                    <h3 className="font-semibold text-lg"># general</h3>
                    {!isConnected && (
                        <span className="text-red-400 text-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            Disconnected
                        </span>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    <MessageList 
                        messages={messages}
                        currentUser={myProfile}
                        socket={mockSocket}
                        onReply={setReplyTo}
                        onEdit={(msg) => {
                            setEditingMessage(msg);
                            setNewMessage(msg.content);
                        }}
                    />
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-[#1f2937]">
                    
                    {replyTo && (
                        <div className="flex items-center justify-between text-sm text-gray-400 mb-2 px-2">
                            <span>Replying to <strong>{replyTo.username}</strong></span>
                            <button onClick={() => setReplyTo(null)} className="hover:text-white">✕</button>
                        </div>
                    )}
                    {editingMessage && (
                        <div className="flex items-center justify-between text-sm text-indigo-400 mb-2 px-2">
                            <span>Editing message</span>
                            <button onClick={() => { setEditingMessage(null); setNewMessage(''); }} className="hover:text-white">✕</button>
                        </div>
                    )}

                    {typingUsers.length > 0 && (
                        <div className="text-xs text-gray-400 mb-1 px-2 italic">
                            {typingUsers.map(u => u.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                        </div>
                    )}

                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={handleTyping}
                            placeholder={isConnected ? "Message #general" : "Connecting..."}
                            disabled={!isConnected}
                            className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
                        />
                        <button 
                            type="submit"
                            disabled={!newMessage.trim() || !isConnected}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                            Send
                        </button>
                    </form>
                </div>
            </div>

            <ProfileModal 
                isOpen={isProfileModalOpen} 
                onClose={() => setIsProfileModalOpen(false)} 
                currentUser={username}
                userId={userId}
                currentAvatar={myProfile.avatar_url}
                currentBio={myProfile.bio}
                currentStatus={myProfile.status}
            />
        </div>
    );
}

export default Chat;