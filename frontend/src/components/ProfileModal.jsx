import React, { useState, useRef } from 'react';

function ProfileModal({ isOpen, onClose, currentUser, userId, currentAvatar, currentBio, currentStatus }) {
    const [bio, setBio] = useState(currentBio || 'Hey there! I am using NIC Messenger.');
    const [status, setStatus] = useState(currentStatus || 'Online');
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(currentAvatar || null);
    const [isUploading, setIsUploading] = useState(false);
    
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    // Handle Image Selection and Preview
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file)); // Local preview before upload
        }
    };

    // Trigger hidden file input when clicking the avatar
    const handleAvatarClick = () => {
        fileInputRef.current.click();
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsUploading(true);

        try {
            // 1. Upload Avatar if a new file was selected
            if (selectedFile) {
                const formData = new FormData();
                formData.append('avatar', selectedFile);
                formData.append('userId', userId);

                const avatarRes = await fetch('http://localhost:4000/api/profile/avatar', {
                    method: 'POST',
                    body: formData, // Notice: No Content-Type header when sending FormData
                });
                
                const avatarData = await avatarRes.json();
                if (!avatarRes.ok) throw new Error(avatarData.error || 'Avatar upload failed');
            }

            // 2. Update Bio and Status
            const profileRes = await fetch('http://localhost:4000/api/profile/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, bio, status })
            });

            if (!profileRes.ok) throw new Error('Profile update failed');

            // Close modal on success (Socket.IO will handle updating the UI for everyone)
            onClose();
        } catch (error) {
            console.error("❌ Error saving profile:", error);
            alert("Failed to save profile. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-[#1f2937] border border-gray-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-gray-700 bg-[#111827]">
                    <h2 className="text-xl font-semibold text-white">Edit Profile</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSave} className="p-6 space-y-6">
                    
                    {/* Avatar Upload Section */}
                    <div className="flex flex-col items-center">
                        <div 
                            onClick={handleAvatarClick}
                            className="relative w-24 h-24 rounded-full border-2 border-indigo-500 overflow-hidden cursor-pointer group bg-gray-800 flex items-center justify-center"
                        >
                            {previewUrl ? (
                                <img src={previewUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold text-indigo-400">
                                    {currentUser ? currentUser.charAt(0).toUpperCase() : '?'}
                                </span>
                            )}
                            
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                        </div>
                        <input 
                            type="file" 
                            accept="image/png, image/jpeg, image/webp" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                        />
                        <p className="text-gray-400 text-sm mt-3">Click picture to change avatar</p>
                    </div>

                    {/* Username (Read Only) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                        <input 
                            type="text" 
                            value={currentUser} 
                            disabled 
                            className="w-full bg-gray-800 text-gray-500 border border-gray-700 rounded-lg p-2.5 cursor-not-allowed"
                        />
                    </div>

                    {/* Status Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                        <select 
                            value={status} 
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        >
                            <option value="Online">🟢 Online</option>
                            <option value="Away">🟡 Away</option>
                            <option value="Do Not Disturb">🔴 Do Not Disturb</option>
                            <option value="Invisible">⚫ Invisible</option>
                        </select>
                    </div>

                    {/* Bio Textarea */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">About Me</label>
                        <textarea 
                            value={bio} 
                            onChange={(e) => setBio(e.target.value)}
                            maxLength={120}
                            rows={3}
                            className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                            placeholder="Tell people about yourself..."
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isUploading}
                            className={`flex-1 font-medium py-2.5 rounded-lg transition-colors text-white ${isUploading ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            {isUploading ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}

export default ProfileModal;