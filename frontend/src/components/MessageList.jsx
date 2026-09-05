import React, { useState } from 'react';

const EMOJI_LIST = ['👍', '❤️', '😂', '🔥', '👀', '🎉', '💯', '🤔'];

function MessageList({ messages, currentUser, socket, onReply, onEdit, searchQuery, theme, fetchOlderMessages, hasMoreMessages, isFetchingHistory, onEditTask, onViewAnalytics }) {
    const [hoveredMessage, setHoveredMessage] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(null);

    const formatTime = (isoString) => { 
        const date = new Date(isoString); 
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); 
    };
    
    const formatDateHeader = (isoString) => {
        const date = new Date(isoString); 
        const today = new Date(); 
        const yesterday = new Date(today); 
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) return 'TODAY';
        if (date.toDateString() === yesterday.toDateString()) return 'YESTERDAY';
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    };
    
    const highlightText = (text, query) => {
        if (!query || !text) return text;
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return parts.map((part, index) => part.toLowerCase() === query.toLowerCase() ? <span key={index} className="bg-amber-500 text-black font-bold px-1 rounded">{part}</span> : part);
    };

    let currentDate = null;

    return (
        <div className="space-y-6 flex flex-col">
            {hasMoreMessages && messages.length >= 50 && (
                <div className="flex justify-center my-4">
                    <button onClick={() => fetchOlderMessages(messages.length)} disabled={isFetchingHistory} className={`text-xs font-bold px-4 py-2 rounded-full border shadow-sm transition-all disabled:opacity-50 ${theme === 'black' ? 'bg-[#111] border-[#333] text-cyan-500 hover:bg-[#222]' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        {isFetchingHistory ? 'DECRYPTING LOGS...' : 'LOAD ARCHIVE'}
                    </button>
                </div>
            )}

            {messages.map((msg, index) => {
                const isMe = msg.username === currentUser.username;
                const msgDate = formatDateHeader(msg.timestamp);
                const showDateHeader = msgDate !== currentDate;
                if (showDateHeader) currentDate = msgDate;

                const isDeleted = msg.is_deleted;
                const isSystem = msg.isSystem || msg.username === 'System' || msg.username.includes('(System)');

                let taskCard = null;
                if (msg.task_data) { 
                    try { taskCard = JSON.parse(msg.task_data); } catch(e){} 
                }
                
                // Permission Check for Edit/Analytics Buttons (Made more robust for Admins)
                const isOwnerOrAdmin = currentUser.role === 'admin' || currentUser.username === 'admin' || (taskCard && currentUser.id === taskCard.createdBy) || (currentUser.club_roles && currentUser.club_roles.some(r => r.team === 'Executive Board' || String(r.post).includes('Lead') || String(r.post).includes('Manager')));

                return (
                    <React.Fragment key={msg.id || index}>
                        {showDateHeader && (
                            <div className="flex justify-center relative my-8">
                                <div className="absolute inset-0 flex items-center"><div className={`w-full border-t ${theme === 'black' ? 'border-[#222]' : 'border-slate-200 dark:border-slate-800/50'}`}></div></div>
                                <div className={`relative px-4 py-1 text-[10px] font-black tracking-[0.2em] rounded-full shadow-sm ${theme === 'black' ? 'bg-[#111] text-slate-500 border border-[#222]' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700/50'}`}>{msgDate}</div>
                            </div>
                        )}
                        
                        <div className={`flex gap-4 group relative ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isSystem ? 'justify-center w-full' : ''}`} onMouseEnter={() => setHoveredMessage(msg.id)} onMouseLeave={() => { setHoveredMessage(null); setShowEmojiPicker(null); }}>
                            {!isSystem && (
                                <div className="flex-shrink-0 mt-auto">
                                    {msg.avatar_url ? <img src={msg.avatar_url} alt={msg.username} className={`w-9 h-9 rounded-xl object-cover shadow-sm ${isMe ? (theme === 'black' ? 'ring-1 ring-[#333]' : 'ring-2 ring-indigo-500/20') : (theme === 'black' ? 'ring-1 ring-[#333]' : 'ring-2 ring-slate-200 dark:ring-slate-700')}`} /> : <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${isMe ? 'bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white' : 'bg-gradient-to-tr from-slate-600 to-slate-400 text-white'}`}>{msg.username.charAt(0).toUpperCase()}</div>}
                                </div>
                            )}

                            <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'} ${isSystem ? 'items-center max-w-[90%]' : ''}`}>
                                
                                {!isSystem && (
                                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-1.5`}>
                                        <div className={`flex items-baseline gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <span className={`font-bold text-sm ${isMe ? (theme === 'black' ? 'text-white' : 'text-indigo-600 dark:text-indigo-400') : (theme === 'black' ? 'text-cyan-400' : 'text-slate-700 dark:text-slate-300')}`}>{highlightText(msg.username, searchQuery)}</span>
                                            <span className="text-[10px] font-semibold text-slate-400">{formatTime(msg.timestamp)}</span>
                                        </div>
                                        
                                        {/* FIXED: Tags now sit on their own line below the name with full text and no emojis */}
                                        {msg.club_roles && msg.club_roles.length > 0 && !isMe && (
                                            <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                {msg.club_roles.map((role, i) => (
                                                    <span key={i} className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                                                        {role.team} {role.post}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {msg.reply_to && !isDeleted && (
                                    <div className={`mb-1 px-3 py-1.5 rounded-lg text-xs border-l-2 opacity-70 flex flex-col ${isMe ? (theme === 'black' ? 'bg-[#111] border-cyan-500 text-gray-400' : 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-400 text-indigo-600 dark:text-indigo-300') : (theme === 'black' ? 'bg-[#111] border-[#333] text-gray-500' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-500')}`}>
                                        <span className="font-bold mb-0.5">{msg.reply_to_username}</span>
                                        <span className="truncate line-clamp-1">{msg.reply_to_content}</span>
                                    </div>
                                )}

                                {taskCard ? (
                                    <div className={`p-5 rounded-2xl shadow-lg border relative w-full sm:w-[350px] ${(taskCard.completedBy?.includes(currentUser.username)) ? (theme === 'black' ? 'bg-emerald-950/20 border-emerald-900 text-emerald-400' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300') : (theme === 'black' ? 'bg-[#111] border-[#333] text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200')}`}>
                                        <div className="flex justify-between items-start mb-3 border-b border-inherit pb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{(taskCard.completedBy?.includes(currentUser.username)) ? '✅' : '⚡'}</span>
                                                <h4 className="font-black tracking-wide text-sm">{taskCard.title}</h4>
                                            </div>
                                        </div>
                                        
                                        <p className="text-xs opacity-80 mb-4 whitespace-pre-wrap">{taskCard.description}</p>
                                        
                                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider opacity-70 mb-5">
                                            <span>⏱️ DEADLINE:</span>
                                            <span className={(taskCard.completedBy?.includes(currentUser.username)) ? '' : 'text-rose-500'}>{new Date(taskCard.deadline).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                        </div>

                                        {!(taskCard.completedBy?.includes(currentUser.username)) ? (
                                            <button 
                                                onClick={() => { if(window.confirm('Are you sure you want to mark this mission as complete? You cannot undo this.')) { socket.emit('complete task', msg.id); } }}
                                                className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${theme === 'black' ? 'bg-amber-600 hover:bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20'}`}
                                            >
                                                Mark Complete
                                            </button>
                                        ) : (
                                            <div className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-center bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                                Mission Accomplished
                                            </div>
                                        )}

                                        {isOwnerOrAdmin && (
                                            <div className={`mt-4 pt-4 flex gap-3 border-t ${theme === 'black' ? 'border-[#333]' : 'border-slate-200 dark:border-slate-700'}`}>
                                                <button onClick={() => onEditTask(taskCard)} className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors ${theme === 'black' ? 'bg-[#222] hover:bg-[#333] text-cyan-400' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-indigo-500'}`}>✏️ Edit</button>
                                                <button onClick={() => onViewAnalytics(taskCard)} className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors ${theme === 'black' ? 'bg-[#222] hover:bg-[#333] text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-indigo-500'}`}>📊 Analytics</button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className={`relative group/msg ${isSystem ? 'w-full flex justify-center' : ''}`}>
                                        <div className={`px-4 py-2.5 rounded-2xl shadow-sm relative z-10 ${
                                            isDeleted ? (theme === 'black' ? 'bg-[#111] border border-[#222] text-gray-600 italic' : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 italic')
                                            : isSystem ? (theme === 'black' ? 'bg-[#1a1a1a] text-cyan-400 text-xs font-mono px-6 border border-[#222] shadow-[0_0_10px_rgba(6,182,212,0.1)]' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-6 border border-indigo-100 dark:border-indigo-800/50')
                                            : isMe ? (theme === 'black' ? 'bg-[#222] text-white border border-[#333]' : 'bg-indigo-600 text-white shadow-indigo-500/20')
                                            : (theme === 'black' ? 'bg-[#111] text-gray-300 border border-[#222]' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700')
                                        }`}>
                                            {msg.image_url && !isDeleted && <a href={msg.image_url} target="_blank" rel="noopener noreferrer" className="block mb-2 overflow-hidden rounded-xl"><img src={msg.image_url} alt="attachment" className="max-w-[250px] max-h-[250px] object-cover hover:scale-105 transition-transform duration-300" /></a>}
                                            <p className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed ${isSystem ? 'text-center' : ''}`}>
                                                {highlightText(msg.content, searchQuery)}
                                                {msg.edited && !isDeleted && <span className="text-[9px] opacity-50 ml-2 font-bold uppercase">(Edited)</span>}
                                            </p>
                                        </div>
                                        {!isSystem && hoveredMessage === msg.id && !isDeleted && (
                                            <div className={`absolute top-0 -translate-y-1/2 ${isMe ? '-left-2 -translate-x-full' : '-right-2 translate-x-full'} flex items-center gap-1 z-20`}>
                                                <div className={`flex items-center p-1 rounded-xl shadow-lg border backdrop-blur-md ${theme === 'black' ? 'bg-[#111]/90 border-[#333]' : 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700'}`}>
                                                    <div className="relative">
                                                        <button onMouseEnter={() => setShowEmojiPicker(msg.id)} className={`p-1.5 rounded-lg transition-colors ${theme === 'black' ? 'hover:bg-[#222] text-gray-400 hover:text-cyan-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-500'}`} title="React">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        </button>
                                                        {showEmojiPicker === msg.id && (
                                                            <div onMouseLeave={() => setShowEmojiPicker(null)} className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 p-2 rounded-2xl shadow-xl border flex gap-1 z-30 ${theme === 'black' ? 'bg-[#0a0a0a] border-[#333]' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                                                {EMOJI_LIST.map(emoji => <button key={emoji} onClick={() => { socket.emit('add reaction', { messageId: msg.id, emoji }); setShowEmojiPicker(null); }} className="hover:scale-125 transition-transform text-xl p-1">{emoji}</button>)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button onClick={() => onReply(msg)} className={`p-1.5 rounded-lg transition-colors ${theme === 'black' ? 'hover:bg-[#222] text-gray-400 hover:text-cyan-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-500'}`} title="Reply">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                                    </button>
                                                    {isMe && (
                                                        <>
                                                            <button onClick={() => onEdit(msg)} className={`p-1.5 rounded-lg transition-colors ${theme === 'black' ? 'hover:bg-[#222] text-gray-400 hover:text-cyan-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-500'}`} title="Edit"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                                            <button onClick={() => { if(window.confirm('Delete message?')) socket.emit('delete message', msg.id); }} className={`p-1.5 rounded-lg transition-colors ${theme === 'black' ? 'hover:bg-rose-950/50 text-gray-400 hover:text-rose-500' : 'hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-500 hover:text-rose-500'}`} title="Delete"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {msg.reactions && msg.reactions.length > 0 && !isDeleted && (
                                            <div className={`absolute -bottom-3 ${isMe ? 'right-4' : 'left-4'} flex flex-wrap gap-1 z-10 max-w-[200px]`}>
                                                {Array.from(new Set(msg.reactions)).map(emoji => {
                                                    const usersReacted = msg.reaction_users.filter((_, i) => msg.reactions[i] === emoji);
                                                    const count = msg.reactions.filter(r => r === emoji).length;
                                                    const iReacted = usersReacted.includes(currentUser.username);
                                                    return (
                                                        <button key={emoji} onClick={() => socket.emit('add reaction', { messageId: msg.id, emoji })} title={usersReacted.join(', ')} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${iReacted ? (theme === 'black' ? 'bg-[#222] border-cyan-500/50 text-cyan-400' : 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400') : (theme === 'black' ? 'bg-[#111] border-[#333] text-gray-400 hover:border-cyan-500/50' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300')}`}>
                                                            <span>{emoji}</span><span>{count}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
}

export default MessageList;