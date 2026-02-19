/**
 * ErrorDisplay 错误展示组件
 */

interface ErrorDisplayProps {
    error: Error | string;
    onRetry?: () => void;
}

export function ErrorDisplay(props: ErrorDisplayProps) {
    const errorMessage = typeof props.error === 'string' ? props.error : props.error.message;

    return (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-center">
            <div className="text-red-400 mb-2">❌ Error</div>
            <div className="text-red-300 text-sm mb-4">{errorMessage}</div>
            {props.onRetry && (
                <button
                    onClick={props.onRetry}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
                >
                    Retry
                </button>
            )}
        </div>
    );
}

export function EmptyState(props: { message: string; action?: { label: string; onClick: () => void } }) {
    return (
        <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
            <p>{props.message}</p>
            {props.action && (
                <button
                    onClick={props.action.onClick}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                    {props.action.label}
                </button>
            )}
        </div>
    );
}
