import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CandidateProfile, ServiceMode, TranscriptionItem, InterviewReport } from '../types';
import { useLiveSession } from '../hooks/useLiveSession';
import { useToast } from './Toast';
import { incrementUsageStat } from '../utils/firestore';
import AudioVisualizer from './AudioVisualizer';
import {
  Mic, MicOff, PhoneOff, Loader2, Clock,
  AlertCircle, Radio, ChevronLeft, Volume2
} from 'lucide-react';

interface InterviewSessionProps {
  profile: CandidateProfile;
  mode: ServiceMode;
  onEnd: (transcripts: TranscriptionItem[], report: InterviewReport | null) => void;
  onBack: () => void;
  userUid: string;
}

const InterviewSession: React.FC<InterviewSessionProps> = ({
  profile, mode, onEnd, onBack, userUid
}) => {
  const { showToast } = useToast();
  const [isMuted, setIsMuted] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    error,
    transcription,
    inputVolume,
    outputVolume,
    streamRef,
  } = useLiveSession(profile, mode);

  // Start timer when connected
  useEffect(() => {
    if (isConnected && !timerRef.current) {
      setHasStarted(true);
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected]);

  // Show error as toast
  useEffect(() => {
    if (error) {
      showToast('error', 'Connection Error', error);
    }
  }, [error]);

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleStart = async () => {
    try {
      await connect();
    } catch (err: any) {
      showToast('error', 'Failed to connect', err?.message || 'Could not start the session.');
    }
  };

  const handleToggleMute = useCallback(() => {
    // Actually mute/unmute the media stream
    if (streamRef?.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted; // Toggle: if currently muted, enable; if on, disable
      });
    }
    setIsMuted(prev => !prev);
    showToast('info', isMuted ? 'Microphone on' : 'Microphone muted', undefined, 2000);
  }, [isMuted, streamRef]);

  const handleEnd = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    disconnect();

    // Track usage
    const stat = mode === 'recruiter' ? 'totalInterviews' : 'totalPractice';
    await incrementUsageStat(userUid, stat);

    // TODO: Generate report from transcripts before passing to onEnd
    onEnd(transcription, null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 w-full animate-fadeIn">
      {/* Back button (only before connected) */}
      {!isConnected && !isConnecting && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors px-4 py-2 rounded-full hover:bg-slate-800"
        >
          <ChevronLeft size={20} /> Back
        </button>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          {mode === 'recruiter' ? '🔍 Screening Session' : '🎯 Practice Session'}
        </h2>
        <p className="text-slate-400">
          {profile.name} — {profile.role}
        </p>
      </div>

      {/* Main Session Area */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 mb-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Live</span>
              </div>
            ) : isConnecting ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full">
                <Loader2 size={12} className="animate-spin text-amber-400" />
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Connecting</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-500/20 border border-slate-500/30 rounded-full">
                <div className="w-2 h-2 bg-slate-400 rounded-full" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ready</span>
              </div>
            )}
          </div>

          {hasStarted && (
            <div className="flex items-center gap-2 text-slate-400">
              <Clock size={16} />
              <span className="font-mono font-bold text-lg">{formatTime(elapsedTime)}</span>
            </div>
          )}
        </div>

        {/* Audio Visualizers */}
        {isConnected && (
          <div className="grid grid-cols-2 gap-6 mb-8">
            <AudioVisualizer
              volume={isMuted ? 0 : inputVolume}
              isActive={isConnected}
              color={isMuted ? '#64748b' : '#60a5fa'}
              label={isMuted ? 'Muted' : 'You'}
            />
            <AudioVisualizer
              volume={outputVolume}
              isActive={isConnected}
              color="#a78bfa"
              label="SkillProbe AI"
            />
          </div>
        )}

        {/* Pre-connect state */}
        {!isConnected && !isConnecting && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mic size={32} className="text-indigo-400" />
            </div>
            <p className="text-slate-300 mb-2 font-medium">Ready to start the session?</p>
            <p className="text-slate-500 text-sm mb-8 max-w-md mx-auto">
              Make sure your microphone is working. The AI interviewer will begin asking questions once connected.
            </p>
            <button
              onClick={handleStart}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-3 mx-auto"
            >
              <Radio size={20} />
              Start Session
            </button>
          </div>
        )}

        {/* Connecting state */}
        {isConnecting && (
          <div className="text-center py-12">
            <Loader2 size={40} className="animate-spin text-indigo-400 mx-auto mb-4" />
            <p className="text-slate-300 font-medium">Connecting to SkillProbe AI...</p>
            <p className="text-slate-500 text-sm mt-1">This may take a few seconds</p>
          </div>
        )}

        {/* Error state */}
        {error && !isConnected && !isConnecting && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mt-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 text-sm font-medium">Connection Error</p>
              <p className="text-red-400/70 text-xs mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Transcription Area */}
        {transcription.length > 0 && (
          <div className="mt-6 border-t border-slate-700 pt-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Live Transcript</h3>
            <div className="max-h-60 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-700">
              {transcription.map((item, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${item.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-xl text-sm ${item.speaker === 'user'
                        ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/20'
                        : 'bg-slate-700 text-slate-300 border border-slate-600'
                      }`}
                  >
                    <p className="text-xs font-bold text-slate-500 mb-1">
                      {item.speaker === 'user' ? 'You' : 'AI Interviewer'}
                    </p>
                    {item.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Session Controls */}
      {isConnected && (
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={handleToggleMute}
            className={`p-4 rounded-full transition-all ${isMuted
                ? 'bg-amber-500 text-white hover:bg-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          <button
            onClick={handleEnd}
            className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold flex items-center gap-3 transition-all shadow-lg shadow-red-500/20"
          >
            <PhoneOff size={20} /> End Session
          </button>
        </div>
      )}
    </div>
  );
};

export default InterviewSession;