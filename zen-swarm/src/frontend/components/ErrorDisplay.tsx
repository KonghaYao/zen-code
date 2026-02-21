/**
 * ErrorDisplay 错误展示组件（极简风格）
 */

interface ErrorDisplayProps {
    error: Error | string;
    onRetry?: () => void;
}

export function ErrorDisplay(props: ErrorDisplayProps) {
    const errorMessage = typeof props.error === 'string' ? props.error : props.error.message;

    return (
        <div className="bg-white border border-[var(--color-border-subtle)] rounded-lg p-6 text-center shadow-sm">
            <div className="text-[var(--color-error)] mb-3 flex items-center justify-center gap-2">
                <span className="text-2xl">⚠️</span>
                <span className="text-lg font-medium">Error</span>
            </div>
            <div className="text-[var(--color-text-secondary)] text-sm mb-4">{errorMessage}</div>
            {props.onRetry && (
                <button onClick={props.onRetry} className="btn-secondary">
                    Retry
                </button>
            )}
        </div>
    );
}

export function EmptyState(props: { message: string; action?: { label: string; onClick: () => void } }) {
    return (
        <div className="bg-white border border-[var(--color-border-subtle)] rounded-lg p-8 text-center text-[var(--color-text-muted)]">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-[var(--color-text-secondary)]">{props.message}</p>
            {props.action && (
                <button onClick={props.action.onClick} className="btn-primary mt-6">
                    {props.action.label}
                </button>
            )}
        </div>
    );
}
