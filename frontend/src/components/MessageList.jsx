import React from 'react';

function MessageList({ messages, currentUser, userRole, onDeleteMessage }) {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter out deleted messages
  const visibleMessages = messages.filter(msg => !msg.is_deleted);

  if (visibleMessages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-400">
          <p className="text-4xl mb-3">💬</p>
          <p>No messages yet</p>
          <p className="text-sm">Say hello to the group!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {visibleMessages.map((msg, index) => {
        const isSystem = msg.isSystem;
        const isOwn = msg.username === currentUser && !isSystem;
        const isAdmin = userRole === 'admin';

        if (isSystem) {
          return (
            <div key={index} className="text-center text-sm text-gray-500 py-2 px-4">
              <span className="bg-gray-200 px-4 py-1 rounded-full">
                {msg.content}
              </span>
            </div>
          );
        }

        return (
          <div key={msg.id || index} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
            <div className={`max-w-xs lg:max-w-md ${isOwn ? 'bg-nic-blue text-white' : 'bg-white'} rounded-2xl px-4 py-2 shadow-md relative`}>
              {!isOwn && (
                <div className="text-xs font-semibold text-nic-blue mb-1">
                  {msg.username}
                </div>
              )}
              <div className="break-words">{msg.content}</div>
              <div className={`text-[10px] mt-1 text-right ${isOwn ? 'text-blue-100' : 'text-gray-400'}`}>
                {formatTime(msg.timestamp)}
              </div>
              
              {/* Delete button for admins */}
              {isAdmin && (
                <button
                  onClick={() => {
                    if (window.confirm('Delete this message?')) {
                      onDeleteMessage(msg.id);
                    }
                  }}
                  className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-600 transition"
                  title="Delete message"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default MessageList;