import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, AlertCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextValue {
    showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({
    showToast: () => { }
});

export const useToast = () => useContext(ToastContext);

const ICONS: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 size={18} className="text-emerald-400" />,
    error: <AlertCircle size={18} className="text-red-400" />,
    warning: <AlertTriangle size={18} className="text-amber-400" />,
    info: <Info size={18} className="text-blue-400" />
};

const BORDER_COLORS: Record<ToastType, string> = {
    success: 'border-l-emerald-500',
    error: 'border-l-red-500',
    warning: 'border-l-amber-500',
    info: 'border-l-blue-500'
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(toast.id);
        }, toast.duration || 4000);
        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, onDismiss]);

    return (
        <div
            className={`flex items-start gap-3 bg-slate-800 border border-slate-700 border-l-4 ${BORDER_COLORS[toast.type]} rounded-xl p-4 shadow-2xl max-w-sm w-full animate-slideIn pointer-events-auto`}
        >
            <div className="mt-0.5 shrink-0">{ICONS[toast.type]}</div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{toast.title}</p>
                {toast.message && (
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{toast.message}</p>
                )}
            </div>
            <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 text-slate-500 hover:text-white transition-colors p-1"
            >
                <X size={14} />
            </button>
        </div>
    );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((type: ToastType, title: string, message?: string, duration?: number) => {
        const id = Date.now().toString() + Math.random().toString(36).substring(2);
        setToasts(prev => [...prev.slice(-4), { id, type, title, message, duration }]); // Max 5 toasts
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Toast Container - Fixed at top right */}
            <div className="fixed top-20 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};
