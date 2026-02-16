import React, { useState, useEffect } from 'react';
import {
    Plus, Briefcase, ChevronLeft, Search, Trash2, Edit3,
    Clock, CheckCircle2, XCircle, MessageSquare, Bookmark,
    ExternalLink, Loader2, X, BarChart2, ArrowUpRight
} from 'lucide-react';
import { JobApplication, JobStatus } from '../types';
import { addJobApplication, getUserJobs, updateJobApplication, deleteJobApplication } from '../utils/firestore';
import { useToast } from './Toast';

interface JobTrackerProps {
    onBack: () => void;
    userUid: string;
}

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
    saved: { label: 'Saved', color: 'text-slate-400', bgColor: 'bg-slate-500/20 border-slate-500/30', icon: <Bookmark size={14} /> },
    applied: { label: 'Applied', color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/30', icon: <Clock size={14} /> },
    interviewing: { label: 'Interviewing', color: 'text-amber-400', bgColor: 'bg-amber-500/20 border-amber-500/30', icon: <MessageSquare size={14} /> },
    offered: { label: 'Offered', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20 border-emerald-500/30', icon: <CheckCircle2 size={14} /> },
    rejected: { label: 'Rejected', color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/30', icon: <XCircle size={14} /> },
    withdrawn: { label: 'Withdrawn', color: 'text-stone-400', bgColor: 'bg-stone-500/20 border-stone-500/30', icon: <XCircle size={14} /> },
};

const ALL_STATUSES: JobStatus[] = ['saved', 'applied', 'interviewing', 'offered', 'rejected', 'withdrawn'];

const JobTracker: React.FC<JobTrackerProps> = ({ onBack, userUid }) => {
    const { showToast } = useToast();
    const [jobs, setJobs] = useState<JobApplication[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingJob, setEditingJob] = useState<JobApplication | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<JobStatus | 'all'>('all');

    // Form state
    const [formCompany, setFormCompany] = useState('');
    const [formRole, setFormRole] = useState('');
    const [formStatus, setFormStatus] = useState<JobStatus>('applied');
    const [formUrl, setFormUrl] = useState('');
    const [formNotes, setFormNotes] = useState('');
    const [formSalary, setFormSalary] = useState('');
    const [formLocation, setFormLocation] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadJobs();
    }, [userUid]);

    const loadJobs = async () => {
        setIsLoading(true);
        try {
            // Don't hang forever if Firestore is slow
            const timeout = new Promise<JobApplication[]>((resolve) =>
                setTimeout(() => resolve([]), 8000)
            );
            const fetchedJobs = await Promise.race([getUserJobs(userUid), timeout]);
            setJobs(fetchedJobs);
        } catch (err) {
            console.warn('Failed to load jobs:', err);
            showToast('warning', 'Offline mode', 'Could not load jobs — showing cached data if available.');
        }
        setIsLoading(false);
    };

    const resetForm = () => {
        setFormCompany('');
        setFormRole('');
        setFormStatus('applied');
        setFormUrl('');
        setFormNotes('');
        setFormSalary('');
        setFormLocation('');
        setEditingJob(null);
    };

    const openAddModal = () => {
        resetForm();
        setShowAddModal(true);
    };

    const openEditModal = (job: JobApplication) => {
        setEditingJob(job);
        setFormCompany(job.company);
        setFormRole(job.role);
        setFormStatus(job.status);
        setFormUrl(job.url || '');
        setFormNotes(job.notes || '');
        setFormSalary(job.salary || '');
        setFormLocation(job.location || '');
        setShowAddModal(true);
    };

    const handleSave = async () => {
        if (!formCompany.trim() || !formRole.trim()) {
            showToast('warning', 'Missing fields', 'Company and role are required.');
            return;
        }

        setIsSaving(true);

        const jobData: Omit<JobApplication, 'id'> = {
            company: formCompany.trim(),
            role: formRole.trim(),
            status: formStatus,
            dateApplied: editingJob?.dateApplied || Date.now(),
            url: formUrl.trim() || undefined,
            notes: formNotes.trim() || undefined,
            salary: formSalary.trim() || undefined,
            location: formLocation.trim() || undefined,
            updatedAt: Date.now(),
        };

        if (editingJob?.id) {
            await updateJobApplication(userUid, editingJob.id, jobData);
            showToast('success', 'Job updated', `${formCompany} — ${formRole}`);
        } else {
            await addJobApplication(userUid, jobData);
            showToast('success', 'Job added', `${formCompany} — ${formRole}`);
        }

        setIsSaving(false);
        setShowAddModal(false);
        resetForm();
        loadJobs();
    };

    const handleDelete = async (job: JobApplication) => {
        if (!job.id) return;
        await deleteJobApplication(userUid, job.id);
        showToast('info', 'Job removed', `${job.company} — ${job.role}`);
        loadJobs();
    };

    const handleStatusChange = async (job: JobApplication, newStatus: JobStatus) => {
        if (!job.id) return;
        await updateJobApplication(userUid, job.id, { status: newStatus });
        showToast('success', 'Status updated', `${job.company} → ${STATUS_CONFIG[newStatus].label}`);
        loadJobs();
    };

    // Filter and search
    const filteredJobs = jobs.filter(job => {
        const matchesSearch = !searchQuery ||
            job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.role.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || job.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    // Stats
    const stats = {
        total: jobs.length,
        applied: jobs.filter(j => j.status === 'applied').length,
        interviewing: jobs.filter(j => j.status === 'interviewing').length,
        offered: jobs.filter(j => j.status === 'offered').length,
        rejected: jobs.filter(j => j.status === 'rejected').length,
    };

    return (
        <div className="max-w-6xl mx-auto p-6 w-full animate-fadeIn">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors px-4 py-2 rounded-full hover:bg-slate-800"
            >
                <ChevronLeft size={20} /> Back to Dashboard
            </button>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <div className="bg-cyan-600 p-2 rounded-xl">
                            <Briefcase size={24} className="text-white" />
                        </div>
                        Job Tracker
                    </h1>
                    <p className="text-slate-400 mt-1">Keep your job search organized and track your progress.</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                    <Plus size={18} /> Add Application
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {[
                    { label: 'Total', value: stats.total, color: 'text-white' },
                    { label: 'Applied', value: stats.applied, color: 'text-blue-400' },
                    { label: 'Interviewing', value: stats.interviewing, color: 'text-amber-400' },
                    { label: 'Offered', value: stats.offered, color: 'text-emerald-400' },
                    { label: 'Rejected', value: stats.rejected, color: 'text-red-400' },
                ].map(stat => (
                    <div key={stat.label} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-center">
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by company or role..."
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm placeholder:text-slate-500"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${filterStatus === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                            }`}
                    >
                        All
                    </button>
                    {ALL_STATUSES.map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${filterStatus === status
                                ? `${STATUS_CONFIG[status].bgColor} ${STATUS_CONFIG[status].color} border`
                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                                }`}
                        >
                            {STATUS_CONFIG[status].icon}
                            {STATUS_CONFIG[status].label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Job List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-indigo-400" size={32} />
                </div>
            ) : filteredJobs.length === 0 ? (
                <div className="text-center py-20 bg-slate-800/50 rounded-3xl border border-slate-700/50">
                    <Briefcase className="mx-auto text-slate-600 mb-4" size={48} />
                    <p className="text-slate-400 text-lg font-medium">
                        {jobs.length === 0 ? 'No applications yet' : 'No matching results'}
                    </p>
                    <p className="text-slate-500 text-sm mt-1">
                        {jobs.length === 0 ? 'Click "Add Application" to start tracking your job search.' : 'Try adjusting your search or filters.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredJobs.map(job => (
                        <div
                            key={job.id}
                            className="bg-slate-800 border border-slate-700 rounded-2xl p-5 hover:border-slate-600 transition-all group"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-lg font-bold text-white truncate">{job.company}</h3>
                                        {job.url && (
                                            <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-indigo-400 transition-colors shrink-0">
                                                <ExternalLink size={14} />
                                            </a>
                                        )}
                                    </div>
                                    <p className="text-slate-400 text-sm truncate">{job.role}</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {job.location && (
                                            <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded-lg">{job.location}</span>
                                        )}
                                        {job.salary && (
                                            <span className="text-xs text-emerald-400/70 bg-emerald-500/10 px-2 py-1 rounded-lg">{job.salary}</span>
                                        )}
                                        <span className="text-xs text-slate-600">
                                            Applied: {new Date(job.dateApplied).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    {/* Status Dropdown */}
                                    <select
                                        value={job.status}
                                        onChange={(e) => handleStatusChange(job, e.target.value as JobStatus)}
                                        className={`text-xs font-bold px-3 py-2 rounded-xl border cursor-pointer outline-none ${STATUS_CONFIG[job.status].bgColor} ${STATUS_CONFIG[job.status].color} bg-transparent`}
                                    >
                                        {ALL_STATUSES.map(s => (
                                            <option key={s} value={s} className="bg-slate-800 text-white">{STATUS_CONFIG[s].label}</option>
                                        ))}
                                    </select>

                                    {/* Actions */}
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openEditModal(job)}
                                            className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(job)}
                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {job.notes && (
                                <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-700/50 leading-relaxed">
                                    {job.notes}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">
                                {editingJob ? 'Edit Application' : 'Add Application'}
                            </h2>
                            <button onClick={() => { setShowAddModal(false); resetForm(); }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Company *</label>
                                <input
                                    value={formCompany}
                                    onChange={(e) => setFormCompany(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none placeholder:text-slate-600 text-sm"
                                    placeholder="e.g. Google"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Role *</label>
                                <input
                                    value={formRole}
                                    onChange={(e) => setFormRole(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none placeholder:text-slate-600 text-sm"
                                    placeholder="e.g. Senior Product Manager"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                                    <select
                                        value={formStatus}
                                        onChange={(e) => setFormStatus(e.target.value as JobStatus)}
                                        className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    >
                                        {ALL_STATUSES.map(s => (
                                            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Location</label>
                                    <input
                                        value={formLocation}
                                        onChange={(e) => setFormLocation(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none placeholder:text-slate-600 text-sm"
                                        placeholder="e.g. Remote"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Salary / Pay</label>
                                    <input
                                        value={formSalary}
                                        onChange={(e) => setFormSalary(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none placeholder:text-slate-600 text-sm"
                                        placeholder="e.g. $120k"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Job URL</label>
                                    <input
                                        value={formUrl}
                                        onChange={(e) => setFormUrl(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none placeholder:text-slate-600 text-sm"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notes</label>
                                <textarea
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 h-24 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none placeholder:text-slate-600 text-sm"
                                    placeholder="Recruiter name, interview dates, thoughts..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setShowAddModal(false); resetForm(); }}
                                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !formCompany.trim() || !formRole.trim()}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={16} /> : null}
                                {editingJob ? 'Update' : 'Add Application'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobTracker;
