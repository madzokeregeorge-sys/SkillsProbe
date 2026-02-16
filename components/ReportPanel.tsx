import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { getGeminiApiKey } from '../utils/apiConfig';
import { checkGeminiRateLimit, formatRetryTime } from '../utils/rateLimiter';
import { useToast } from './Toast';
import { saveReport, incrementUsageStat } from '../utils/firestore';
import { CandidateProfile, ServiceMode, TranscriptionItem, InterviewReport, SavedReport } from '../types';
import {
    ChevronLeft, Download, Loader2, Star,
    MessageCircle, Code, TrendingUp, CheckCircle2,
    Copy, FileText, Send
} from 'lucide-react';

interface ReportPanelProps {
    report: InterviewReport | null;
    transcripts: TranscriptionItem[];
    profile: CandidateProfile | null;
    mode: ServiceMode;
    onBack: () => void;
    userUid: string;
}

const ReportPanel: React.FC<ReportPanelProps> = ({
    report: initialReport, transcripts, profile, mode, onBack, userUid
}) => {
    const { showToast } = useToast();
    const [report, setReport] = useState<InterviewReport | null>(initialReport);
    const [isGenerating, setIsGenerating] = useState(!initialReport);
    const [showTranscript, setShowTranscript] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    // Generate report from transcripts if not already provided
    useEffect(() => {
        if (!initialReport && transcripts.length > 0) {
            generateReport();
        }
    }, []);

    const generateReport = async () => {
        const { allowed, retryAfterMs } = checkGeminiRateLimit();
        if (!allowed) {
            showToast('warning', 'Rate limit', `Report generation available in ${formatRetryTime(retryAfterMs)}.`);
            setIsGenerating(false);
            return;
        }

        const apiKey = getGeminiApiKey();
        if (!apiKey) {
            showToast('error', 'API Key Missing', 'Cannot generate report without API key.');
            setIsGenerating(false);
            return;
        }

        setIsGenerating(true);

        try {
            const ai = new GoogleGenAI({ apiKey });
            const transcriptText = transcripts
                .map(t => `${t.speaker === 'user' ? 'Candidate' : 'Interviewer'}: ${t.text}`)
                .join('\n');

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: `You are an expert interview evaluator. Analyze this interview transcript and provide a detailed report.

Return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "summary": "2-3 sentence overall assessment",
  "communicationScore": <number 0-100>,
  "technicalScore": <number 0-100>,
  "communicationFeedback": "Detailed feedback on communication skills",
  "technicalFeedback": "Detailed feedback on technical knowledge",
  "improvementTips": ["tip 1", "tip 2", "tip 3", "tip 4", "tip 5"]
}

Candidate: ${profile?.name || 'Unknown'}
Role: ${profile?.role || 'Unknown'}
Mode: ${mode === 'recruiter' ? 'Formal Screening' : 'Practice Session'}

Transcript:
${transcriptText.substring(0, 6000)}`,
            });

            const text = response?.text || '';

            // Safely parse JSON — try to extract from response
            let parsed: InterviewReport | null = null;
            try {
                // Try direct parse first
                parsed = JSON.parse(text);
            } catch {
                // Try to find JSON in the response (Gemini sometimes wraps in markdown)
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        parsed = JSON.parse(jsonMatch[0]);
                    } catch {
                        // Still failed
                    }
                }
            }

            if (parsed && parsed.summary && typeof parsed.communicationScore === 'number') {
                setReport(parsed);

                // Save to Firestore
                const savedReport: SavedReport = {
                    type: mode,
                    candidateName: profile?.name || 'Unknown',
                    role: profile?.role || 'Unknown',
                    report: parsed,
                    transcripts,
                    createdAt: Date.now(),
                };
                await saveReport(userUid, savedReport);
                setIsSaved(true);
                showToast('success', 'Report generated', 'Your interview report is ready.');
            } else {
                showToast('error', 'Report parsing failed', 'The AI response could not be parsed. You can view the transcript below.');
                console.error('Failed to parse report. Raw response:', text);
            }
        } catch (error: any) {
            if (error?.status === 429) {
                showToast('warning', 'API Rate Limit', 'Too many requests. Please try again in a moment.');
            } else {
                showToast('error', 'Report generation failed', 'Could not generate the report. Please try again.');
                console.error('Report generation error:', error);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!report) return;

        const content = `
SKILLPROBE INTERVIEW REPORT
============================
Date: ${new Date().toLocaleDateString()}
Candidate: ${profile?.name || 'N/A'}
Role: ${profile?.role || 'N/A'}
Type: ${mode === 'recruiter' ? 'Recruiter Screening' : 'Practice Session'}

SUMMARY
-------
${report.summary}

SCORES
------
Communication: ${report.communicationScore}/100
Technical: ${report.technicalScore}/100

COMMUNICATION FEEDBACK
-----------------------
${report.communicationFeedback}

TECHNICAL FEEDBACK
-------------------
${report.technicalFeedback}

IMPROVEMENT TIPS
-----------------
${report.improvementTips?.map((tip, i) => `${i + 1}. ${tip}`).join('\n') || 'N/A'}

TRANSCRIPT
-----------
${transcripts.map(t => `[${t.speaker === 'user' ? 'Candidate' : 'AI'}] ${t.text}`).join('\n')}

---
Generated by SkillProbe AI
    `.trim();

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `SkillProbe_Report_${profile?.name?.replace(/ /g, '_') || 'report'}_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('success', 'Report downloaded', 'Saved as a text file.');
    };

    const handleCopyReport = () => {
        if (!report) return;
        const text = `SkillProbe Report — ${profile?.name || ''} — ${profile?.role || ''}\n\nSummary: ${report.summary}\nCommunication: ${report.communicationScore}/100\nTechnical: ${report.technicalScore}/100\n\n${report.communicationFeedback}\n\n${report.technicalFeedback}\n\nTips:\n${report.improvementTips?.map((t, i) => `${i + 1}. ${t}`).join('\n') || ''}`;
        navigator.clipboard.writeText(text).then(() => {
            showToast('success', 'Copied to clipboard', 'Report text copied.');
        });
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-400';
        if (score >= 60) return 'text-amber-400';
        return 'text-red-400';
    };

    const getScoreBg = (score: number) => {
        if (score >= 80) return 'bg-emerald-500/20 border-emerald-500/30';
        if (score >= 60) return 'bg-amber-500/20 border-amber-500/30';
        return 'bg-red-500/20 border-red-500/30';
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
                    📊 Interview Report
                </h2>
                <p className="text-slate-400">
                    {profile?.name} — {profile?.role} • {mode === 'recruiter' ? 'Recruiter Screening' : 'Practice Session'}
                </p>
            </div>

            {isGenerating ? (
                <div className="text-center py-20 bg-slate-800/50 rounded-3xl border border-slate-700/50">
                    <Loader2 size={48} className="animate-spin text-indigo-400 mx-auto mb-6" />
                    <p className="text-white text-xl font-bold mb-2">Analyzing Your Interview</p>
                    <p className="text-slate-400">SkillProbe AI is compiling your personalized report...</p>
                </div>
            ) : report ? (
                <div className="space-y-6">
                    {/* Summary */}
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Summary</h3>
                        <p className="text-slate-200 leading-relaxed">{report.summary}</p>
                    </div>

                    {/* Scores */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className={`rounded-2xl p-6 border ${getScoreBg(report.communicationScore)}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <MessageCircle size={18} className="text-blue-400" />
                                <h3 className="text-sm font-bold text-slate-300">Communication</h3>
                            </div>
                            <p className={`text-5xl font-extrabold ${getScoreColor(report.communicationScore)}`}>
                                {report.communicationScore}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">out of 100</p>
                        </div>

                        <div className={`rounded-2xl p-6 border ${getScoreBg(report.technicalScore)}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <Code size={18} className="text-purple-400" />
                                <h3 className="text-sm font-bold text-slate-300">Technical</h3>
                            </div>
                            <p className={`text-5xl font-extrabold ${getScoreColor(report.technicalScore)}`}>
                                {report.technicalScore}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">out of 100</p>
                        </div>
                    </div>

                    {/* Feedback */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                                <MessageCircle size={16} /> Communication Feedback
                            </h3>
                            <p className="text-slate-300 text-sm leading-relaxed">{report.communicationFeedback}</p>
                        </div>
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
                                <Code size={16} /> Technical Feedback
                            </h3>
                            <p className="text-slate-300 text-sm leading-relaxed">{report.technicalFeedback}</p>
                        </div>
                    </div>

                    {/* Tips */}
                    {report.improvementTips && report.improvementTips.length > 0 && (
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-amber-400 mb-4 flex items-center gap-2">
                                <TrendingUp size={16} /> Improvement Tips
                            </h3>
                            <div className="space-y-3">
                                {report.improvementTips.map((tip, i) => (
                                    <div key={i} className="flex items-start gap-3 text-sm">
                                        <span className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-slate-400 mt-0.5">
                                            {i + 1}
                                        </span>
                                        <p className="text-slate-300 leading-relaxed">{tip}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Transcript Toggle */}
                    {transcripts.length > 0 && (
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
                            <button
                                onClick={() => setShowTranscript(!showTranscript)}
                                className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-700/50 transition-colors"
                            >
                                <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2">
                                    <FileText size={16} /> Full Transcript ({transcripts.length} messages)
                                </h3>
                                <ChevronLeft
                                    size={18}
                                    className={`text-slate-500 transition-transform ${showTranscript ? '-rotate-90' : 'rotate-0'}`}
                                />
                            </button>
                            {showTranscript && (
                                <div className="p-6 pt-0 max-h-80 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-700">
                                    {transcripts.map((item, index) => (
                                        <div key={index} className={`flex ${item.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] p-3 rounded-xl text-sm ${item.speaker === 'user'
                                                    ? 'bg-indigo-600/20 text-indigo-200'
                                                    : 'bg-slate-700 text-slate-300'
                                                }`}>
                                                {item.text}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                        >
                            <Download size={18} /> Download Report
                        </button>
                        <button
                            onClick={handleCopyReport}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors"
                        >
                            <Copy size={18} /> Copy to Clipboard
                        </button>
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors"
                        >
                            Back to Dashboard
                        </button>
                    </div>

                    {isSaved && (
                        <p className="text-xs text-slate-500 flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-400" /> Report saved to your account
                        </p>
                    )}
                </div>
            ) : (
                /* No report generated — show transcript only */
                <div className="text-center py-12">
                    <p className="text-slate-400 mb-4">Report could not be generated.</p>
                    <button
                        onClick={generateReport}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all"
                    >
                        Retry Report Generation
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReportPanel;