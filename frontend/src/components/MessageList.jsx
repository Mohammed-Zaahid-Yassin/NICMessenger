import React, { useState } from 'react';
import EmojiPicker from 'emoji-picker-react';

function MessageList({ messages, currentUser, userRole, onDeleteMessage, addReaction, startReply, onEditMessage }) {
  const [showPickerFor, setShowPickerFor] = useState(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState('');

  const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const groupMessagesByDate = (msgs) => {
    const groups = [];
    let currentDate = '';
    msgs.forEach(msg => {
      const msgDate = formatDate(msg.timestamp);
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    });
    return groups;
  };

  const canModifyMessage = (msg) => {
    if (!msg || !msg.timestamp || msg.is_deleted) return false;
    if (userRole === 'admin') return true;
    if (msg.username !== currentUser) return false;
    const safeTimestamp = msg.timestamp.includes('Z') ? msg.timestamp : msg.timestamp.replace(' ', 'T') + 'Z';
    return ((Date.now() - new Date(safeTimestamp).getTime()) / (1000 * 60)) <= 15;
  };

  const visibleMessages = messages.filter(msg => !msg.is_deleted);
  const groupedMessages = groupMessagesByDate(visibleMessages);

  const handleEditSubmit = (messageId) => {
    if (onEditMessage && editContent.trim()) onEditMessage(messageId, editContent.trim());
    setEditingMessageId(null);
    setEditContent('');
  };

  if (visibleMessages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Welcome to #general</h3>
        <p className="text-sm mt-1">This is the start of the conversation.</p>
      </div>
    );
  }

  return (
    <div className="py-4">
      {groupedMessages.map((group, groupIndex) => (
        <div key={groupIndex}>
          
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-200 dark:border-gray-800"></div>
            <span className="px-4 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {group.date}
            </span>
            <div className="flex-1 border-t border-gray-200 dark:border-gray-800"></div>
          </div>

          <div className="space-y-1">
            {group.messages.map((msg, index) => {
              
              const isFirstInSequence = index === 0 || group.messages[index - 1].username !== msg.username || (new Date(msg.timestamp).getTime() - new Date(group.messages[index - 1].timestamp).getTime() > 300000);
              const isHovered = hoveredMessage === msg.id;
              
              const reactionGroups = {};
              if (msg.reactions?.length > 0) {
                msg.reactions.forEach((emoji, idx) => {
                  if (!reactionGroups[emoji]) reactionGroups[emoji] = { count: 0, users: [] };
                  reactionGroups[emoji].count++;
                  if (msg.reaction_users?.[idx]) reactionGroups[emoji].users.push(msg.reaction_users[idx]);
                });
              }

              return (
                <div 
                  key={msg.id} 
                  className={`group relative flex px-6 py-1 ${isHovered ? 'bg-gray-50 dark:bg-[#252529]' : ''} ${isFirstInSequence ? 'mt-4' : ''}`}
                  onMouseEnter={() => setHoveredMessage(msg.id)}
                  onMouseLeave={() => setHoveredMessage(null)}
                >
                  {/* Left Side: Avatar Placeholder or Timestamp for consecutive messages */}
                  <div className="w-10 flex-shrink-0 mr-3 mt-0.5">
                    {isFirstInSequence ? (
                      <div className="w-9 h-9 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-sm uppercase">
                        {msg.username.substring(0, 2)}
                      </div>
                    ) : (
                      <div className={`text-[10px] text-gray-400 text-right pr-2 opacity-0 group-hover:opacity-100 transition-opacity mt-1`}>
                        {formatTime(msg.timestamp)}
                      </div>
                    )}
                  </div>

                  {/* Right Side: Message Content */}
                  <div className="flex-1 min-w-0 pb-1">
                    {isFirstInSequence && (
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="font-medium text-[15px] text-gray-900 dark:text-gray-100">{msg.username}</span>
                        <span className="text-xs text-gray-500">{formatTime(msg.timestamp)}</span>
                      </div>
                    )}

                    {msg.is_deleted ? (
                      <div className="text-gray-500 italic text-[15px] flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Message deleted
                      </div>
                    ) : (
                      <div>
                        {msg.reply_to && (
                          <div className="flex items-center gap-2 text-[13px] text-gray-500 mb-1 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                            <span className="font-medium">{msg.reply_to_username}</span>
                            <span className="truncate max-w-sm">{msg.reply_to_content}</span>
                          </div>
                        )}
                        
                        {editingMessageId === msg.id ? (
                          <div className="mt-1 max-w-3xl">
                            <input
                              type="text"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full px-3 py-2 text-[15px] bg-white dark:bg-[#1e1e21] border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
                              autoFocus
                              /* FIX: Added e.preventDefault() to stop silent state wiping */
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); handleEditSubmit(msg.id); }
                                if (e.key === 'Escape') { e.preventDefault(); setEditingMessageId(null); }
                              }}
                            />
                            <div className="text-[11px] text-gray-500 mt-1">escape to cancel • enter to save</div>
                          </div>
                        ) : (
                          <div className="text-[15px] text-gray-800 dark:text-gray-200 leading-normal break-words">
                            {msg.content}
                            {Boolean(msg.edited) && <span className="text-xs text-gray-400 ml-2 font-normal">(edited)</span>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reactions array */}
                    {!msg.is_deleted && Object.keys(reactionGroups).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {Object.entries(reactionGroups).map(([emoji, data]) => (
                          <button
                            key={emoji}
                            onClick={() => addReaction(msg.id, emoji)}
                            className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[11px] font-medium border transition ${
                              data.users.includes(currentUser) 
                                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400' 
                                : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                            title={data.users.join(', ')}
                          >
                            <span>{emoji}</span><span>{data.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Hover Action Menu (Replaces Emojis with SVGs) */}
                  {!msg.is_deleted && isHovered && !editingMessageId && (
                    <div className="absolute top-[-12px] right-6 flex items-center bg-white dark:bg-[#202024] border border-gray-200 dark:border-gray-700 rounded shadow-sm overflow-hidden z-10">
                      <button onClick={() => setShowPickerFor(msg.id)} className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition" title="Add reaction">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </button>
                      <button onClick={() => startReply(msg)} className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition" title="Reply">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                      </button>
                      {canModifyMessage(msg) && (
                        <>
                          <button onClick={() => { setEditingMessageId(msg.id); setEditContent(msg.content); }} className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition" title="Edit message">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => { if(window.confirm('Delete this message?')) onDeleteMessage(msg.id); }} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition" title="Delete message">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Center-screen Modal Emoji Picker */}
                  {showPickerFor === msg.id && !msg.is_deleted && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                      <div className="absolute inset-0 bg-black/50" onClick={() => setShowPickerFor(null)}></div>
                      <div className="relative bg-white dark:bg-gray-800 p-1 rounded-lg shadow-2xl">
                        <EmojiPicker onEmojiClick={(emoji) => { addReaction(msg.id, emoji.emoji); setShowPickerFor(null); }} theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'} previewConfig={{ showPreview: false }} height={350} width={300} />
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MessageList;