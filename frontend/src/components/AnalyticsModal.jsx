import React from 'react';

function AnalyticsModal({ isOpen, onClose, taskData, theme }) {
    if (!isOpen || !taskData) return null;

    const completedCount = taskData.completedBy ? taskData.completedBy.length : 0;
    
    const modalBg = theme === 'black' ? 'bg-[#0a0a0a] border-[#222]' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700';
    const headerBg = theme === 'black' ? 'bg-[#050505] border-[#1a1a1a]' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800';
    const textBase = theme === 'black' ? 'text-gray-300' : 'text-slate-800 dark:text-slate-200';

    return (
        <div className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${textBase}`}>
            <div className={`w-[500px] flex flex-col rounded-2xl shadow-2xl overflow-hidden border ${modalBg}`}>
                <div className={`p-4 border-b flex justify-between items-center ${headerBg}`}>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">📊</span>
                        <h2 className="text-sm font-black text-indigo-500 uppercase tracking-widest">Mission Analytics</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors">✕</button>
                </div>
                
                <div className="p-6">
                    <h3 className={`text-lg font-bold mb-1 ${theme === 'black' ? 'text-white' : ''}`}>{taskData.title}</h3>
                    <p className="text-xs text-slate-500 mb-6">Tracking completion status across all assigned personnel.</p>
                    
                    <div className={`p-4 rounded-xl border mb-6 flex flex-col items-center justify-center ${theme === 'black' ? 'bg-[#111] border-[#333]' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                        <span className="text-4xl font-black text-emerald-500 mb-1">{completedCount}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Completions Verified</span>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Personnel Log</h4>
                        {completedCount === 0 ? (
                            <div className="text-sm italic text-slate-500 text-center py-4">No completions logged yet.</div>
                        ) : (
                            <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                                {taskData.completedBy.map((user, i) => (
                                    <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${theme === 'black' ? 'bg-[#1a1a1a] border-emerald-900/50' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50'}`}>
                                        <span className="text-emerald-500">✅</span>
                                        <span className={`text-sm font-bold ${theme === 'black' ? 'text-emerald-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{user}</span>
                                        <span className="ml-auto text-[10px] text-slate-500 uppercase">Verified</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AnalyticsModal;