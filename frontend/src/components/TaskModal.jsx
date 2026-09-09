import React, { useState, useEffect } from 'react';

const CLUB_STRUCTURE = {
    "All Teams": ["Everyone"], "Tech": ["Entire Team", "Team Lead", "Sub-Lead", "Member"],
    "Design": ["Entire Team", "Team Lead", "Sub-Lead", "Member"], "Content": ["Entire Team", "Team Lead", "Sub-Lead", "Member"],
    "Media": ["Entire Team", "Team Lead", "Sub-Lead", "Member"], "Community": ["Entire Team", "Lead", "Sub-Lead"],
    "Website": ["Entire Team", "Lead"], "Hackathon": ["Entire Team", "Lead"], "Operations": ["Entire Team", "Event Manager"], 
    "Executive Board": ["Entire Team", "President", "Vice-President", "Mentor"] 
};

function TaskModal({ isOpen, onClose, theme, createTask, editTask, username, users = [], existingTask = null }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [deadlineDate, setDeadlineDate] = useState('');
    const [deadlineTime, setDeadlineTime] = useState('');
    
    const [taskMode, setTaskMode] = useState('group'); 
    const [selectionMode, setSelectionMode] = useState('tags'); 
    const [tagMode, setTagMode] = useState('single'); 
    const [targetTeam, setTargetTeam] = useState('All Teams');
    const [targetPost, setTargetPost] = useState('Everyone');
    const [multiTeamCount, setMultiTeamCount] = useState(2);
    const [multiTags, setMultiTags] = useState([{ team: 'Tech', post: 'Entire Team' }, { team: 'Design', post: 'Entire Team' }]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (existingTask) {
            setTitle(existingTask.title);
            setDescription(existingTask.description);
            const d = new Date(existingTask.deadline);
            setDeadlineDate(d.toISOString().split('T')[0]);
            setDeadlineTime(d.toTimeString().slice(0, 5));
        } else {
            setTitle(''); setDescription(''); setDeadlineDate(''); setDeadlineTime('');
        }
    }, [existingTask, isOpen]);

    if (!isOpen) return null;

    const toggleUser = (id) => setSelectedUsers(prev => prev.includes(id) ? prev.filter(userId => userId !== id) : [...prev, id]);
    const handleMultiTagChange = (index, field, value) => {
        const newTags = [...multiTags];
        newTags[index][field] = value;
        if (field === 'team') newTags[index].post = CLUB_STRUCTURE[value][0];
        setMultiTags(newTags);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim() || !deadlineDate || !deadlineTime) return;

        const selectedDateTime = new Date(`${deadlineDate}T${deadlineTime}`);
        if (selectedDateTime <= new Date()) return alert("The deadline must be set in the future!");

        setIsSubmitting(true);
        
        if (existingTask) {
            editTask({ taskId: existingTask.id, title: title.trim(), description: description.trim(), deadline: selectedDateTime.toISOString() });
        } else {
            if (selectionMode === 'users' && selectedUsers.length === 0) {
                setIsSubmitting(false);
                return alert("Please select at least one user.");
            }
            let finalTags = [];
            if (selectionMode === 'tags') {
                if (tagMode === 'single') finalTags = [{ team: targetTeam, post: targetPost }];
                else finalTags = multiTags.slice(0, multiTeamCount);
            }
            createTask({ title: title.trim(), description: description.trim(), deadline: selectedDateTime.toISOString(), taskMode, selectionMode, targetTags: JSON.stringify(finalTags), targetUsers: JSON.stringify(selectedUsers), createdBy: username });
        }
        
        setTimeout(() => {
            setIsSubmitting(false); setTitle(''); setDescription(''); setDeadlineDate(''); setDeadlineTime(''); setTargetTeam('All Teams'); setTargetPost('Everyone'); setTagMode('single'); setSelectedUsers([]);
            onClose();
        }, 500);
    };

    const today = new Date().toISOString().split('T')[0];
    const modalBg = theme === 'black' ? 'bg-[#0a0a0a] border-[#222]' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700';
    const headerBg = theme === 'black' ? 'bg-[#050505] border-[#1a1a1a]' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800';
    const inputBg = theme === 'black' ? 'bg-[#111] border-[#333] focus:border-amber-500 text-white' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-indigo-500';
    const textBase = theme === 'black' ? 'text-gray-300' : 'text-slate-800 dark:text-slate-200';

    return (
        <div className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${textBase}`}>
            <div className={`w-[600px] flex flex-col rounded-2xl shadow-2xl overflow-hidden border max-h-[90vh] ${modalBg}`}>
                <div className={`p-5 border-b flex justify-between items-center ${headerBg}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        </div>
                        <h2 className="text-sm font-black text-amber-500 uppercase tracking-widest">{existingTask ? 'Modify Mission' : 'Dispatch New Task'}</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {!existingTask && (
                        <div className="flex flex-col gap-4">
                            <div className={`flex rounded-xl p-1 border ${theme === 'black' ? 'bg-[#111] border-[#333]' : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                                <button type="button" onClick={() => setTaskMode('group')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${taskMode === 'group' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-300'}`}>Group Task</button>
                                <button type="button" onClick={() => setTaskMode('individual')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${taskMode === 'individual' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-300'}`}>Individual Task</button>
                            </div>

                            <div className={`flex rounded-xl p-1 border ${theme === 'black' ? 'bg-[#111] border-[#333]' : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                                <button type="button" onClick={() => setSelectionMode('tags')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${selectionMode === 'tags' ? (theme === 'black' ? 'bg-[#222] text-amber-400 border border-[#333]' : 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm') : 'text-slate-400 hover:text-slate-300'}`}>Target by Tags</button>
                                <button type="button" onClick={() => setSelectionMode('users')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${selectionMode === 'users' ? (theme === 'black' ? 'bg-[#222] text-amber-400 border border-[#333]' : 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm') : 'text-slate-400 hover:text-slate-300'}`}>Select Users</button>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Operation Title</label>
                        <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Design Hackathon Banners" className={`w-full rounded-xl px-4 py-3 focus:outline-none text-sm border ${inputBg}`} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mission Details</label>
                        <textarea rows="2" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Specify deliverables and guidelines..." className={`w-full rounded-xl px-4 py-3 focus:outline-none text-sm border resize-none custom-scrollbar ${inputBg}`} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Deadline Date</label>
                            <input type="date" min={today} required value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} className={`w-full rounded-xl px-4 py-3 focus:outline-none text-sm border ${inputBg}`} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Deadline Time</label>
                            <input type="time" required value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} className={`w-full rounded-xl px-4 py-3 focus:outline-none text-sm border ${inputBg}`} />
                        </div>
                    </div>

                    {!existingTask && selectionMode === 'tags' && (
                        <div className={`p-4 rounded-xl border ${theme === 'black' ? 'bg-[#111]/50 border-[#333]' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs font-black text-amber-500 uppercase tracking-wider">Target Audience</h3>
                                <select value={tagMode} onChange={(e) => setTagMode(e.target.value)} className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${inputBg}`}>
                                    <option value="single">Single Team</option><option value="multi">Multi-Team Collab</option>
                                </select>
                            </div>
                            {tagMode === 'single' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Team</label>
                                        <select value={targetTeam} onChange={(e) => { setTargetTeam(e.target.value); setTargetPost(CLUB_STRUCTURE[e.target.value][0]); }} className={`w-full rounded-lg px-3 py-2 focus:outline-none text-xs border cursor-pointer ${inputBg}`}>{Object.keys(CLUB_STRUCTURE).map(team => <option key={team} value={team}>{team}</option>)}</select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Post</label>
                                        <select value={targetPost} onChange={(e) => setTargetPost(e.target.value)} className={`w-full rounded-lg px-3 py-2 focus:outline-none text-xs border cursor-pointer ${inputBg}`}>{CLUB_STRUCTURE[targetTeam].map(post => <option key={post} value={post}>{post}</option>)}</select>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-inherit">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Select Number of Teams</span>
                                        <select value={multiTeamCount} onChange={e => setMultiTeamCount(Number(e.target.value))} className={`rounded-lg px-3 py-1 text-xs border cursor-pointer ${inputBg}`}>{[2,3,4].map(num => <option key={num} value={num}>{num} Teams</option>)}</select>
                                    </div>
                                    {Array.from({length: multiTeamCount}).map((_, idx) => (
                                        <div key={idx} className="grid grid-cols-2 gap-4">
                                            <select value={multiTags[idx].team} onChange={e => handleMultiTagChange(idx, 'team', e.target.value)} className={`w-full rounded-lg px-3 py-2 focus:outline-none text-xs border cursor-pointer ${inputBg}`}>{Object.keys(CLUB_STRUCTURE).filter(t => t !== "All Teams").map(team => <option key={team} value={team}>{team}</option>)}</select>
                                            <select value={multiTags[idx].post} onChange={e => handleMultiTagChange(idx, 'post', e.target.value)} className={`w-full rounded-lg px-3 py-2 focus:outline-none text-xs border cursor-pointer ${inputBg}`}>{CLUB_STRUCTURE[multiTags[idx].team].map(post => <option key={post} value={post}>{post}</option>)}</select>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {!existingTask && selectionMode === 'users' && (
                        <div className={`p-4 rounded-xl border ${theme === 'black' ? 'bg-[#111]/50 border-[#333]' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30'}`}>
                            <h3 className="text-xs font-black text-amber-500 uppercase tracking-wider mb-3">Select Specific Members</h3>
                            <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                                {users.filter(u => u.username !== username).map(user => (
                                    <div key={user.id} onClick={() => toggleUser(user.id)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border ${selectedUsers.includes(user.id) ? (theme === 'black' ? 'bg-[#222] border-amber-500/50' : 'bg-amber-100 dark:bg-amber-500/20 border-amber-500/30') : 'border-transparent hover:bg-black/10 dark:hover:bg-white/5'}`}>
                                        <div className="relative w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden">
                                            {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : user.username.charAt(0).toUpperCase()}
                                            <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-inherit ${user.status === 'Offline' ? 'bg-slate-500' : 'bg-cyan-500'}`}></span>
                                        </div>
                                        <span className="text-sm font-semibold flex-1">{user.username} <span className="text-[9px] opacity-50 font-normal">({user.status})</span></span>
                                        {selectedUsers.includes(user.id) && <span className="text-amber-500 font-bold">✓</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* FIXED: Removed onClick from submit button to prevent double-firing! */}
                    <div className={`p-5 border-t flex justify-end gap-3 ${headerBg} sticky bottom-0`}>
                        <button type="button" onClick={onClose} className={`px-5 py-2.5 rounded-xl font-bold transition-colors ${theme === 'black' ? 'text-gray-400 hover:bg-[#222]' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>Cancel</button>
                        <button type="submit" disabled={isSubmitting || !title.trim() || !deadlineDate} className={`px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 ${theme === 'black' ? 'bg-amber-600 hover:bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20'}`}>
                            {isSubmitting ? 'Saving...' : (existingTask ? 'Save Changes' : 'Dispatch Task')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
export default TaskModal;