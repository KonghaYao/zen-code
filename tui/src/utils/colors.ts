/**
 * Terminal Color Palette
 *
 * Cross-platform compatible colors for Windows (CMD/PowerShell/WSL) and Mac (Terminal/iTerm2)
 *
 * Uses Ink/Chalk color names which map to platform-appropriate ANSI codes:
 * - Mac: Full 256-color + TrueColor support
 * - Windows 10+: ANSI support in CMD/PowerShell
 * - Legacy Windows: Fallback to basic 16 colors
 *
 * Reference: https://github.com/chalk/chalk#colors
 */

export enum Color {
    // Basic colors (safe on all platforms)
    BLACK = 'black',
    RED = 'red',
    GREEN = 'green',
    YELLOW = 'yellow',
    BLUE = 'blue',
    MAGENTA = 'magenta',
    CYAN = 'cyan',
    WHITE = 'white',

    // Bright variants (Windows 10+/Mac)
    GRAY = 'gray',
    RED_BRIGHT = 'redBright',
    GREEN_BRIGHT = 'greenBright',
    YELLOW_BRIGHT = 'yellowBright',
    BLUE_BRIGHT = 'blueBright',
    MAGENTA_BRIGHT = 'magentaBright',
    CYAN_BRIGHT = 'cyanBright',
    WHITE_BRIGHT = 'whiteBright',

    // Semantic colors for UI elements
    SUCCESS = 'green',
    WARNING = 'yellow',
    ERROR = 'red',
    INFO = 'cyan',
    MUTED = 'gray',
    HIGHLIGHT = 'cyanBright',
    ACCENT = 'magentaBright',
    BORDER = 'gray',
    LINK = 'blueBright',
    FOCUS = 'cyan',
    ACTIVE = 'greenBright',
    DISABLED = 'gray',
    CODE = 'yellowBright',
    KEYWORD = 'magenta',
    STRING = 'green',
    NUMBER = 'yellow',
    COMMENT = 'gray',
    PRIMARY = 'cyan',
    SECONDARY = 'magenta',
}

/**
 * Platform compatibility detection
 */
const isModernTerminal = (): boolean => {
    return (
        process.env.TERM?.includes('256color') ||
        process.env.TERM === 'xterm-256color' ||
        process.env.WT_SESSION !== undefined || // Windows Terminal
        process.platform === 'darwin' || // Mac usually supports
        process.env.TERM_PROGRAM === 'vscode' || // VSCode
        process.env.TERM_PROGRAM === 'iTerm.app' // iTerm2
    );
};

/**
 * Get the terminal name/identifier
 */
export const getTerminalName = (): string => {
    if (process.env.TERM_PROGRAM === 'iTerm.app') return 'iTerm2';
    if (process.env.WT_SESSION !== undefined) return 'Windows Terminal';
    if (process.env.TERM_PROGRAM === 'vscode') return 'VSCode';
    if (process.env.TERM?.includes('screen')) return 'GNU Screen';
    if (process.env.TERM?.includes('tmux')) return 'tmux';
    return process.env.TERM || 'unknown';
};

/**
 * Color configuration with automatic platform detection
 *
 * Usage:
 *   <Text color={Palette.primary.color}>Text</Text>
 *
 * Each color entry has:
 * - hex: The TrueColor hex value
 * - fallback: Safe fallback to named Color enum
 * - color (getter): Auto-detects platform and returns appropriate value
 */
export const Palette = {
    // Status Colors
    success: {
        hex: '#4fd6be',
        fallback: Color.GREEN,
    },
    warning: {
        hex: '#ffdb95',
        fallback: Color.YELLOW,
    },
    error: {
        hex: '#f7768e',
        fallback: Color.RED,
    },
    info: {
        hex: '#7dcfff',
        fallback: Color.CYAN,
    },

    // UI Elements
    muted: {
        hex: '#565f89',
        fallback: Color.GRAY,
    },
    highlight: {
        hex: '#7dcfff',
        fallback: Color.CYAN_BRIGHT,
    },
    accent: {
        hex: '#bb9af7',
        fallback: Color.MAGENTA_BRIGHT,
    },
    border: {
        hex: '#414868',
        fallback: Color.GRAY,
    },

    // Brand Colors
    primary: {
        hex: '#7aa2f7',
        fallback: Color.CYAN,
    },
    secondary: {
        hex: '#bb9af7',
        fallback: Color.MAGENTA,
    },

    // Syntax Highlighting (Tokyo Night inspired)
    keyword: {
        hex: '#bb9af7',
        fallback: Color.MAGENTA,
    },
    function: {
        hex: '#7aa2f7',
        fallback: Color.BLUE,
    },
    string: {
        hex: '#9ece6a',
        fallback: Color.GREEN,
    },
    number: {
        hex: '#ff9e64',
        fallback: Color.YELLOW,
    },
    comment: {
        hex: '#565f89',
        fallback: Color.GRAY,
    },
    variable: {
        hex: '#c0caf5',
        fallback: Color.WHITE,
    },
    type: {
        hex: '#0db9d7',
        fallback: Color.CYAN,
    },
    constant: {
        hex: '#e0af68',
        fallback: Color.YELLOW,
    },

    // Text Colors
    textPrimary: {
        hex: '#c0caf5',
        fallback: Color.WHITE,
    },
    textSecondary: {
        hex: '#9aa5ce',
        fallback: Color.WHITE_BRIGHT,
    },
    textMuted: {
        hex: '#565f89',
        fallback: Color.GRAY,
    },

    // Background Colors (for components that support it)
    bg: {
        hex: '#1a1b26',
        fallback: Color.BLACK,
    },
    bgCard: {
        hex: '#24283b',
        fallback: Color.BLACK,
    },

    // Material Colors
    indigo: {
        hex: '#6366f1',
        fallback: Color.BLUE,
    },
    purple: {
        hex: '#a855f7',
        fallback: Color.MAGENTA,
    },
    pink: {
        hex: '#ec4899',
        fallback: Color.RED_BRIGHT,
    },
    rose: {
        hex: '#f43f5e',
        fallback: Color.RED,
    },
    orange: {
        hex: '#f97316',
        fallback: Color.YELLOW_BRIGHT,
    },
    amber: {
        hex: '#f59e0b',
        fallback: Color.YELLOW,
    },
    emerald: {
        hex: '#10b981',
        fallback: Color.GREEN,
    },
    teal: {
        hex: '#14b8a6',
        fallback: Color.CYAN,
    },
    sky: {
        hex: '#0ea5e9',
        fallback: Color.BLUE,
    },
};

export const getColor = (name: keyof typeof Palette) => {
    if (!(name in Palette)) {
        name = 'sky';
    }
    return isModernTerminal() ? Palette[name].hex : Palette[name].fallback;
};
