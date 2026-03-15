// import { defineConfig } from 'electrobun/bun';

export default {
    app: {
        name: 'Zen Swarm',
        identifier: 'com.zenswarm.desktop',
        version: '1.0.0',
        iconPath: '../zen-swarm/src/frontend/assets/icon.png',
    },
    build: {
        bun: {
            entrypoint: './src/main.ts',
        },
    },
    // 关闭最后一个窗口后不退出（托盘后台运行）
    runtime: {
        exitOnLastWindowClosed: false,
    },
};
