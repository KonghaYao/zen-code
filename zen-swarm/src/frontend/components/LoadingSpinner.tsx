/**
 * LoadingSpinner 加载状态组件（极简风格）
 */

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
}

export function LoadingSpinner(props: LoadingSpinnerProps) {
    const sizeClass = () => {
        switch (props.size) {
            case 'sm':
                return 'w-4 h-4';
            case 'lg':
                return 'w-8 h-8';
            default:
                return 'w-6 h-6';
        }
    };

    return (
        <div className="flex items-center justify-center space-x-2">
            <div className={`${sizeClass()} loading-spinner`} />
            {props.text && <span className="text-text-muted text-sm">{props.text}</span>}
        </div>
    );
}

export function LoadingOverlay() {
    return (
        <div className="text-center py-8 text-text-muted">
            <LoadingSpinner size="lg" />
        </div>
    );
}
