import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { getGeminiApiKey } from '../utils/apiConfig';
import { checkGeminiRateLimit, formatRetryTime } from '../utils/rateLimiter';
import { useToast } from './Toast';
import { CandidateProfile, ServiceMode } from '../types';
import { readTextFile, extractTextFromPDF } from '../utils/fileUtils';
import {
  ChevronLeft, Upload, FileText, Briefcase,
  User, Sparkles, Loader2, ArrowRight, AlertCircle
} from 'lucide-react';

interface SetupPanelProps {
  mode: ServiceMode;
  onBack: () => void;
  onStartInterview: (profile: CandidateProfile) => void;
  userUid: string;
}

const SetupPanel: React.FC<SetupPanelProps> = ({ mode, onBack, onStartInterview, userUid }) => {
  const { showToast } = useToast();
  const [candidateName, setCandidateName] = useState('');
  const [candidateRole, setCandidateRole] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [jobDescriptionText, setJobDescriptionText] = useState('');
  const [customQuestions, setCustomQuestions] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resumeFileName, setResumeFileName] = useState('');
  const [jdFileName, setJdFileName] = useState('');
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const jdInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    file: File,
    setTextFn: (text: string) => void,
    setFileNameFn: (name: string) => void,
    label: string
  ) => {
    try {
      let text = '';
      if (file.name.endsWith('.pdf')) {
        text = await extractTextFromPDF(file);
      } else {
        text = await readTextFile(file);
      }

      if (!text.trim()) {
        showToast('warning', `Empty ${label}`, `The file "${file.name}" appears to be empty. Please try another file.`);
        return;
      }

      setTextFn(text);
      setFileNameFn(file.name);
      showToast('success', `${label} uploaded`, `"${file.name}" processed successfully.`);
    } catch (error) {
      showToast('error', `Failed to read ${label}`, `Could not process "${file.name}". Make sure it's a valid PDF or text file.`);
    }
  };

  const analyzeResume = async () => {
    if (!resumeText) {
      showToast('warning', 'No resume', 'Please upload a resume first.');
      return;
    }

    // Rate limit check
    const { allowed, retryAfterMs } = checkGeminiRateLimit();
    if (!allowed) {
      showToast('warning', 'Please slow down', `Try again in ${formatRetryTime(retryAfterMs)}.`);
      return;
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      showToast('error', 'API Key Missing', 'Gemini API key is not configured. Please contact support.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Extract ONLY the candidate's full name and their most recent job title / target role from this resume. Return ONLY a JSON object like: {"name": "...", "role": "..."}\n\nResume:\n${resumeText.substring(0, 3000)}`,
      });

      const text = response?.text || '';
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[^}]+\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.name) setCandidateName(parsed.name);
          if (parsed.role) setCandidateRole(parsed.role);
          showToast('success', 'AI Analysis Complete', 'Candidate details extracted from resume.');
        } catch {
          showToast('info', 'Partial extraction', 'Could not parse all details. Please fill in manually.');
        }
      }
    } catch (error: any) {
      if (error?.status === 429) {
        showToast('warning', 'Rate limit reached', 'Too many requests. Please wait a moment and try again.');
      } else {
        showToast('error', 'Analysis failed', 'Could not analyze the resume. Please fill in details manually.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStart = () => {
    if (!candidateName.trim() || !candidateRole.trim()) {
      showToast('warning', 'Missing details', 'Please provide the candidate name and role.');
      return;
    }

    const profile: CandidateProfile = {
      name: candidateName.trim(),
      role: candidateRole.trim(),
      resumeText,
      jobDescriptionText,
      customQuestions: customQuestions.trim() || undefined,
      mode,
    };
    onStartInterview(profile);
  };

  const isPractice = mode === 'practice';
  const accentColor = isPractice ? 'emerald' : 'indigo';

  return (
    <div className="max-w-3xl mx-auto p-6 w-full animate-fadeIn">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors px-4 py-2 rounded-full hover:bg-slate-800"
      >
        <ChevronLeft size={20} /> Back to Dashboard
      </button>

      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-2">
          {isPractice ? '🎯 Practice Session Setup' : '🔍 Recruiter Screen Setup'}
        </h2>
        <p className="text-slate-400">
          {isPractice
            ? 'Upload your resume and a job description to start a practice interview.'
            : 'Set up a candidate screening session with full AI analysis.'
          }
        </p>
      </div>

      <div className="space-y-6">
        {/* Resume Upload */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            <FileText size={14} className="inline mr-2" />Resume / CV
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => resumeInputRef.current?.click()}
              className={`flex-1 py-4 border-2 border-dashed rounded-xl text-center transition-all ${resumeText
                  ? `border-${accentColor}-500/30 bg-${accentColor}-500/5 text-${accentColor}-400`
                  : 'border-slate-600 hover:border-slate-500 text-slate-400'
                }`}
            >
              <Upload size={20} className="mx-auto mb-2" />
              <p className="text-sm font-medium">
                {resumeFileName || 'Upload PDF or Text file'}
              </p>
            </button>
            <input
              ref={resumeInputRef}
              type="file"
              accept=".pdf,.txt,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, setResumeText, setResumeFileName, 'Resume');
              }}
            />
          </div>
          {resumeText && !candidateName && (
            <button
              onClick={analyzeResume}
              disabled={isAnalyzing}
              className={`mt-4 w-full py-3 bg-${accentColor}-600 hover:bg-${accentColor}-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
            >
              {isAnalyzing ? (
                <><Loader2 className="animate-spin" size={16} /> Analyzing with AI...</>
              ) : (
                <><Sparkles size={16} /> Extract Details with AI</>
              )}
            </button>
          )}
        </div>

        {/* Job Description Upload */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            <Briefcase size={14} className="inline mr-2" />Job Description (Optional)
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => jdInputRef.current?.click()}
              className={`flex-1 py-4 border-2 border-dashed rounded-xl text-center transition-all ${jobDescriptionText
                  ? 'border-indigo-500/30 bg-indigo-500/5 text-indigo-400'
                  : 'border-slate-600 hover:border-slate-500 text-slate-400'
                }`}
            >
              <Upload size={20} className="mx-auto mb-2" />
              <p className="text-sm font-medium">
                {jdFileName || 'Upload job description'}
              </p>
            </button>
            <input
              ref={jdInputRef}
              type="file"
              accept=".pdf,.txt,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, setJobDescriptionText, setJdFileName, 'Job Description');
              }}
            />
          </div>
        </div>

        {/* Candidate Details */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            <User size={14} className="inline mr-2" />Candidate Details
          </label>
          <input
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none placeholder:text-slate-600"
            placeholder="Candidate Name"
          />
          <input
            value={candidateRole}
            onChange={(e) => setCandidateRole(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none placeholder:text-slate-600"
            placeholder="Target Role (e.g. Software Engineer)"
          />
        </div>

        {/* Custom Questions — Recruiter Mode Only */}
        {!isPractice && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Custom Questions (Optional)
            </label>
            <textarea
              value={customQuestions}
              onChange={(e) => setCustomQuestions(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 h-32 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none placeholder:text-slate-600 text-sm"
              placeholder="Enter any specific questions you want the AI to ask..."
            />
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={!candidateName.trim() || !candidateRole.trim()}
          className={`w-full py-4 bg-gradient-to-r from-${accentColor}-600 to-${accentColor === 'emerald' ? 'teal' : 'purple'}-600 hover:brightness-110 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-${accentColor}-500/20 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          Start {isPractice ? 'Practice' : 'Screening'} Session
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default SetupPanel;