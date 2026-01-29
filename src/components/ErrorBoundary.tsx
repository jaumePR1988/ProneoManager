
import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Media error handling
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', color: 'red', fontFamily: 'monospace', backgroundColor: 'black', minHeight: '100vh', wordBreak: 'break-word' }}>
                    <h1>Algo ha salido mal.</h1>
                    <h2 style={{ color: 'white' }}>Error en iOS/Mobile:</h2>
                    <p>{this.state.error && this.state.error.toString()}</p>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '10px', color: '#888' }}>
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </pre>
                    <button
                        onClick={() => {
                            // Clear caches and local storage
                            localStorage.clear();
                            if ('caches' in window) {
                                caches.keys().then((names) => {
                                    names.forEach(name => {
                                        caches.delete(name);
                                    });
                                });
                            }
                            window.location.reload();
                        }}
                        style={{ marginTop: '20px', padding: '10px 20px', fontSize: '16px' }}
                    >
                        Borrar Caché y Recargar
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
