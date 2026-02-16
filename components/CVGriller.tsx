import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { getGeminiApiKey } from '../utils/apiConfig';
import { checkGeminiRateLimit, formatRetryTime } from '../utils/rateLimiter';
import { useToast } from './Toast';
import { readTextFile, extractTextFromPDF } from '../utils/fileUtils';
import { incrementUsageStat, saveReport } from '../utils/firestore';
import {
  ChevronLeft, Upload, FileText, Briefcase,
  Loader2, Sparkles, AlertCircle, CheckCircle2,
  Target, Lightbulb, TrendingDown
} from 'lucide-react';

interface CVGrillerProps {
  onBack: () => void;
  userUid: string;
}

const CVGriller: React.FC<CVGrillerProps> = ({ onBack, userUid }) => {
  const { showToast } = useToast();
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const [jdFileName, setJdFileName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string>('');
  const resumeRef = useRef<HTMLInputElement>(null);
  const jdRef = useRef<HTMLInputElement>(null);

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
        showToast('warning', `Empty ${label}`, `The file "${file.name}" appears to be empty.`);
        return;
      }

      setTextFn(text);
      setFileNameFn(file.name);
      showToast('success', `${label} uploaded`, `"${file.name}" ready for analysis.`);
    } catch {
      showToast('error', `Failed to read ${label}`, 'Make sure it\'s a valid PDF or text file.');
    }
  };

  const handleAnalyze = async () => {
    if (!resumeText || !jdText) {
      showToast('warning', 'Missing files', 'Please upload both a resume and a job description.');
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
      showToast('error', 'API Key Missing', 'Gemini API key is not configured.');
      return;
    }

    setIsAnalyzing(true);
    setResult('');

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `You are a brutally honest ATS expert and career coach. Analyze this resume against the job description.

Provide your analysis in this EXACT format:

## 🎯 Match Score: X/100

## ⚠️ Critical Weaknesses
- [List the biggest dealbreakers]

## 📝 Missing Keywords & Skills
- [List specific ATS keywords from the JD that are missing from the resume]

## 💡 Action Plan
1. [Specific, actionable improvement steps]
2. [...]

## ✅ What's Working
- [Positive aspects of the resume]

Keep each section concise (3-5 bullet points max). Be specific, not generic.

RESUME:
${resumeText.substring(0, 4000)}

JOB DESCRIPTION:
${jdText.substring(0, 3000)}`,
      });

      const resultText = response?.text || 'No analysis generated. Please try again.';
      setResult(resultText);

      // Track usage
      await incrementUsageStat(userUid, 'totalCVGrills');

      // Save report
      await saveReport(userUid, {
        type: 'cv-griller',
        candidateName: 'Self',
        role: 'CV Analysis',
        report: null,
        rawResult: resultText,
        transcripts: [],
        createdAt: Date.now(),
      });

      showToast('success', 'Analysis complete', 'Your CV has been grilled! 🔥');
    } catch (error: any) {
      if (error?.status === 429) {
        showToast('warning', 'API Rate Limit', 'Too many requests. Please wait a moment and try again.');
      } else {
        showToast('error', 'Analysis failed', 'Could not analyze your CV. Please try again.');
        console.error('CV Analysis error:', error);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 w-full animate-fadeIn">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors px-4 py-2 rounded-full hover:bg-slate-800"
      >
        <ChevronLeft size={20} /> Back to Dashboard
      </button>

      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-2">
          🔥 CV Griller
        </h2>
        <p className="text-slate-400">Upload your CV and a job description for a brutally honest ATS analysis.</p>
      </div>

      {!result ? (
        <div className="space-y-6">
          {/* Resume Upload */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              <FileText size={14} className="inline mr-2" />Your Resume / CV
            </label>
            <button
              onClick={() => resumeRef.current?.click()}
              className={`w-full py-8 border-2 border-dashed rounded-xl text-center transition-all ${resumeText
                  ? 'border-amber-500/30 bg-amber-500/5 text-amber-400'
                  : 'border-slate-600 hover:border-slate-500 text-slate-400'
                }`}
            >
              {resumeFileName ? (
                <><CheckCircle2 size={24} className="mx-auto mb-2 text-amber-400" /><p className="font-medium">{resumeFileName}</p></>
              ) : (
                <><Upload size={24} className="mx-auto mb-2" /><p className="font-medium">Upload PDF or Text file</p></>
              )}
            </button>
            <input ref={resumeRef} type="file" accept=".pdf,.txt" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, setResumeText, setResumeFileName, 'Resume'); }}
            />
          </div>

          {/* JD Upload */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              <Briefcase size={14} className="inline mr-2" />Job Description
            </label>
            <button
              onClick={() => jdRef.current?.click()}
              className={`w-full py-8 border-2 border-dashed rounded-xl text-center transition-all ${jdText
                  ? 'border-indigo-500/30 bg-indigo-500/5 text-indigo-400'
                  : 'border-slate-600 hover:border-slate-500 text-slate-400'
                }`}
            >
              {jdFileName ? (
                <><CheckCircle2 size={24} className="mx-auto mb-2 text-indigo-400" /><p className="font-medium">{jdFileName}</p></>
              ) : (
                <><Upload size={24} className="mx-auto mb-2" /><p className="font-medium">Upload job description</p></>
              )}
            </button>
            <input ref={jdRef} type="file" accept=".pdf,.txt" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, setJdText, setJdFileName, 'Job Description'); }}
            />
            <p className="text-xs text-slate-500 mt-3">Or paste the job description text directly:</p>
            <textarea
              value={jdText}
              onChange={(e) => { setJdText(e.target.value); setJdFileName(''); }}
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 h-32 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none placeholder:text-slate-600 text-sm mt-2"
              placeholder="Paste job description here..."
            />
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={!resumeText || !jdText || isAnalyzing}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <><Loader2 className="animate-spin" size={20} /> Analyzing your CV...</>
            ) : (
              <><Sparkles size={20} /> Grill My CV 🔥</>
            )}
          </button>
        </div>
      ) : (
        /* Results */
        <div className="space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
            <div className="prose prose-invert prose-sm max-w-none">
              {result.split('\n').map((line, i) => {
                if (line.startsWith('## ')) {
                  return <h2 key={i} className="text-xl font-bold text-white mt-6 mb-3 first:mt-0">{line.replace('## ', '')}</h2>;
                }
                if (line.startsWith('- ')) {
                  return <p key={i} className="text-slate-300 ml-4 my-1">• {line.substring(2)}</p>;
                }
                if (line.match(/^\d+\./)) {
                  return <p key={i} className="text-slate-300 ml-4 my-1">{line}</p>;
                }
                if (line.trim()) {
                  return <p key={i} className="text-slate-300 my-1">{line}</p>;
                }
                return null;
              })}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => { setResult(''); setResumeText(''); setJdText(''); setResumeFileName(''); setJdFileName(''); }}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors"
            >
              Analyze Another CV
            </button>
            <button
              onClick={onBack}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CVGriller;