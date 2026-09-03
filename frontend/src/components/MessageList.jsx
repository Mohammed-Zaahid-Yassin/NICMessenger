import React, { useState } from 'react';

function MessageList({ messages = [], currentUser, socket, onReply, onEdit, searchQuery = '', theme }) {
    const [hoveredMessage, setHoveredMessage] = useState(null);
    const [showReactionPicker, setShowReactionPicker] = useState(null);

    const QUICK_EMOJIS = ['👍', '👎', '❤️', '😂', '😭', '🥺', '🤯', '🔥', '✨', '💯', '🚀', '👀'];

    const formatDateLabel = (dateString) => {
        const date = new Date(dateString || Date.now());
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    };

    const groupedMessages = messages.reduce((groups, msg) => {
        const dateLabel = formatDateLabel(msg.timestamp);
        if (!groups[dateLabel]) groups[dateLabel] = [];
        groups[dateLabel].push(msg);
        return groups;
    }, {});

    const renderFormattedText = (text) => {
        if (!text) return '';
        let htmlText = text
            .replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/@(\w+)/g, (match, username) => {
                const isMe = username === currentUser.username;
                const mentionClass = theme === 'black' ? 'text-cyan-400 font-bold drop-shadow-[0_0_2px_rgba(6,182,212,0.8)]' : (isMe ? 'text-white underline decoration-white/50 underline-offset-2' : 'text-indigo-500 dark:text-indigo-400 font-bold');
                return `<span class="${mentionClass} cursor-pointer">${match}</span>`;
            })
            .replace(/`(.*?)`/g, `<code class="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${theme === 'black' ? 'bg-[#1a1a1a] text-emerald-400 border border-[#333]' : 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700'}">$1</code>`)
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="italic opacity-90">$1</em>');

        if (searchQuery.trim()) {
            const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escaped})`, 'gi');
            htmlText = htmlText.replace(regex, `<mark class="${theme === 'black' ? 'bg-cyan-500 text-black' : 'bg-amber-400 text-amber-950'} px-1 rounded-sm shadow-sm font-semibold">$1</mark>`);
        }
        return <span dangerouslySetInnerHTML={{ __html: htmlText }} />;
    };

    const handleAddReaction = (messageId, emoji) => {
        socket.emit('add reaction', { messageId, emoji });
        setShowReactionPicker(null);
    };

    const handleDelete = (messageId) => {
        if (window.confirm("Purge this data log?")) socket.emit('delete message', messageId);
    };

    const groupReactions = (emojisArray, usersArray) => {
        if (!emojisArray || !Array.isArray(emojisArray)) return {};
        const grouped = {};
        emojisArray.forEach((emoji, index) => {
            if (!grouped[emoji]) grouped[emoji] = { count: 0, users: [] };
            grouped[emoji].count += 1;
            const user = (usersArray && usersArray[index]) ? usersArray[index] : 'Someone';
            if (!grouped[emoji].users.includes(user)) grouped[emoji].users.push(user);
        });
        return grouped;
    };

    const myLastReadMessage = messages.slice().reverse().find(m => 
        Number(m.user_id) === Number(currentUser?.id) && m.recipient_id && (m.is_read === 1 || m.is_read === true)
    );return (
        <div className="flex flex-col space-y-6 pb-4">
            {Object.keys(groupedMessages).map((dateLabel) => (
                <div key={dateLabel} className="flex flex-col space-y-4">
                    <div className="flex items-center justify-center my-6 relative">
                        <div className="absolute inset-0 flex items-center"><div className={`w-full h-px ${theme === 'black' ? 'bg-[#1a1a1a]' : 'bg-slate-200 dark:bg-slate-800'}`}></div></div>
                        <div className={`relative px-4 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full backdrop-blur-md ${theme === 'black' ? 'bg-[#000] text-gray-600 border border-[#1a1a1a]' : 'bg-slate-50 dark:bg-[#0f172a] text-slate-400 dark:text-slate-500 border border-transparent'}`}>
                            {dateLabel}
                        </div>
                    </div>

                    {groupedMessages[dateLabel].map((msg) => {
                        const isMyMessage = Number(msg.user_id) === Number(currentUser?.id);
                        const isAdmin = currentUser?.role === 'admin';
                        const safeTimestamp = String(msg.timestamp || '').includes('Z') ? msg.timestamp : (msg.timestamp || '').replace(' ', 'T') + 'Z';
                        const diffMinutes = (Date.now() - new Date(safeTimestamp).getTime()) / (1000 * 60);
                        const canModify = isAdmin || (isMyMessage && diffMinutes <= 15);
                        
                        return (
                            <div key={msg.id || msg.timestamp} className="flex flex-col">
                                <div 
                                    className={`flex gap-4 group ${isMyMessage ? 'flex-row-reverse' : ''}`}
                                    onMouseEnter={() => setHoveredMessage(msg.id)}
                                    onMouseLeave={() => { setHoveredMessage(null); setShowReactionPicker(null); }}
                                >
                                    <div className="flex-shrink-0 mt-auto mb-1">
                                        {msg.avatar_url ? (
                                            <img src={msg.avatar_url} alt={msg.username} className={`w-9 h-9 rounded-xl object-cover shadow-sm ${theme === 'black' ? 'ring-1 ring-white/10' : 'ring-1 ring-slate-500/20'}`} />
                                        ) : (
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-sm ${theme === 'black' ? 'bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700' : 'bg-gradient-to-br from-indigo-500 to-indigo-600'}`}>
                                                {msg.username?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                        )}
                                    </div>
                                    <div className={`flex flex-col max-w-[75%] ${isMyMessage ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-baseline gap-2 mb-1 px-1">
                                            <span className={`font-bold text-[13px] tracking-wide ${isMyMessage ? (theme === 'black' ? 'text-cyan-500 drop-shadow-[0_0_5px_rgba(6,182,212,0.6)]' : 'text-indigo-500 dark:text-indigo-400') : (theme === 'black' ? 'text-gray-300' : 'text-slate-700 dark:text-slate-300')}`}>
                                                {msg.username}
                                            </span>
                                            <span className={`text-[9px] font-mono font-medium ${theme === 'black' ? 'text-gray-600' : 'text-slate-400 dark:text-slate-500'}`}>
                                                {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        <div className="relative flex items-center">
                                            {!msg.is_deleted && hoveredMessage === msg.id && (
                                                <div className={`absolute -top-5 flex items-center gap-1 border rounded-xl p-1 shadow-lg z-20 transition-all backdrop-blur-xl ${theme === 'black' ? 'bg-[#0a0a0a]/80 border-[#222]' : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'} ${isMyMessage ? 'right-full mr-2' : 'left-full ml-2'}`}>
                                                    <div className="relative">
                                                        <button onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)} className={`p-1.5 rounded-lg transition-colors ${theme === 'black' ? 'text-gray-400 hover:text-amber-400 hover:bg-[#1a1a1a]' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                                            😀
                                                        </button>
                                                        {showReactionPicker === msg.id && (
                                                            <div className={`absolute top-10 left-1/2 -translate-x-1/2 border rounded-2xl p-2 shadow-2xl z-50 w-64 backdrop-blur-3xl ${theme === 'black' ? 'bg-[#111]/90 border-[#333]' : 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700'}`}>
                                                                <div className="grid grid-cols-6 gap-1">
                                                                    {QUICK_EMOJIS.map(emoji => (
                                                                        <button key={emoji} onClick={() => handleAddReaction(msg.id, emoji)} className={`p-2 rounded-xl text-lg transition-transform hover:scale-110 flex items-center justify-center ${theme === 'black' ? 'hover:bg-[#222]' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                                                            {emoji}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button onClick={() => onReply(msg)} className={`p-1.5 rounded-lg transition-colors ${theme === 'black' ? 'text-gray-400 hover:text-cyan-400 hover:bg-[#1a1a1a]' : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                                    </button>

                                                    {canModify && (
                                                        <>
                                                            <button onClick={() => onEdit(msg)} className={`p-1.5 rounded-lg transition-colors ${theme === 'black' ? 'text-gray-400 hover:text-emerald-400 hover:bg-[#1a1a1a]' : 'text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                            </button>
                                                            <button onClick={() => handleDelete(msg.id)} className={`p-1.5 rounded-lg transition-colors ${theme === 'black' ? 'text-gray-400 hover:text-rose-500 hover:bg-[#1a1a1a]' : 'text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            <div className={`relative px-4 py-3 shadow-sm text-[14px] leading-relaxed backdrop-blur-sm ${
                                                msg.is_deleted ? `border rounded-2xl text-sm italic ${theme === 'black' ? 'bg-[#111] border-[#222] text-gray-600' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400'}` : 
                                                isMyMessage ? (theme === 'black' ? 'bg-[#0a0a0a] border border-[#222] text-gray-200 rounded-2xl rounded-br-sm shadow-[0_0_10px_rgba(6,182,212,0.1)]' : 'bg-indigo-600 text-white rounded-2xl rounded-br-sm shadow-indigo-500/20') : 
                                                `border rounded-2xl rounded-bl-sm ${theme === 'black' ? 'bg-[#050505] border-[#1a1a1a] text-gray-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200'}`
                                            }`}>
                                                {msg.reply_to_content && (
                                                    <div className={`text-xs pl-3 py-1.5 mb-2 border-l-2 rounded-r-sm bg-black/5 dark:bg-white/5 ${isMyMessage ? (theme === 'black' ? 'border-cyan-500 text-cyan-400' : 'border-indigo-300 text-indigo-100') : (theme === 'black' ? 'border-gray-600 text-gray-400' : 'border-indigo-500 text-slate-500 dark:text-slate-400')}`}>
                                                        <span className="font-bold tracking-wide">{msg.reply_to_username}</span>
                                                        <p className="opacity-90 truncate max-w-xs">{msg.reply_to_content}</p>
                                                    </div>
                                                )}

                                                {msg.image_url && !msg.is_deleted && (
                                                    <div className="mb-2 mt-1">
                                                        <img src={msg.image_url} alt="Attachment" onClick={() => window.open(msg.image_url, '_blank')} className="max-w-[240px] max-h-[240px] rounded-xl object-cover ring-1 ring-black/20 shadow-sm hover:opacity-90 cursor-zoom-in transition-opacity" />
                                                    </div>
                                                )}

                                                {msg.content && (
                                                    <div className="break-words whitespace-pre-wrap font-medium">
                                                        {renderFormattedText(msg.content)}
                                                    </div>
                                                )}
                                                
                                                {(msg.edited === 1 || msg.edited === true) && !msg.is_deleted && (
                                                    <div className="flex justify-end mt-1">
                                                        <span className="text-[10px] opacity-50 font-bold uppercase tracking-wider">(edited)</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {msg.reactions && msg.reactions.length > 0 && !msg.is_deleted && (
                                            <div className={`flex flex-wrap gap-1.5 mt-2 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                                                {Object.entries(groupReactions(msg.reactions, msg.reaction_users)).map(([emoji, data]) => (
                                                    <button key={emoji} onClick={() => handleAddReaction(msg.id, emoji)} title={data.users.join(', ')} className={`flex items-center gap-1.5 border rounded-full px-2 py-0.5 text-xs transition-all shadow-sm ${data.users.includes(currentUser.username) ? (theme === 'black' ? 'bg-[#1a1a1a] border-cyan-900/50 text-cyan-400 shadow-[inset_0_0_8px_rgba(6,182,212,0.2)]' : 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300') : (theme === 'black' ? 'bg-[#0a0a0a] border-[#222] text-gray-500 hover:bg-[#1a1a1a]' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700')}`}>
                                                        <span>{emoji}</span>
                                                        <span className="font-bold opacity-80">{data.count}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {msg.id === myLastReadMessage?.id && (
                                    <div className="flex items-center justify-end gap-3 mt-1.5 mb-2 pr-[3.25rem] opacity-80 select-none">
                                        <div className={`h-px w-10 rounded-full ${theme === 'black' ? 'bg-[#333]' : 'bg-indigo-500/50 dark:bg-indigo-400/50'}`}></div>
                                        <span className={`text-[10px] font-bold tracking-[0.2em] uppercase font-sans ${theme === 'black' ? 'text-gray-500' : 'text-indigo-600 dark:text-indigo-400'}`}>Read</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

export default MessageList;