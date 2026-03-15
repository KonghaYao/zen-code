// Zen Desktop - zen-swarm 二进制下发 / 版本检查 / 启动

// ─── 常量配置 ─────────────────────────────────────────────────────────────────
const GITHUB_OWNER = 'KongHaYao';
const GITHUB_REPO = 'zen-code';
const ZEN_SWARM_PORT = 8124;
const ZEN_SWARM_HEALTH_URL = `http://127.0.0.1:${ZEN_SWARM_PORT}/health`;
const ZEN_SWARM_UI_URL = `http://127.0.0.1:${ZEN_SWARM_PORT}/ui`;

const PLATFORM_BINARY_MAP = {
    'darwin-arm64': 'zen-swarm-darwin-arm64',
    'darwin-x64': 'zen-swarm-darwin-arm64',
    'win32-x64': 'zen-swarm-windows-x64.exe',
    'linux-x64': 'zen-swarm-linux-x64',
};

// ─── UI / 日志工具 ────────────────────────────────────────────────────────────
function log(msg, level = 'info') {
    const area = document.getElementById('log-area');
    if (!area) return;
    const line = document.createElement('span');
    line.className = `log-line ${level}`;
    const ts = new Date().toLocaleTimeString('zh', { hour12: false });
    line.textContent = `[${ts}] ${msg}`;
    area.appendChild(line);
    area.appendChild(document.createElement('br'));
    area.scrollTop = area.scrollHeight;
    console.log(`[${level}] ${msg}`);
}

function setStatus(text, level = 'info') {
    const el = document.getElementById('status-text');
    if (!el) return;
    el.textContent = text;
    el.className = level === 'error' ? 'error' : level === 'ok' ? 'success' : '';
    log(text, level);
}

function setRetryVisible(visible) {
    const btn = document.getElementById('retry-btn');
    const spinner = document.getElementById('spinner');
    if (btn) btn.style.display = visible ? 'inline-block' : 'none';
    if (spinner) spinner.style.display = visible ? 'none' : 'block';
}

function setProgress() {}
function hideProgress() {}

// ─── 等待 Neutralino Native API 就绪 ─────────────────────────────────────────
// ready 事件触发后 NL_PATH 已可用，直接设置 bin 目录
function onNeutralinoReady() {
    log('Neutralino 就绪');
    init();
}

async function waitForNeutralinoReady() {
    // 此函数在 ready 事件后调用，无需等待，直接返回
}

// ─── 平台 / 路径缓存（只初始化一次）──────────────────────────────────────────
let _platformKey = null;
let _homeDir = null;

async function getPlatformKey() {
    if (_platformKey) return _platformKey;

    // Neutralino 启动时自动注入 window.NL_OS / window.NL_ARCH，无需异步 API
    const os = (window.NL_OS || '').toLowerCase(); // "darwin" | "linux" | "windows"
    const arch = (window.NL_ARCH || '').toLowerCase(); // "arm64"  | "x64"   | "x86"
    log(`NL_OS="${window.NL_OS}"  NL_ARCH="${window.NL_ARCH}"`);

    const platform = os.includes('darwin') ? 'darwin' : os.includes('windows') ? 'win32' : 'linux';
    const normArch = arch === 'arm64' || arch === 'aarch64' ? 'arm64' : 'x64';

    _platformKey = `${platform}-${normArch}`;
    log(`平台: ${_platformKey}`);
    return _platformKey;
}

async function getHomeBinDir() {
    if (_homeDir) return _homeDir;
    _homeDir = window.NL_PATH;
    log(`bin 目录: ${_homeDir}`);
    return _homeDir;
}

async function getBinaryPath() {
    const [binDir, platformKey] = await Promise.all([getHomeBinDir(), getPlatformKey()]);
    const ext = platformKey.startsWith('win32') ? '.exe' : '';
    return `${binDir}/zen-swarm${ext}`;
}

// ─── 二进制存在检测 ───────────────────────────────────────────────────────────
async function binaryExists() {
    try {
        const path = await getBinaryPath();
        const stats = await Neutralino.filesystem.getStats(path);
        log(`二进制已存在: ${path}  (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
        return stats.size > 0;
    } catch {
        return false;
    }
}

// ─── 版本管理 ─────────────────────────────────────────────────────────────────
async function getLocalVersion() {
    try {
        const binDir = await getHomeBinDir();
        const v = await Neutralino.filesystem.readFile(`${binDir}/version.txt`);
        return v.trim();
    } catch {
        return null;
    }
}

async function getLatestRelease() {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
    log(`请求 GitHub API: ${url}`);
    const { exitCode, stdOut, stdErr } = await Neutralino.os.execCommand(
        `curl -fsSL --max-time 8 -H "Accept: application/vnd.github+json" "${url}"`,
    );
    if (exitCode !== 0) throw new Error(`GitHub API error: ${stdErr}`);
    return JSON.parse(stdOut);
}

// ─── 下载二进制（fetch 流式 + 实时进度）──────────────────────────────────────
async function downloadBinary(release) {
    const platformKey = await getPlatformKey();
    const binaryName = PLATFORM_BINARY_MAP[platformKey];
    if (!binaryName) throw new Error(`不支持的平台: ${platformKey}`);

    const asset = release.assets.find((a) => a.name === binaryName);
    if (!asset)
        throw new Error(`Release 中未找到 ${binaryName}（assets: ${release.assets.map((a) => a.name).join(', ')}）`);

    log(`决定路径中`);
    const binaryPath = await getBinaryPath();
    const binDir = await getHomeBinDir();
    const totalSize = asset.size || 0;

    const downloadUrl = `https://v6.gh-proxy.org/${asset.browser_download_url}`;
    log(`目标路径: ${binaryPath}`);
    log(`文件大小: ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
    log(`下载地址: ${downloadUrl}`);

    // 用 curl 下载，绕过 webview 网络限制
    setProgress(50, totalSize / 2, totalSize);
    const { exitCode, stdErr } = await Neutralino.os.execCommand(`curl -fsSL -o "${binaryPath}" "${downloadUrl}"`);
    if (exitCode !== 0) throw new Error(`curl 下载失败: ${stdErr}`);

    // macOS / Linux 赋予执行权限
    if (!platformKey.startsWith('win32')) {
        await Neutralino.os.execCommand(`chmod +x "${binaryPath}"`);
        log(`chmod +x 完成`);
    }

    setProgress(100, totalSize, totalSize);
    log(`下载完成`, 'ok');

    // 写入版本文件
    const version = release.tag_name.replace(/^zen-swarm\/v?/, '');
    await Neutralino.filesystem.writeFile(`${binDir}/version.txt`, version);
    log(`版本文件已写入: ${version}`, 'ok');

    return version;
}

// ─── 启动 zen-swarm ───────────────────────────────────────────────────────────
async function spawnZenSwarm() {
    const binaryPath = await getBinaryPath();
    log(`启动进程: ${binaryPath}`);
    await Neutralino.os.execCommand(`"${binaryPath}"`, { background: true });
}

async function waitForReady(timeout = 15000) {}

// ─── 主流程 ───────────────────────────────────────────────────────────────────
let _initRunning = false;
async function init() {
    if (_initRunning) return;
    _initRunning = true;

    // 重试时清除平台/路径缓存
    _platformKey = null;
    _homeDir = null;

    setRetryVisible(false);
    hideProgress();

    try {
        // 1. 检查 /health，若服务已运行直接跳转
        setStatus('检查 zen-swarm 是否已运行...');
        {
            const { exitCode } = await Neutralino.os.execCommand(`curl -fsSL --max-time 1 "${ZEN_SWARM_HEALTH_URL}"`);
            if (exitCode === 0) {
                log('服务已运行，直接跳转', 'ok');
                window.location.href = ZEN_SWARM_UI_URL;
                return;
            }
        }
        log('服务未运行，进入启动流程');

        // 2. 检测二进制
        setStatus('检查本地二进制...');
        const exists = await binaryExists();

        if (!exists) {
            log('未找到二进制，开始首次下载', 'warn');
            setStatus('获取最新版本信息...');
            let release;
            try {
                release = await getLatestRelease();
            } catch (e) {
                throw new Error(`无法获取 Release 信息（请检查网络）：${e.message}`);
            }
            const version = release.tag_name.replace(/^zen-swarm\/v?/, '');
            log(`最新版本: ${version}  assets: ${release.assets.length} 个`);
            setStatus(`下载 zen-swarm v${version}...`);
            await downloadBinary(release);
            hideProgress();
        } else {
            // 3. 版本检查
            setStatus('检查更新...');
            let release = null;
            try {
                release = await getLatestRelease();
            } catch (e) {
                log(`获取 Release 失败，跳过版本检查：${e.message}`, 'warn');
            }

            if (release) {
                const localVersion = await getLocalVersion();
                const remoteVersion = release.tag_name.replace(/^zen-swarm\/v?/, '');
                log(`本地版本: ${localVersion ?? '未知'}  远程版本: ${remoteVersion}`);

                if (localVersion && localVersion !== remoteVersion) {
                    const choice = await Neutralino.os.showMessageBox(
                        '发现新版本',
                        `新版本 v${remoteVersion} 可用（当前 v${localVersion}），是否立即更新？`,
                        'YES_NO',
                        'QUESTION',
                    );
                    if (choice === 'YES') {
                        setStatus(`下载 zen-swarm v${remoteVersion}...`);
                        await downloadBinary(release);
                        hideProgress();
                    } else {
                        log('用户跳过更新');
                    }
                } else {
                    log('已是最新版本', 'ok');
                }
            }
        }

        setStatus('正在启动 zen-swarm...');
        await spawnZenSwarm();

        // 5. 等待就绪
        setStatus('等待服务就绪...');
        await waitForReady();

        // 6. 跳转
        setStatus('启动成功，正在跳转...', 'ok');
        window.location.href = ZEN_SWARM_UI_URL;
    } catch (err) {
        log(`错误: ${err.message}`, 'error');
        setStatus(`启动失败：${err.message}`, 'error');
        setRetryVisible(true);
        _initRunning = false; // 允许重试
    }
}

// ─── 初始化 Neutralino ────────────────────────────────────────────────────────
async function onWindowClose() {
    try {
        const killCmd = (window.NL_OS || '').toLowerCase().includes('windows')
            ? `taskkill /IM zen-swarm.exe /F`
            : `pkill -f zen-swarm`;
        await Neutralino.os.execCommand(killCmd);
    } catch {
        /* 进程不存在则忽略 */
    }
    Neutralino.app.exit();
}

Neutralino.events.on('windowClose', onWindowClose);
Neutralino.events.on('ready', onNeutralinoReady);
Neutralino.init();

init();
window._retryInit = init;
