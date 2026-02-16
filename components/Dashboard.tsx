import React, { useEffect, useState } from 'react';
import { AppState, ServiceMode, UserProfile } from '../types';
import { getUserProfile } from '../utils/firestore';
import {
    Brain, Headphones, FileSearch, Briefcase,
    Crown, Zap, ArrowRight, BarChart2, Clock,
    TrendingUp, Award
} from 'lucide-react';

interface DashboardProps {
    onSelectService: (mode: ServiceMode | 'cv-griller' | 'job-tracker') => void;
    userName: string;
    userUid: string;
}

const Dashboard: React.FC<DashboardProps> = ({ onSelectService, userName, userUid }) => {
    const [profile, setProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        getUserProfile(userUid).then(setProfile);
    }, [userUid]);

    const totalSessions = profile
        ? profile.totalInterviews + profile.totalPractice + profile.totalCVGrills
        : 0;

    return (
        <div className="max-w-6xl mx-auto p-6 w-full animate-fadeIn">
            {/* Welcome Header */}
            <div className="mb-10">
                <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
                    Welcome back, {userName} 👋
                </h1>
                <p className="text-slate-400 text-lg">What would you like to do today?</p>
            </div>

            {/* Quick Stats */}
            {profile && totalSessions > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    <StatCard icon={<BarChart2 size={18} />} label="Total Sessions" value={totalSessions} color="text-indigo-400" />
                    <StatCard icon={<Brain size={18} />} label="Screenings" value={profile.totalInterviews} color="text-purple-400" />
                    <StatCard icon={<Headphones size={18} />} label="Practice" value={profile.totalPractice} color="text-emerald-400" />
                    <StatCard icon={<FileSearch size={18} />} label="CV Grill" value={profile.totalCVGrills} color="text-amber-400" />
                </div>
            )}

            {/* Service Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 mb-6">
                {/* Recruiter Screen — PAID */}
                <ServiceCard
                    title="Recruiter Screen"
                    description="Conduct AI-powered technical screening interviews. Get detailed candidate evaluation reports with scoring and actionable feedback."
                    icon={<Brain size={28} />}
                    onClick={() => onSelectService('recruiter')}
                    gradient="from-indigo-600 to-purple-600"
                    shadowColor="shadow-indigo-500/20"
                    badge={
                        <span className="flex items-center gap-1 px-3 py-1 bg-amber-400 text-amber-950 rounded-full text-xs font-bold">
                            <Crown size={12} /> PRO
                        </span>
                    }
                />

                {/* Practice Coach — FREE */}
                <ServiceCard
                    title="Practice Coach"
                    description="Practice your interview skills with an AI coach. Get real-time feedback and improve your communication and technical responses."
                    icon={<Headphones size={28} />}
                    onClick={() => onSelectService('practice')}
                    gradient="from-emerald-600 to-teal-600"
                    shadowColor="shadow-emerald-500/20"
                    badge={
                        <span className="flex items-center gap-1 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold">
                            <Zap size={12} /> FREE
                        </span>
                    }
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {/* CV Griller — FREE */}
                <ServiceCard
                    title="CV Griller"
                    description="AI-powered resume analysis against any job description. Get brutally honest feedback and an action plan to improve your resume."
                    icon={<FileSearch size={28} />}
                    onClick={() => onSelectService('cv-griller')}
                    gradient="from-amber-500 to-orange-500"
                    shadowColor="shadow-amber-500/20"
                    badge={
                        <span className="flex items-center gap-1 px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold">
                            <Zap size={12} /> FREE
                        </span>
                    }
                />

                {/* Job Tracker — FREE */}
                <ServiceCard
                    title="Job Application Tracker"
                    description="Keep your job search organized. Track every application, update statuses, and never lose track of where you've applied."
                    icon={<Briefcase size={28} />}
                    onClick={() => onSelectService('job-tracker')}
                    gradient="from-cyan-600 to-blue-600"
                    shadowColor="shadow-cyan-500/20"
                    badge={
                        <span className="flex items-center gap-1 px-3 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full text-xs font-bold">
                            <Zap size={12} /> FREE
                        </span>
                    }
                    isNew
                />
            </div>
        </div>
    );
};

// Sub-Components
const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string }> = ({ icon, label, value, color }) => (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
        <div className={`${color} mb-2`}>{icon}</div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
    </div>
);

interface ServiceCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
    gradient: string;
    shadowColor: string;
    badge: React.ReactNode;
    isNew?: boolean;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
    title, description, icon, onClick, gradient, shadowColor, badge, isNew
}) => (
    <button
        onClick={onClick}
        className={`relative text-left p-6 bg-slate-800 border border-slate-700 rounded-2xl hover:border-slate-600 transition-all group overflow-hidden shadow-lg ${shadowColor}`}
    >
        {/* Gradient accent line */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />

        {isNew && (
            <div className="absolute top-4 right-4">
                <span className="px-2.5 py-1 bg-cyan-500 text-white rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse">
                    NEW
                </span>
            </div>
        )}

        <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg shrink-0`}>
                {icon}
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">{title}</h3>
                    {badge}
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">{description}</p>
                <div className="flex items-center gap-1.5 text-sm font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                    Get Started <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
            </div>
        </div>
    </button>
);

export default Dashboard;