import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './utils/firebase';
import { AppState, ServiceMode, CandidateProfile, TranscriptionItem, InterviewReport } from './types';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider, useToast } from './components/Toast';
import AuthPanel from './components/AuthPanel';
import Dashboard from './components/Dashboard';
import SetupPanel from './components/SetupPanel';
import InterviewSession from './components/InterviewSession';
import ReportPanel from './components/ReportPanel';
import CVGriller from './components/CVGriller';
import JobTracker from './components/JobTracker';
import { getUserProfile, createUserProfile } from './utils/firestore';
import { Brain, LogOut, Home, ChevronRight, Loader2 } from 'lucide-react';

function AppContent() {
  const { showToast } = useToast();

  // Auth
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Navigation
  const [appState, setAppState] = useState<AppState>(AppState.DASHBOARD);
  const [serviceMode, setServiceMode] = useState<ServiceMode>('practice');

  // Interview flow data
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionItem[]>([]);
  const [report, setReport] = useState<InterviewReport | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // Sync Firestore profile in the background — never block auth
        getUserProfile(firebaseUser.uid)
          .then(profile => {
            if (!profile) {
              return createUserProfile(
                firebaseUser.uid,
                firebaseUser.email || '',
                firebaseUser.displayName || 'User'
              );
            }
          })
          .catch(err => console.warn('Firestore profile sync failed (non-blocking):', err));
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (firebaseUser: User) => {
    setUser(firebaseUser);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setAppState(AppState.DASHBOARD);
      showToast('info', 'Logged out', 'See you next time!');
    } catch (err) {
      showToast('error', 'Logout failed', 'Please try again.');
    }
  };

  const handleSelectService = (mode: ServiceMode | 'cv-griller' | 'job-tracker') => {
    if (mode === 'cv-griller') {
      setAppState(AppState.CV_GRILLER);
    } else if (mode === 'job-tracker') {
      setAppState(AppState.JOB_TRACKER);
    } else {
      setServiceMode(mode);
      setAppState(AppState.SETUP);
    }
  };

  const handleSetupComplete = (profile: CandidateProfile) => {
    setCandidateProfile(profile);
    setAppState(AppState.INTERVIEW);
  };

  const handleInterviewComplete = (
    transcript: TranscriptionItem[],
    generatedReport: InterviewReport | null
  ) => {
    setTranscription(transcript);
    setReport(generatedReport);
    setAppState(AppState.REPORT);
  };

  const goHome = () => {
    setAppState(AppState.DASHBOARD);
    setCandidateProfile(null);
    setTranscription([]);
    setReport(null);
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="animate-spin text-indigo-400" size={40} />
      </div>
    );
  }

  // Auth gate
  if (!user) {
    return <AuthPanel onLogin={handleLogin} />;
  }

  // Breadcrumb label
  const getPageLabel = () => {
    switch (appState) {
      case AppState.SETUP: return serviceMode === 'recruiter' ? 'Recruiter Screen' : 'Practice Coach';
      case AppState.INTERVIEW: return 'Live Session';
      case AppState.REPORT: return 'Report';
      case AppState.CV_GRILLER: return 'CV Griller';
      case AppState.JOB_TRACKER: return 'Job Tracker';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-50 overflow-hidden font-sans">
      {/* Navbar */}
      <nav className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          {/* Left: Logo + Breadcrumbs */}
          <div className="flex items-center gap-4">
            <button onClick={goHome} className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Brain className="text-white" size={18} />
              </div>
              <span className="text-lg font-extrabold text-white tracking-tight hidden sm:block">SkillProbe</span>
            </button>

            {appState !== AppState.DASHBOARD && (
              <div className="flex items-center gap-2 text-sm">
                <ChevronRight size={14} className="text-slate-600" />
                <span className="text-slate-400 font-medium">{getPageLabel()}</span>
              </div>
            )}
          </div>

          {/* Right: User + Logout */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-bold text-slate-200 leading-tight">
                {user.displayName || user.email?.split('@')[0]}
              </p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
              title="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        <div className="min-h-full flex flex-col justify-start py-8">
          {appState === AppState.DASHBOARD && (
            <Dashboard
              onSelectService={handleSelectService}
              userName={user.displayName || user.email?.split('@')[0] || 'there'}
              userUid={user.uid}
            />
          )}

          {appState === AppState.SETUP && (
            <SetupPanel
              mode={serviceMode}
              onBack={goHome}
              onStartInterview={handleSetupComplete}
              userUid={user.uid}
            />
          )}

          {appState === AppState.INTERVIEW && candidateProfile && (
            <InterviewSession
              profile={candidateProfile}
              mode={serviceMode}
              onEnd={handleInterviewComplete}
              onBack={goHome}
              userUid={user.uid}
            />
          )}

          {appState === AppState.REPORT && (
            <ReportPanel
              report={report}
              transcripts={transcription}
              profile={candidateProfile}
              mode={serviceMode}
              onBack={goHome}
              userUid={user.uid}
            />
          )}

          {appState === AppState.CV_GRILLER && (
            <CVGriller
              onBack={goHome}
              userUid={user.uid}
            />
          )}

          {appState === AppState.JOB_TRACKER && (
            <JobTracker
              onBack={goHome}
              userUid={user.uid}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// Root component wraps everything in ErrorBoundary + ToastProvider
export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
}