/**
 * Firestore Service Layer
 * 
 * All database reads/writes for SkillProbe Pro.
 * Collections:
 *   - users/{uid} — User profile & settings
 *   - users/{uid}/reports/{reportId} — Saved interview/CV reports
 *   - users/{uid}/jobs/{jobId} — Job application tracker entries
 */

import {
    doc, setDoc, getDoc, updateDoc, addDoc,
    collection, query, orderBy, getDocs, deleteDoc,
    serverTimestamp, increment, Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, SavedReport, JobApplication, SubscriptionTier } from '../types';

// ============================================================
// USER PROFILE
// ============================================================

export const createUserProfile = async (
    uid: string,
    email: string,
    displayName: string
): Promise<UserProfile> => {
    const profile: UserProfile = {
        uid,
        email,
        displayName,
        tier: 'free',
        createdAt: Date.now(),
        totalInterviews: 0,
        totalPractice: 0,
        totalCVGrills: 0,
    };

    try {
        await setDoc(doc(db, 'users', uid), profile, { merge: true });
    } catch (error) {
        console.error('Failed to create user profile:', error);
        // Don't throw — let the user continue even if Firestore fails
    }

    return profile;
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
            return snap.data() as UserProfile;
        }
    } catch (error) {
        console.error('Failed to get user profile:', error);
    }
    return null;
};

export const incrementUsageStat = async (
    uid: string,
    field: 'totalInterviews' | 'totalPractice' | 'totalCVGrills'
): Promise<void> => {
    try {
        await updateDoc(doc(db, 'users', uid), {
            [field]: increment(1)
        });
    } catch (error) {
        console.error('Failed to update usage stat:', error);
    }
};

// ============================================================
// SAVED REPORTS
// ============================================================

export const saveReport = async (uid: string, report: SavedReport): Promise<string | null> => {
    try {
        const ref = await addDoc(
            collection(db, 'users', uid, 'reports'),
            { ...report, createdAt: Date.now() }
        );
        return ref.id;
    } catch (error) {
        console.error('Failed to save report:', error);
        return null;
    }
};

export const getUserReports = async (uid: string): Promise<SavedReport[]> => {
    try {
        const q = query(
            collection(db, 'users', uid, 'reports'),
            orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedReport));
    } catch (error) {
        console.error('Failed to get reports:', error);
        return [];
    }
};

// ============================================================
// JOB APPLICATION TRACKER
// ============================================================

export const addJobApplication = async (uid: string, job: Omit<JobApplication, 'id'>): Promise<string | null> => {
    try {
        const ref = await addDoc(
            collection(db, 'users', uid, 'jobs'),
            { ...job, updatedAt: Date.now() }
        );
        return ref.id;
    } catch (error) {
        console.error('Failed to add job:', error);
        return null;
    }
};

export const updateJobApplication = async (
    uid: string,
    jobId: string,
    updates: Partial<JobApplication>
): Promise<void> => {
    try {
        await updateDoc(doc(db, 'users', uid, 'jobs', jobId), {
            ...updates,
            updatedAt: Date.now()
        });
    } catch (error) {
        console.error('Failed to update job:', error);
    }
};

export const deleteJobApplication = async (uid: string, jobId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, 'users', uid, 'jobs', jobId));
    } catch (error) {
        console.error('Failed to delete job:', error);
    }
};

export const getUserJobs = async (uid: string): Promise<JobApplication[]> => {
    try {
        const q = query(
            collection(db, 'users', uid, 'jobs'),
            orderBy('updatedAt', 'desc')
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as JobApplication));
    } catch (error) {
        console.error('Failed to get jobs:', error);
        return [];
    }
};
