import React, { useState, useEffect, useRef } from 'react';

const CLUB_STRUCTURE = {
    "Tech": ["Team Lead", "Sub-Lead", "Member"],
    "Design": ["Team Lead", "Sub-Lead", "Member"],
    "Content": ["Team Lead", "Sub-Lead", "Member"],
    "Media": ["Team Lead", "Sub-Lead", "Member"],
    "Community": ["Lead", "Sub-Lead"],
    "Website": ["Lead"],
    "Hackathon": ["Lead"],
    "Operations": ["Event Manager"], 
    "Executive Board": ["President", "Vice-President", "Mentor"] 
};

function SettingsModal({ 
    isOpen, onClose, activeTab, setActiveTab, 
    currentUser, userId, currentAvatar, currentBio, currentStatus, currentRoles = [], 
    theme, setTheme, users = [], canManageTasks = false 
}) {
    // Profile States
    const [bio, setBio] = useState('');
    const [status, setStatus] = useState('Online');
    const [avatarFile, setAvatarFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Team Management States
    const [targetMember, setTargetMember] = useState(null);
    const [roleCount, setRoleCount] = useState(0);
    const [clubRoles, setClubRoles] = useState([]);

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setBio(currentBio || '');
            setStatus(currentStatus || 'Online');
            setPreviewUrl(currentAvatar);
            setTargetMember(null);
        }
    }, [isOpen, currentBio, currentStatus, currentAvatar]); 

    // Handle Team Management Selection
    const selectMemberForEditing = (member) => {
        setTargetMember(member);
        const roles = member.club_roles || [];
        setClubRoles(roles);
        setRoleCount(roles.length);
    };

    const handleRoleCountChange = (e) => {
        const count = parseInt(e.target.value, 10);
        setRoleCount(count);
        setClubRoles(prevRoles => {
            let newRoles = [...prevRoles];
            if (count > newRoles.length) {
                while (newRoles.length < count) newRoles.push({ team: '', post: '' });
            } else {
                newRoles = newRoles.slice(0, count);
            }
            return newRoles;
        });
    };

    const updateRole = (index, field, value) => {
        setClubRoles(prevRoles => {
            const newRoles = [...prevRoles];
            newRoles[index][field] = value;
            if (field === 'team') newRoles[index].post = ''; 
            return newRoles;
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
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
                body: JSON.stringify({ userId, bio, status, clubRoles: currentRoles }) // Normal users keep existing roles
            });
            onClose();
        } catch (error) { alert('Error updating profile'); } 
        finally { setIsSaving(false); }
    };

    const handleRolesSubmit = async () => {
        if (!targetMember) return;
        setIsSaving(true);
        const safeRoles = clubRoles.filter(r => r.team && r.post);
        try {
            await fetch('http://localhost:4000/api/profile/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: targetMember.id, bio: targetMember.bio, status: targetMember.status, clubRoles: safeRoles })
            });
            setTargetMember(null);
        } catch (error) { alert('Error updating roles'); } 
        finally { setIsSaving(false); }
    };

    if (!isOpen) return null;

    const modalBg = theme === 'black' ? 'bg-[#0a0a0a] border-[#222]' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700';
    const sidebarBg = theme === 'black' ? 'bg-[#050505] border-[#1a1a1a]' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800';
    const inputBg = theme === 'black' ? 'bg-[#111] border-[#333] focus:border-cyan-500 text-white' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-indigo-500';
    const textBase = theme === 'black' ? 'text-gray-300' : 'text-slate-800 dark:text-slate-200';

    return (
        <div className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${textBase}`}>
            <div className={`w-[750px] h-[550px] flex rounded-2xl shadow-2xl overflow-hidden border ${modalBg}`}>
                
                {/* SIDEBAR */}
                <div className={`w-1/4 p-4 flex flex-col gap-2 border-r ${sidebarBg}`}>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-2 mt-2">Settings</h3>
                    
                    <button onClick={() => setActiveTab('profile')} className={`text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'profile' ? (theme === 'black' ? 'bg-[#1a1a1a] text-cyan-400 border border-[#333]' : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400') : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span>👤</span> Profile
                    </button>
                    
                    <button onClick={() => setActiveTab('theme')} className={`text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'theme' ? (theme === 'black' ? 'bg-[#1a1a1a] text-cyan-400 border border-[#333]' : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400') : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span>🎨</span> Theme Engine
                    </button>

                    {/* NEW: TEAM MANAGEMENT SECURE TAB */}
                    {canManageTasks && (
                        <>
                            <div className="my-2 border-b border-slate-200 dark:border-slate-700/50"></div>
                            <h3 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 px-2">Admin</h3>
                            <button onClick={() => setActiveTab('team')} className={`text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'team' ? (theme === 'black' ? 'bg-[#1a1a1a] text-emerald-400 border border-[#333]' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400') : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}>
                                <span>🛡️</span> Manage Team
                            </button>
                        </>
                    )}
                </div>

                <div className="w-3/4 flex flex-col relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-500 transition-colors z-20">✕</button>
                    
                    {/* TAB: PROFILE (Locked down roles) */}
                    {activeTab === 'profile' && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                <h2 className={`text-xl font-bold mb-6 ${theme === 'black' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>Profile Settings</h2>
                                
                                <form id="profileForm" onSubmit={handleProfileSubmit} className="space-y-6">
                                    <div className="flex flex-col items-center mb-6">
                                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-indigo-500 bg-slate-800 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                                                {previewUrl ? <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white bg-indigo-600">{currentUser?.charAt(0).toUpperCase()}</div>}
                                            </div>
                                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white text-xs font-bold uppercase tracking-wider">Change</span></div>
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                        <h3 className={`mt-3 text-xl font-bold ${theme === 'black' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{currentUser}</h3>
                                        
                                        {/* Read-Only Role Badges */}
                                        <div className="flex flex-wrap justify-center gap-2 mt-3">
                                            {currentRoles.length > 0 ? currentRoles.map((role, i) => (
                                                <span key={i} className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                                    {role.team} {role.post}
                                                </span>
                                            )) : <span className="text-xs text-slate-500 italic">No official roles assigned.</span>}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                                            <select value={status} onChange={(e) => setStatus(e.target.value)} className={`w-full rounded-xl px-4 py-3 focus:outline-none text-sm appearance-none border ${inputBg}`}>
                                                <option value="Online">🟢 Online</option><option value="Away">🟡 Away</option><option value="Do Not Disturb">🔴 Do Not Disturb</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bio / Tagline</label>
                                            <input type="text" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What's your current project?" className={`w-full rounded-xl px-4 py-3 focus:outline-none text-sm border ${inputBg}`} />
                                        </div>
                                    </div>
                                </form>
                            </div>
                            
                            <div className={`p-5 border-t flex justify-end gap-3 ${sidebarBg}`}>
                                <button type="button" onClick={onClose} className={`px-5 py-2 rounded-xl font-bold transition-colors ${theme === 'black' ? 'text-gray-400 hover:bg-[#222]' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>Cancel</button>
                                <button type="submit" form="profileForm" disabled={isSaving} className={`px-6 py-2 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 ${theme === 'black' ? 'bg-cyan-600 hover:bg-cyan-500 text-black' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                                    {isSaving ? 'Saving...' : 'Save Profile'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB: TEAM MANAGEMENT (Admin/Leads Only) */}
                    {activeTab === 'team' && canManageTasks && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {!targetMember ? (
                                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                    <h2 className={`text-xl font-bold mb-6 ${theme === 'black' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>Select User to Manage</h2>
                                    <div className="space-y-2">
                                        {users.filter(u => u.username !== 'admin').map(user => (
                                            <div key={user.id} onClick={() => selectMemberForEditing(user)} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-colors ${theme === 'black' ? 'bg-[#111] border-[#333] hover:border-emerald-500' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-emerald-500'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-300 dark:bg-slate-700 flex items-center justify-center font-bold text-white overflow-hidden">
                                                        {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : user.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-bold text-sm">{user.username}</span>
                                                </div>
                                                <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Edit Roles ➔</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                        <button onClick={() => setTargetMember(null)} className="text-xs font-bold text-slate-500 hover:text-emerald-500 uppercase tracking-wider mb-6 flex items-center gap-1">
                                            ← Back to Roster
                                        </button>
                                        <h2 className={`text-xl font-bold mb-6 ${theme === 'black' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>Editing: {targetMember.username}</h2>
                                        
                                        <div className="flex justify-between items-center mb-4">
                                            <label className="block text-xs font-black text-emerald-500 uppercase tracking-wider">Assigned Roles</label>
                                            <select value={roleCount} onChange={handleRoleCountChange} className={`rounded-lg px-2 py-1 text-xs focus:outline-none cursor-pointer text-center border ${inputBg}`}>
                                                <option value={0}>0 Teams</option>
                                                {[1, 2, 3, 4].map(num => <option key={num} value={num}>{num} {num === 1 ? 'Team' : 'Teams'}</option>)}
                                            </select>
                                        </div>

                                        <div className="space-y-3">
                                            {clubRoles.map((role, index) => (
                                                <div key={index} className={`flex gap-2 p-3 rounded-xl border ${theme === 'black' ? 'bg-[#111] border-[#333]' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                                                    <select value={role.team || ''} onChange={(e) => updateRole(index, 'team', e.target.value)} className="flex-1 bg-transparent text-xs focus:outline-none border-b border-slate-600 pb-1 cursor-pointer text-inherit">
                                                        <option value="" disabled>Select Team...</option>
                                                        {Object.keys(CLUB_STRUCTURE).map(team => <option key={team} value={team} className="bg-slate-900 text-white">{team}</option>)}
                                                    </select>
                                                    <select value={role.post || ''} onChange={(e) => updateRole(index, 'post', e.target.value)} disabled={!role.team} className="flex-1 bg-transparent text-xs focus:outline-none border-b border-slate-600 pb-1 cursor-pointer disabled:opacity-50 text-inherit">
                                                        <option value="" disabled>Select Post...</option>
                                                        {role.team && CLUB_STRUCTURE[role.team]?.map(post => <option key={post} value={post} className="bg-slate-900 text-white">{post}</option>)}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className={`p-5 border-t flex justify-end gap-3 ${sidebarBg}`}>
                                        <button onClick={() => setTargetMember(null)} className={`px-5 py-2 rounded-xl font-bold transition-colors ${theme === 'black' ? 'text-gray-400 hover:bg-[#222]' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>Cancel</button>
                                        <button onClick={handleRolesSubmit} disabled={isSaving} className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${theme === 'black' ? 'bg-emerald-600 hover:bg-emerald-500 text-black' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}>
                                            {isSaving ? 'Saving...' : 'Confirm Authorization'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: THEME ENGINE */}
                    {activeTab === 'theme' && (
                        <div className="flex-1 p-8">
                            <h2 className={`text-xl font-bold mb-6 ${theme === 'black' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>Theme Engine</h2>
                            <div className="space-y-3">
                                <button onClick={() => setTheme('light')} className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${theme === 'light' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>☀️ Light Mode</button>
                                <button onClick={() => setTheme('dark')} className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${theme === 'dark' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>🌙 Dark Mode</button>
                                <button onClick={() => setTheme('black')} className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${theme === 'black' ? 'border-cyan-500 bg-[#111] text-cyan-400 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>⬛ Black Mode</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SettingsModal;