import React, { Component, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Global Error Boundary
 * 
 * Catches any unhandled JS error in child components and shows a
 * friendly recovery screen instead of a white page crash.
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('SkillProbe Error Boundary Caught:', error, errorInfo);
        // TODO: Send to error reporting service (Sentry, etc.)
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        this.setState({ hasError: false, error: null });
        window.location.hash = '';
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-900 font-sans p-6">
                    <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center shadow-2xl">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="text-red-400" size={32} />
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
                        <p className="text-slate-400 mb-6 leading-relaxed">
                            SkillProbe encountered an unexpected error. Your data is safe — try refreshing the page.
                        </p>

                        {this.state.error && (
                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-6 text-left">
                                <p className="text-xs text-slate-500 font-mono break-all">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={this.handleGoHome}
                                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-bold transition-colors"
                            >
                                Go Home
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={16} />
                                Reload
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
