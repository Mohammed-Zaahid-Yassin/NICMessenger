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
            setTitle(existingTask.title || '');
            setDescription(existingTask.description || '');
            if (existingTask.deadline) {
                const d = new Date(existingTask.deadline);
                setDeadlineDate(d.toISOString().split('T')[0]);
                setDeadlineTime(d.toTimeString().slice(0, 5));
            }
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
    const inputBg = theme === 'black' ? 'bg-[#111] border-[#333] focus:border-amber-500 text-white' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-indigo-500 text-slate-800 dark:text-slate-100';
    const textBase = theme === 'black' ? 'text-gray-300' : 'text-slate-800 dark:text-slate-200';

    return (
        <div className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4 ${textBase}`}>
            <div className={`w-full max-w-xl flex flex-col rounded-2xl shadow-2xl overflow-hidden border max-h-[90vh] ${modalBg}`}>
                <div className={`p-4 md:p-5 border-b flex justify-between items-center ${headerBg}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        </div>
                        <h2 className="text-xs md:text-sm font-black text-amber-500 uppercase tracking-widest">{existingTask ? 'Modify Task' : 'Dispatch New Task'}</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 custom-scrollbar">
                    {!existingTask && (
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setTaskMode('group')} className={`p-3 rounded-xl border text-xs font-bold uppercase transition-all cursor-pointer ${taskMode === 'group' ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                    Group Channel
                                </button>
                                <button type="button" onClick={() => setTaskMode('individual')} className={`p-3 rounded-xl border text-xs font-bold uppercase transition-all cursor-pointer ${taskMode === 'individual' ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                    Direct Dispatch
                                </button>
                            </div>

                            <div className="flex gap-4 text-xs font-semibold">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={selectionMode === 'tags'} onChange={() => setSelectionMode('tags')} />
                                    <span>Target by Team Tags</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={selectionMode === 'users'} onChange={() => setSelectionMode('users')} />
                                    <span>Select Specific Users</span>
                                </label>
                            </div>

                            {selectionMode === 'tags' && (
                                <div className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                                    <div className="flex gap-2">
                                        <select value={targetTeam} onChange={(e) => { setTargetTeam(e.target.value); setTargetPost(CLUB_STRUCTURE[e.target.value][0]); }} className={`flex-1 rounded-lg px-3 py-2 text-xs border ${inputBg}`}>
                                            {Object.keys(CLUB_STRUCTURE).map(team => <option key={team} value={team}>{team}</option>)}
                                        </select>
                                        <select value={targetPost} onChange={(e) => setTargetPost(e.target.value)} className={`flex-1 rounded-lg px-3 py-2 text-xs border ${inputBg}`}>
                                            {CLUB_STRUCTURE[targetTeam]?.map(post => <option key={post} value={post}>{post}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {selectionMode === 'users' && (
                                <div className={`border rounded-xl p-3 max-h-36 overflow-y-auto custom-scrollbar ${theme === 'black' ? 'border-[#333] bg-[#111]' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}`}>
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Assign to Personnel</p>
                                    {users.filter(u => u.username !== username).map(u => (
                                        <div key={u.id} onClick={() => toggleUser(u.id)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedUsers.includes(u.id) ? 'bg-amber-500/20 border border-amber-500/30' : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'}`}>
                                            <span className="text-sm font-semibold flex-1">{u.username}</span>
                                            {selectedUsers.includes(u.id) && <span className="text-amber-500 font-bold">✓</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Task Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Deploy staging environment" className={`w-full rounded-xl px-4 py-3 focus:outline-none text-sm border ${inputBg}`} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description / Requirements</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="3" placeholder="Provide instructions, links, or context..." className={`w-full rounded-xl px-4 py-3 focus:outline-none text-sm border ${inputBg}`} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Deadline Date</label>
                            <input type="date" min={today} value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} required className={`w-full rounded-xl px-4 py-3 focus:outline-none text-sm border ${inputBg}`} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Deadline Time</label>
                            <input type="time" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} required className={`w-full rounded-xl px-4 py-3 focus:outline-none text-sm border ${inputBg}`} />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className={`px-5 py-2.5 rounded-xl font-bold transition-colors cursor-pointer ${theme === 'black' ? 'text-gray-400 hover:bg-[#222]' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Cancel</button>
                        <button type="submit" disabled={isSubmitting || !title.trim() || !deadlineDate || !deadlineTime} className="px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 bg-amber-500 hover:bg-amber-600 text-white cursor-pointer shadow-md shadow-amber-500/20">
                            {isSubmitting ? 'Saving...' : (existingTask ? 'Save Changes' : 'Dispatch Task')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default TaskModal;
