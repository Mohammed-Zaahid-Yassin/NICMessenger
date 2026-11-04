import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';

const CLUB_STRUCTURE = {
    "Tech": ["Team Lead", "Sub-Lead", "Member"], "Design": ["Team Lead", "Sub-Lead", "Member"],
    "Content": ["Team Lead", "Sub-Lead", "Member"], "Media": ["Team Lead", "Sub-Lead", "Member"],
    "Community": ["Lead", "Sub-Lead"], "Website": ["Lead"], "Hackathon": ["Lead"],
    "Operations": ["Event Manager"], "Executive Board": ["President", "Vice-President", "Mentor"] 
};

function SettingsModal({ 
    isOpen, onClose, activeTab, setActiveTab, 
    currentUser, userId, token, currentAvatar, currentBio, currentStatus, currentRoles = [], 
    theme, setTheme, users = [], canManageTasks = false, onLogout 
}) {
    const [bio, setBio] = useState('');
    const [status, setStatus] = useState('Online');
    const [avatarFile, setAvatarFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Team Management
    const [targetMember, setTargetMember] = useState(null);
    const [roleCount, setRoleCount] = useState(0);
    const [clubRoles, setClubRoles] = useState([]);

    // Security
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [deletePassword, setDeletePassword] = useState('');

    const fileInputRef = useRef(null);

    const getAuthHeaders = () => {
        const authToken = token || localStorage.getItem('nic_messenger_token');
        return authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
    };

    useEffect(() => {
        if (isOpen) {
            setBio(currentBio || ''); setStatus(currentStatus || 'Online'); setPreviewUrl(currentAvatar);
            setTargetMember(null); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setDeletePassword('');
        }
    }, [isOpen, currentBio, currentStatus, currentAvatar]); 

    const selectMemberForEditing = (member) => {
        setTargetMember(member); const roles = member.club_roles || [];
        setClubRoles(roles); setRoleCount(roles.length);
    };

    const handleRoleCountChange = (e) => {
        const count = parseInt(e.target.value, 10);
        setRoleCount(count);
        setClubRoles(prevRoles => {
            let newRoles = [...prevRoles];
            if (count > newRoles.length) { while (newRoles.length < count) newRoles.push({ team: '', post: '' }); } 
            else { newRoles = newRoles.slice(0, count); }
            return newRoles;
        });
    };

    const updateRole = (index, field, value) => {
        setClubRoles(prevRoles => {
            const newRoles = [...prevRoles]; newRoles[index][field] = value;
            if (field === 'team') newRoles[index].post = ''; 
            return newRoles;
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) { setAvatarFile(file); setPreviewUrl(URL.createObjectURL(file)); }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault(); setIsSaving(true);
        try {
            if (avatarFile) {
                const formData = new FormData();
                formData.append('avatar', avatarFile);
                formData.append('userId', userId);
                await fetch(`${API_URL}/api/profile/avatar`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: formData
                });
            }
            const res = await fetch(`${API_URL}/api/profile/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ userId, bio, status, clubRoles: currentRoles })
            });
            if (!res.ok) throw new Error('Failed to update profile');
            onClose();
        } catch (error) { alert('Error updating profile: ' + error.message); } 
        finally { setIsSaving(false); }
    };

    const handleRolesSubmit = async () => {
        if (!targetMember) return;
        setIsSaving(true);
        const safeRoles = clubRoles.filter(r => r.team && r.post);
        try {
            const res = await fetch(`${API_URL}/api/profile/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ userId: targetMember.id, bio: targetMember.bio, status: targetMember.status, clubRoles: safeRoles })
            });
            if (!res.ok) throw new Error('Failed to update roles');
            setTargetMember(null);
        } catch (error) { alert('Error updating roles: ' + error.message); } 
        finally { setIsSaving(false); }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) return alert("New passwords do not match!");
        if (newPassword.length < 6) return alert("Password must be at least 6 characters.");
        
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/profile/password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ userId, currentPassword, newPassword })
            });
            const data = await res.json();
            if (res.ok) { 
                alert("Password updated securely."); 
                setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); 
            } else { 
                alert(data.error || "Failed to update password"); 
            }
        } catch (error) { alert("Server error"); } 
        finally { setIsSaving(false); }
    };

    const handleDeleteAccount = async (e) => {
        e.preventDefault();
        if (!window.confirm("WARNING: This will permanently delete your account, messages, and remove you from all channels. Proceed?")) return;
        
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/profile/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ userId, password: deletePassword })
            });
            const data = await res.json();
            if (res.ok) {
                alert("Account deleted.");
                onLogout(); 
            } else { 
                alert(data.error || "Failed to delete account"); 
            }
        } catch (error) { alert("Server error"); } 
        finally { setIsSaving(false); setDeletePassword(''); }
    };

    if (!isOpen) return null;

    const modalBg = theme === 'black' ? 'bg-[#0a0a0a] border-[#222]' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700';
    const sidebarBg = theme === 'black' ? 'bg-[#050505] border-[#1a1a1a]' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800';
    const inputBg = theme === 'black' ? 'bg-[#111] border-[#333] focus:border-cyan-500 text-white' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-indigo-500 text-slate-800 dark:text-slate-100';
    const textBase = theme === 'black' ? 'text-gray-300' : 'text-slate-800 dark:text-slate-200';

    return (
        <div className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4 ${textBase}`}>
            <div className={`w-full max-w-2xl h-[90vh] md:h-[550px] flex flex-col md:flex-row rounded-2xl shadow-2xl overflow-hidden border ${modalBg}`}>
                
                {/* SETTINGS TABS / SIDEBAR */}
                <div className={`w-full md:w-1/4 p-3 md:p-4 flex flex-row md:flex-col gap-1 md:gap-2 border-b md:border-b-0 md:border-r overflow-x-auto md:overflow-visible ${sidebarBg}`}>
                    <h3 className="hidden md:block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-2 mt-2">Settings</h3>
                    
                    <button onClick={() => setActiveTab('profile')} className={`text-left px-3 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === 'profile' ? (theme === 'black' ? 'bg-[#1a1a1a] text-cyan-400 border border-[#333]' : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400') : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span>👤</span> Profile
                    </button>

                    <button onClick={() => setActiveTab('theme')} className={`text-left px-3 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === 'theme' ? (theme === 'black' ? 'bg-[#1a1a1a] text-cyan-400 border border-[#333]' : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400') : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span>🎨</span> Theme
                    </button>

                    <button onClick={() => setActiveTab('security')} className={`text-left px-3 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === 'security' ? (theme === 'black' ? 'bg-[#1a1a1a] text-cyan-400 border border-[#333]' : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400') : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span>🔒</span> Security
                    </button>

                    {canManageTasks && (
                        <>
                            <div className="hidden md:block my-2 border-b border-slate-200 dark:border-slate-700/50"></div>
                            <h3 className="hidden md:block text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 px-2">Admin</h3>
                            <button onClick={() => setActiveTab('team')} className={`text-left px-3 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === 'team' ? (theme === 'black' ? 'bg-[#1a1a1a] text-emerald-400 border border-[#333]' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400') : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}>
                                <span>🛡️</span> Manage Team
                            </button>
                        </>
                    )}
                </div>

                <div className="flex-1 flex flex-col relative min-w-0">
                    <button onClick={onClose} className="absolute top-3 right-3 md:top-4 md:right-4 p-2 text-slate-400 hover:text-rose-500 transition-colors z-20 cursor-pointer" title="Close">✕</button>
                    
                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                                <h2 className={`text-lg md:text-xl font-bold mb-4 md:mb-6 ${theme === 'black' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>Profile Settings</h2>
                                <form id="profileForm" onSubmit={handleProfileSubmit} className="space-y-6">
                                    <div className="flex flex-col items-center mb-6">
                                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-indigo-500 bg-slate-800 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                                                {previewUrl ? <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white bg-indigo-600">{currentUser?.charAt(0).toUpperCase()}</div>}
                                            </div>
                                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white text-xs font-bold uppercase tracking-wider">Change</span></div>
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                        <h3 className={`mt-3 text-lg md:text-xl font-bold ${theme === 'black' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{currentUser}</h3>
                                        <div className="flex flex-wrap justify-center gap-2 mt-3">
                                            {currentRoles.length > 0 ? currentRoles.map((role, i) => <span key={i} className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">{role.team} {role.post}</span>) : <span className="text-xs text-slate-500 italic">No official roles assigned.</span>}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                                            <select value={status} onChange={(e) => setStatus(e.target.value)} className={`w-full rounded-xl px-4 py-3 focus:outline-none text-sm appearance-none border cursor-pointer ${inputBg}`}><option value="Online">🟢 Online</option><option value="Away">🟡 Away</option><option value="Do Not Disturb">🔴 Do Not Disturb</option></select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bio / Tagline</label>
                                            <input type="text" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What's your current project?" className={`w-full rounded-xl px-4 py-3 focus:outline-none text-sm border ${inputBg}`} />
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div className={`p-4 md:p-5 border-t flex justify-end gap-3 ${sidebarBg}`}>
                                <button type="button" onClick={onClose} className={`px-5 py-2 rounded-xl font-bold transition-colors cursor-pointer ${theme === 'black' ? 'text-gray-400 hover:bg-[#222]' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>Cancel</button>
                                <button type="submit" form="profileForm" disabled={isSaving} className={`px-6 py-2 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer ${theme === 'black' ? 'bg-cyan-600 hover:bg-cyan-500 text-black' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>{isSaving ? 'Saving...' : 'Save Profile'}</button>
                            </div>
                        </div>
                    )}

                    {/* SECURITY TAB */}
                    {activeTab === 'security' && (
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                            <h2 className={`text-lg md:text-xl font-bold mb-4 md:mb-6 ${theme === 'black' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>Account Security</h2>
                            
                            {/* Update Password */}
                            <form onSubmit={handlePasswordChange} className={`p-4 md:p-5 rounded-2xl border mb-6 ${theme === 'black' ? 'bg-[#111] border-[#333]' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                                <h3 className="text-sm font-bold text-indigo-500 uppercase tracking-widest mb-4">Change Password</h3>
                                <div className="space-y-4">
                                    <input type="password" placeholder="Current Password" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} required className={`w-full rounded-xl px-4 py-3 focus:outline-none text-sm border ${inputBg}`} />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <input type="password" placeholder="New Password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} required className={`w-full rounded-xl px-4 py-3 focus:outline-none text-sm border ${inputBg}`} />
                                        <input type="password" placeholder="Confirm New" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} required className={`w-full rounded-xl px-4 py-3 focus:outline-none text-sm border ${inputBg}`} />
                                    </div>
                                    <div className="flex justify-end">
                                        <button type="submit" disabled={isSaving || !currentPassword || !newPassword} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer ${theme === 'black' ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>Update Password</button>
                                    </div>
                                </div>
                            </form>

                            {/* Danger Zone */}
                            <form onSubmit={handleDeleteAccount} className={`p-4 md:p-5 rounded-2xl border ${theme === 'black' ? 'bg-rose-950/20 border-rose-900/50' : 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800/30'}`}>
                                <h3 className="text-sm font-bold text-rose-500 uppercase tracking-widest mb-2">Danger Zone</h3>
                                <p className="text-xs text-slate-500 mb-4">Permanently delete your account and all associated data. This action cannot be reversed.</p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input type="password" placeholder="Enter password to confirm" value={deletePassword} onChange={(e)=>setDeletePassword(e.target.value)} required className={`flex-1 rounded-xl px-4 py-3 focus:outline-none text-sm border ${theme === 'black' ? 'bg-[#0a0a0a] border-rose-900/50 text-rose-400 focus:border-rose-500' : 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-800 focus:border-rose-500'}`} />
                                    <button type="submit" disabled={isSaving || !deletePassword} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer`}>Delete Account</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* TEAM TAB */}
                    {activeTab === 'team' && canManageTasks && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {!targetMember ? (
                                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                                    <h2 className={`text-lg md:text-xl font-bold mb-4 md:mb-6 ${theme === 'black' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>Select User to Manage</h2>
                                    <div className="space-y-2">
                                        {users.filter(u => u.username !== 'admin').map(user => (
                                            <div key={user.id} onClick={() => selectMemberForEditing(user)} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-colors ${theme === 'black' ? 'bg-[#111] border-[#333] hover:border-emerald-500' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-emerald-500'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-300 dark:bg-slate-700 flex items-center justify-center font-bold text-white overflow-hidden">{user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : user.username.charAt(0).toUpperCase()}</div>
                                                    <span className="font-bold text-sm">{user.username}</span>
                                                </div>
                                                <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Edit Roles ➔</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                                        <button onClick={() => setTargetMember(null)} className="text-xs font-bold text-slate-500 hover:text-emerald-500 uppercase tracking-wider mb-6 flex items-center gap-1 cursor-pointer">← Back to Roster</button>
                                        <h2 className={`text-lg md:text-xl font-bold mb-6 ${theme === 'black' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>Editing: {targetMember.username}</h2>
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
                                    <div className={`p-4 md:p-5 border-t flex justify-end gap-3 ${sidebarBg}`}>
                                        <button onClick={() => setTargetMember(null)} className={`px-5 py-2 rounded-xl font-bold transition-colors cursor-pointer ${theme === 'black' ? 'text-gray-400 hover:bg-[#222]' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>Cancel</button>
                                        <button onClick={handleRolesSubmit} disabled={isSaving} className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${theme === 'black' ? 'bg-emerald-600 hover:bg-emerald-500 text-black' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}>{isSaving ? 'Saving...' : 'Confirm Authorization'}</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* THEME TAB */}
                    {activeTab === 'theme' && (
                        <div className="flex-1 p-4 md:p-8">
                            <h2 className={`text-lg md:text-xl font-bold mb-6 ${theme === 'black' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>Theme Engine</h2>
                            <div className="space-y-3">
                                <button onClick={() => setTheme('light')} className={`w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer ${theme === 'light' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>☀️ Light Mode</button>
                                <button onClick={() => setTheme('dark')} className={`w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer ${theme === 'dark' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>🌙 Dark Mode</button>
                                <button onClick={() => setTheme('black')} className={`w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer ${theme === 'black' ? 'border-cyan-500 bg-[#111] text-cyan-400 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>⬛ Black (OLED) Mode</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SettingsModal;
