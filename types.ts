export enum AppState {
  SETUP = 'SETUP',
  INTERVIEW = 'INTERVIEW',
  REPORT = 'REPORT',
  DASHBOARD = 'DASHBOARD',
  CV_GRILLER = 'CV_GRILLER',
  JOB_TRACKER = 'JOB_TRACKER',
}

export type ServiceMode = 'recruiter' | 'practice';

export type SubscriptionTier = 'free' | 'pro';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  tier: SubscriptionTier;
  createdAt: number;
  totalInterviews: number;
  totalPractice: number;
  totalCVGrills: number;
}

export interface CandidateProfile {
  name: string;
  role: string;
  resumeText: string;
  jobDescriptionText: string;
  customQuestions?: string;
  mode?: ServiceMode;
}

export interface TranscriptionItem {
  speaker: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export interface InterviewReport {
  summary: string;
  communicationScore: number;
  technicalScore: number;
  communicationFeedback: string;
  technicalFeedback: string;
  improvementTips: string[];
}

export interface SavedReport {
  id?: string;
  type: 'recruiter' | 'practice' | 'cv-griller';
  candidateName: string;
  role: string;
  report: InterviewReport | null;
  rawResult?: string; // For CV Griller text results
  transcripts: TranscriptionItem[];
  createdAt: number;
}

// Job Application Tracker Types
export type JobStatus = 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn' | 'saved';

export interface JobApplication {
  id?: string;
  company: string;
  role: string;
  status: JobStatus;
  dateApplied: number;
  url?: string;
  notes?: string;
  salary?: string;
  location?: string;
  updatedAt: number;
}