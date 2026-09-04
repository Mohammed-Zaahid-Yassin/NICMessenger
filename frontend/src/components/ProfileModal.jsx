import React, { useState, useEffect, useRef } from 'react';

const CLUB_STRUCTURE = {
    "Tech": ["Team Lead", "Sub-Lead", "Member"],
    "Design": ["Team Lead", "Sub-Lead", "Member"],
    "Content": ["Team Lead", "Sub-Lead", "Member"],
    "Media": ["Team Lead", "Sub-Lead", "Member"],
    "Community": ["Lead", "Sub-Lead"],
    "Website": ["Lead"],
    "Hackathon": ["Lead"],
    "Operations": ["Event Manager", "Mentor"],
    "Executive Board": ["President", "Vice-President"]
};

function ProfileModal({ isOpen, onClose, currentUser, userId, currentAvatar, currentBio, currentStatus, currentRoles = [] }) {
    const [bio, setBio] = useState('');
    const [status, setStatus] = useState('Online');
    const [avatarFile, setAvatarFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const [roleCount, setRoleCount] = useState(0);
    const [clubRoles, setClubRoles] = useState([]);

    const fileInputRef = useRef(null);

    // FIXED: Strict dependency array. This ensures the data only initializes ONCE when the modal opens.
    // It will no longer wipe your dropdown selection when background chat events trigger.
    useEffect(() => {
        if (isOpen) {
            setBio(currentBio || '');
            setStatus(currentStatus || 'Online');
            setPreviewUrl(currentAvatar);
            
            const roles = Array.isArray(currentRoles) ? currentRoles : [];
            setClubRoles(roles);
            setRoleCount(roles.length);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]); 

    const handleRoleCountChange = (e) => {
        const count = parseInt(e.target.value, 10);
        setRoleCount(count);
        
        let newRoles = [...clubRoles];
        if (count > newRoles.length) {
            while (newRoles.length < count) newRoles.push({ team: '', post: '' });
        } else {
            newRoles = newRoles.slice(0, count);
        }
        setClubRoles(newRoles);
    };

    const updateRole = (index, field, value) => {
        const newRoles = [...clubRoles];
        newRoles[index][field] = value;
        if (field === 'team') newRoles[index].post = ''; // Reset post when team changes
        setClubRoles(newRoles);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        const safeRoles = clubRoles.filter(r => r.team && r.post);

        try {
            if (avatarFile) {
                const formData = new FormData();
                formData.append('avatar', avatarFile);
                formData.append('userId', userId);
                await fetch('http://localhost:4000/api/profile/avatar', { method: 'POST', body: formData });
            }

            await fetch('http://localhost:4000/api/profile/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, bio, status, clubRoles: safeRoles })
            });

            onClose();
        } catch (error) {
            alert('Error updating profile');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                    <h2 className="text-lg font-black text-cyan-400 uppercase tracking-widest">Update Profile</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form id="profileForm" onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center">
                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-indigo-500 bg-slate-800 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white bg-indigo-600">
                                            {currentUser?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-xs font-bold uppercase tracking-wider">Change</span>
                                </div>
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                            <h3 className="mt-3 text-xl font-bold text-white">{currentUser}</h3>
                        </div>

                        {/* Basic Info */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 text-sm appearance-none">
                                    <option value="Online">🟢 Online</option>
                                    <option value="Away">🟡 Away</option>
                                    <option value="Do Not Disturb">🔴 Do Not Disturb</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bio / Tagline</label>
                                <input type="text" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What's your current project?" className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 text-sm" />
                            </div>
                        </div>

                        {/* Dynamic Club Roles Section */}
                        <div className="pt-4 border-t border-slate-800">
                            <div className="flex justify-between items-center mb-4">
                                <label className="block text-xs font-black text-indigo-400 uppercase tracking-wider">Club Roles</label>
                                <select 
                                    value={roleCount} 
                                    onChange={handleRoleCountChange} 
                                    className="bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer text-center"
                                >
                                    <option value={0}>0 Teams</option>
                                    {[1, 2, 3, 4].map(num => (
                                        <option key={num} value={num}>{num} {num === 1 ? 'Team' : 'Teams'}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-3">
                                {clubRoles.map((role, index) => (
                                    <div key={index} className="flex gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                                        <select 
                                            value={role.team || ''} 
                                            onChange={(e) => updateRole(index, 'team', e.target.value)}
                                            className="flex-1 bg-transparent text-white text-xs focus:outline-none border-b border-slate-700 pb-1 cursor-pointer"
                                        >
                                            <option value="" disabled className="text-slate-500">Select Team...</option>
                                            {Object.keys(CLUB_STRUCTURE).map(team => (
                                                <option key={team} value={team} className="bg-slate-900">{team}</option>
                                            ))}
                                        </select>
                                        
                                        <select 
                                            value={role.post || ''} 
                                            onChange={(e) => updateRole(index, 'post', e.target.value)}
                                            disabled={!role.team}
                                            className="flex-1 bg-transparent text-white text-xs focus:outline-none border-b border-slate-700 pb-1 disabled:opacity-50 cursor-pointer"
                                        >
                                            <option value="" disabled>Select Post...</option>
                                            {role.team && CLUB_STRUCTURE[role.team]?.map(post => (
                                                <option key={post} value={post} className="bg-slate-900">{post}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-5 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-colors">Cancel</button>
                    <button type="submit" form="profileForm" disabled={isSaving} className="px-6 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-all disabled:opacity-50 flex items-center gap-2">
                        {isSaving ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>

            </div>
        </div>
    );
}

export default ProfileModal;