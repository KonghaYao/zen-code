import { vi } from 'vitest';

// 初始化 DOM 环境（在 bun test 中 document 可能未定义）
if (typeof document === 'undefined') {
    const { Window } = await import('happy-dom');
    const happyWindow = new Window({ url: 'http://localhost/' });
    Object.assign(globalThis, {
        document: happyWindow.document,
        window: happyWindow,
        navigator: happyWindow.navigator,
        HTMLElement: happyWindow.HTMLElement,
        Element: happyWindow.Element,
        Node: happyWindow.Node,
        Event: happyWindow.Event,
        CustomEvent: happyWindow.CustomEvent,
        MutationObserver: happyWindow.MutationObserver,
        ResizeObserver: happyWindow.ResizeObserver,
        getComputedStyle: happyWindow.getComputedStyle.bind(happyWindow),
        requestAnimationFrame: happyWindow.requestAnimationFrame.bind(happyWindow),
        cancelAnimationFrame: happyWindow.cancelAnimationFrame.bind(happyWindow),
    });
}

// Mock Ink terminal
vi.mock('ink', async () => {
    const actual = await vi.importActual('ink');
    return {
        ...actual,
        render: vi.fn(),
        Box: 'Box',
        Text: 'Text',
    };
});
