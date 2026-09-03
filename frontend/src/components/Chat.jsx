import React, { useState, useRef, useEffect } from 'react';
import ProfileModal from './ProfileModal';
import MessageList from './MessageList';

function Chat({
  messages, users, sendMessage, username, userRole, userId, isConnected,
  onKick, onDeleteMessage, onLogout, sendTyping, addReaction, replyToMessage, editMessage,
  activeChat, changeChat, unreadCounts, theme, setTheme
}) {
    const [newMessage, setNewMessage] = useState('');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const myProfile = users.find(u => u.username === username) || {
        id: userId, username: username, avatar_url: null, status: 'Online', bio: ''
    };

    const scrollToBottom = () => {
        if (!searchQuery) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    };

    useEffect(() => { scrollToBottom(); }, [messages]);
    useEffect(() => { setSearchQuery(''); setIsSearchOpen(false); }, [activeChat]);

    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        sendTyping(true);
        clearTimeout(window.typingTimeout);
        window.typingTimeout = setTimeout(() => sendTyping(false), 1000);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !isConnected) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch('http://localhost:4000/api/messages/image', {
                method: 'POST',
                body: formData
            });
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); } catch (e) { throw new Error("Server returned an invalid response."); }
            
            if (res.ok && data.success) {
                sendMessage({ content: newMessage, imageUrl: data.imageUrl });
                setNewMessage('');
            } else {
                throw new Error(data.error || "Failed to save image");
            }
        } catch (error) {
            alert(`Upload Error: ${error.message}`);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        const safeMessage = String(newMessage).trim();
        
        if ((!safeMessage && !isUploading) || !isConnected) return;

        if (editingMessage) {
            editMessage(editingMessage.id, safeMessage);
            setEditingMessage(null);
        } else if (replyTo) {
            replyToMessage(replyTo.id, safeMessage, replyTo.username, replyTo.content);
            setReplyTo(null);
        } else {
            sendMessage({ content: safeMessage });
        }
        setNewMessage('');
        sendTyping(false);
    };

    const typingUsers = users.filter(u => u.isTyping && u.username !== username);

    const displayedMessages = messages.filter((msg) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (msg.content && msg.content.toLowerCase().includes(q)) || (msg.username && msg.username.toLowerCase().includes(q));
    });

    const mockSocket = {
        emit: (event, data) => {
            if (event === 'delete message') onDeleteMessage(data);
            if (event === 'add reaction') addReaction(data.messageId, data.emoji);
        }
    };

    // Dynamic Theme Classes
    const sidebarBg = theme === 'black' ? 'bg-[#050505] border-[#1a1a1a]' : 'bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl border-slate-200 dark:border-slate-800';
    const mainBg = theme === 'black' ? 'bg-black' : 'bg-transparent';
    const headerBg = theme === 'black' ? 'bg-[#0a0a0a]/80 border-[#1a1a1a]' : 'bg-white/60 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800';
    const inputBg = theme === 'black' ? 'bg-[#050505] border-[#1a1a1a]' : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800';
    const textBase = theme === 'black' ? 'text-gray-300' : 'text-slate-800 dark:text-slate-200';

    return (
        <div className={`flex h-screen w-full ${textBase}`}>
            {/* Techy Glass Sidebar */}
            <div className={`w-64 border-r flex flex-col z-20 transition-all duration-300 ${sidebarBg}`}>
                <div className={`p-5 border-b flex items-center gap-3 ${theme === 'black' ? 'border-[#1a1a1a]' : 'border-slate-200 dark:border-slate-800'}`}>
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <h2 className="text-lg font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 uppercase">NIC MESSENGER</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    <div 
                        onClick={() => changeChat(null)} 
                        className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${!activeChat ? (theme === 'black' ? 'bg-[#1a1a1a] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' : 'bg-indigo-50 dark:bg-indigo-500/20 shadow-inner') : 'hover:bg-black/10 dark:hover:bg-white/5'}`}
                    >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg ${!activeChat ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]' : 'text-slate-400'}`}>
                            #
                        </div>
                        <div className="flex-1 flex justify-between items-center pr-1">
                            <span className="font-semibold text-sm tracking-wide">General</span>
                            {unreadCounts['general'] > 0 && (
                                <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.6)]">
                                    {unreadCounts['general']}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 pb-2">
                        <h3 className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase px-3">Encrypted DMs</h3>
                    </div>

                    {users.map(u => {
                        if (u.username === username) return null;
                        const isActive = activeChat?.id === u.id;
                        
                        return (
                            <div 
                                key={u.id || u.username} 
                                onClick={() => changeChat(u)}
                                className={`flex items-center gap-3 group p-2.5 rounded-xl cursor-pointer transition-all ${isActive ? (theme === 'black' ? 'bg-[#1a1a1a] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' : 'bg-slate-100 dark:bg-slate-800/80') : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                            >
                                <div className="relative">
                                    {u.avatar_url ? (
                                        <img src={u.avatar_url} alt={u.username} className={`w-8 h-8 rounded-xl object-cover transition-all ${isActive ? 'ring-2 ring-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : ''}`} />
                                    ) : (
                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center font-bold text-sm text-white shadow-inner">
                                            {u.username?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                    )}
                                    <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 ${theme === 'black' ? 'border-[#0a0a0a]' : 'border-white dark:border-slate-900'} ${u.status === 'Online' ? 'bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.8)]' : u.status === 'Away' ? 'bg-amber-500' : u.status === 'Do Not Disturb' ? 'bg-rose-500' : 'bg-slate-500'}`}></span>
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                    <span className={`text-sm font-semibold truncate ${isActive ? 'text-indigo-400' : ''}`}>{u.username}</span>
                                    <span className="text-[10px] text-slate-500 truncate">{u.status !== 'Online' ? u.status : 'Active'}</span>
                                </div>
                                
                                {unreadCounts[u.id] > 0 && (
                                    <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.6)]">
                                        {unreadCounts[u.id]}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>{/* Profile & Controls Footer */}
                <div className={`p-4 border-t flex items-center justify-between relative ${theme === 'black' ? 'border-[#1a1a1a] bg-[#050505]' : 'border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md'}`}>
                    <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity min-w-0 flex-1" onClick={() => setIsProfileModalOpen(true)}>
                        {myProfile.avatar_url ? (
                            <img src={myProfile.avatar_url} alt="You" className="w-10 h-10 rounded-xl object-cover" />
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center font-bold text-lg text-white shadow-inner">
                                {username?.charAt(0).toUpperCase() || '?'}
                            </div>
                        )}
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold text-sm truncate">{username}</span>
                            <span className="text-[10px] text-slate-500 hover:text-indigo-400 transition-colors uppercase tracking-wider">Edit Profile</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                        <button onClick={() => setIsSettingsOpen(true)} className={`p-2 rounded-xl transition-colors ${theme === 'black' ? 'hover:bg-[#1a1a1a]' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
                            <svg className="w-5 h-5 opacity-70 hover:opacity-100 hover:text-cyan-400 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                        <button onClick={onLogout} className={`p-2 rounded-xl transition-colors ${theme === 'black' ? 'hover:bg-rose-950/30 hover:text-rose-500' : 'hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500'}`} title="Log Out">
                            <svg className="w-5 h-5 opacity-70 hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col min-w-0 relative ${mainBg}`}>
                <div className={`h-16 border-b flex items-center justify-between px-6 backdrop-blur-xl sticky top-0 z-10 ${headerBg}`}>
                    <div className="flex items-center gap-3">
                        {activeChat ? (
                            <>
                                <span className="text-cyan-500 font-bold text-2xl drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">@</span>
                                <h3 className="font-bold text-lg tracking-wide">{activeChat.username}</h3>
                            </>
                        ) : (
                            <>
                                <span className="text-slate-400 font-bold text-2xl">#</span>
                                <h3 className="font-bold text-lg tracking-wide">general</h3>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative flex items-center">
                            {isSearchOpen ? (
                                <div className={`flex items-center border rounded-full px-3 py-1.5 shadow-inner transition-all w-48 sm:w-64 ${theme === 'black' ? 'bg-[#0a0a0a] border-[#222]' : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}>
                                    <svg className="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    <input 
                                        type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search logs..." autoFocus
                                        className="bg-transparent border-none text-xs focus:outline-none w-full"
                                    />
                                    <button onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }} className="text-slate-400 hover:text-cyan-400 text-xs ml-1">✕</button>
                                </div>
                            ) : (
                                <button onClick={() => setIsSearchOpen(true)} className={`p-2 rounded-full transition-colors ${theme === 'black' ? 'hover:bg-[#1a1a1a] hover:text-cyan-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="Search">
                                    <svg className="w-5 h-5 opacity-70 hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
                    {searchQuery && (
                        <div className={`mb-6 border text-xs px-4 py-3 rounded-xl flex justify-between items-center shadow-sm backdrop-blur-md ${theme === 'black' ? 'bg-cyan-950/20 border-cyan-900/50 text-cyan-400' : 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300'}`}>
                            <span>Query executing: "<strong>{searchQuery}</strong>"</span>
                            <button onClick={() => setSearchQuery('')} className="hover:underline font-bold uppercase tracking-wider text-[10px]">Terminate</button>
                        </div>
                    )}
                    <MessageList 
                        messages={displayedMessages} currentUser={myProfile} socket={mockSocket}
                        onReply={setReplyTo} onEdit={(msg) => { setEditingMessage(msg); setNewMessage(msg.content); }}
                        searchQuery={searchQuery} theme={theme}
                    />
                    <div ref={messagesEndRef} />
                </div>

                <div className={`p-4 border-t z-10 backdrop-blur-xl ${inputBg}`}>
                    {replyTo && (
                        <div className={`flex items-center justify-between text-xs mb-2 px-3 py-1.5 rounded-t-lg border-l-2 ${theme === 'black' ? 'bg-[#1a1a1a] border-cyan-500 text-gray-400' : 'bg-slate-50 dark:bg-slate-800/50 border-indigo-500'}`}>
                            <span>Replying to <strong className={theme === 'black' ? 'text-white' : 'text-slate-700 dark:text-slate-200'}>{replyTo.username}</strong></span>
                            <button onClick={() => setReplyTo(null)} className="hover:text-rose-500">✕</button>
                        </div>
                    )}
                    {editingMessage && (
                        <div className={`flex items-center justify-between text-xs mb-2 px-3 py-1.5 rounded-t-lg border-l-2 ${theme === 'black' ? 'bg-cyan-950/30 border-cyan-500 text-cyan-400' : 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-500 dark:text-indigo-400'}`}>
                            <span className="font-bold tracking-widest uppercase">Overwriting Package</span>
                            <button onClick={() => { setEditingMessage(null); setNewMessage(''); }} className="hover:text-rose-500">✕</button>
                        </div>
                    )}
                    
                    <form onSubmit={handleSendMessage} className="flex gap-3 items-center">
                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                        
                        <button 
                            type="button" onClick={() => fileInputRef.current?.click()}
                            disabled={!isConnected || isUploading || editingMessage}
                            className={`p-3.5 rounded-full transition-all disabled:opacity-50 ${theme === 'black' ? 'bg-[#1a1a1a] hover:bg-[#222] hover:text-cyan-400 border border-[#333]' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-500'}`}
                            title="Attach Image"
                        >
                            {isUploading ? (
                                <span className="animate-spin block">⏳</span>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            )}
                        </button>
                        
                        <div className="flex-1 relative">
                            <input
                                type="text" value={newMessage} onChange={handleTyping}
                                placeholder={isConnected ? `Initialize connection to ${activeChat ? '@' + activeChat.username : '#general'}...` : "Connecting to relay..."}
                                disabled={!isConnected || isUploading}
                                className={`w-full border rounded-full px-5 py-3.5 focus:outline-none transition-all disabled:opacity-50 text-sm ${theme === 'black' ? 'bg-[#0a0a0a] border-[#222] focus:border-cyan-500 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] placeholder-gray-600' : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-400 dark:placeholder-slate-500'}`}
                            />
                        </div>
                        
                        <button 
                            type="submit"
                            disabled={(!newMessage.trim() && !isUploading) || !isConnected}
                            className={`p-3.5 rounded-full transition-all disabled:opacity-50 disabled:shadow-none ${theme === 'black' ? 'bg-cyan-600 hover:bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20'}`}
                        >
                            <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                    </form>
                </div>
            </div>

            {/* FULL SCREEN SETTINGS MODAL */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className={`w-[600px] h-[400px] flex rounded-2xl shadow-2xl overflow-hidden ${theme === 'black' ? 'bg-[#0a0a0a] border border-[#222]' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700'}`}>
                        {/* Modal Sidebar */}
                        <div className={`w-1/3 p-4 flex flex-col gap-2 ${theme === 'black' ? 'bg-[#050505] border-r border-[#1a1a1a]' : 'bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-800'}`}>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-2">Settings</h3>
                            <button className={`text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${theme === 'black' ? 'bg-[#1a1a1a] text-cyan-400 border border-[#333]' : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'}`}>
                                🎨 Theme Engine
                            </button>
                        </div>
                        {/* Modal Content */}
                        <div className="w-2/3 p-6 relative">
                            <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-500 transition-colors">
                                ✕
                            </button>
                            <h2 className={`text-xl font-bold mb-6 ${theme === 'black' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>Theme Engine</h2>
                            
                            <div className="space-y-3">
                                <button onClick={() => setTheme('light')} className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${theme === 'light' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                    ☀️ Light Mode
                                </button>
                                <button onClick={() => setTheme('dark')} className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${theme === 'dark' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                    🌙 Dark Mode
                                </button>
                                <button onClick={() => setTheme('black')} className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${theme === 'black' ? 'border-cyan-500 bg-[#111] text-cyan-400 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                    ⬛ Black (OLED)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ProfileModal 
                isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} 
                currentUser={username} userId={userId} currentAvatar={myProfile.avatar_url}
                currentBio={myProfile.bio} currentStatus={myProfile.status}
            />
        </div>
    );
}

export default Chat;