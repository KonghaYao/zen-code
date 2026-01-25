import { execa } from 'execa';
import extractZip from 'extract-zip';
import fsExtra from 'fs-extra';
import * as os from 'node:os';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { pathExists } from 'path-exists';
import { temporaryFile } from 'tempy';
import { xdgCache } from 'xdg-basedir';

const { mkdir, createWriteStream, move } = fsExtra;

const __dirname = dirname(fileURLToPath(import.meta.url));

const REPOSITORY = `microsoft/ripgrep-prebuilt`;
const VERSION = process.env.RIPGREP_VERSION || 'v15.0.0';

const getTarget = () => {
    const arch = process.env.npm_config_arch || os.arch();
    const platform = process.env.platform || os.platform();
    switch (platform) {
        case 'darwin':
            switch (arch) {
                case 'arm64':
                    return 'aarch64-apple-darwin.tar.gz';
                default:
                    return 'x86_64-apple-darwin.tar.gz';
            }
        case 'win32':
            switch (arch) {
                case 'x64':
                    return 'x86_64-pc-windows-msvc.zip';
                case 'arm':
                    return 'aarch64-pc-windows-msvc.zip';
                default:
                    return 'i686-pc-windows-msvc.zip';
            }
        case 'linux':
            switch (arch) {
                case 'x64':
                    return 'x86_64-unknown-linux-musl.tar.gz';
                case 'arm':
                case 'armv7l':
                    return 'arm-unknown-linux-gnueabihf.tar.gz';
                case 'arm64':
                    return 'aarch64-unknown-linux-gnu.tar.gz';
                case 'ppc64':
                    return 'powerpc64le-unknown-linux-gnu.tar.gz';
                case 's390x':
                    return 's390x-unknown-linux-gnu.tar.gz';
                default:
                    return 'i686-unknown-linux-musl.tar.gz';
            }
        default:
            throw new Error('Unknown platform: ' + platform);
    }
};

export const downloadFile = async (url: string, outFile: string) => {
    try {
        const tmpFile = temporaryFile();
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        /** @ts-ignore */
        await pipeline(response.body, createWriteStream(tmpFile));
        await mkdir(dirname(outFile), { recursive: true });
        await move(tmpFile, outFile);
    } catch (error) {
        console.error(`Failed to download "${url}"`);
        throw error;
    }
};

/**
 * @param {string} inFile
 * @param {string} outDir
 */
const unzip = async (inFile: string, outDir: string) => {
    try {
        await mkdir(outDir, { recursive: true });
        await extractZip(inFile, { dir: outDir });
    } catch (error) {
        console.error(`Failed to unzip "${inFile}"`);
        throw error;
    }
};

/**
 * @param {string} inFile
 * @param {string} outDir
 */
const untarGz = async (inFile: string, outDir: string) => {
    try {
        await mkdir(outDir, { recursive: true });
        await execa('tar', ['xvf', inFile, '-C', outDir]);
    } catch (error) {
        console.error(`Failed to extract "${inFile}"`);
        throw error;
    }
};

const downloadRipGrepAndroid = async (platform: string) => {
    if (platform === 'android') {
        try {
            await execa('pkg', ['install', 'ripgrep', '-y']);
            return true;
        } catch (error) {
            console.info('Could not install ripgrep via pkg. Falling back to download.');
            return false;
        }
    }
    return false
};

export const rgPath = join(__dirname, `rg${process.platform === 'win32' ? '.exe' : ''}`);

export const downloadRipGrep = async (overrideBinPath?: string) => {
    if (await pathExists(rgPath)) {
        console.log('rg cached');
        return;
    }
    const platform = process.env.platform || os.platform();
    if (platform === 'android') {
        const didInstall = await downloadRipGrepAndroid(platform);
        if (didInstall) {
            return;
        }
    }
    const target = getTarget();
    const baseUrl =
        process.env.RIPGREP_PREBUILT_BINARIES_MIRROR ||
        `https://v6.gh-proxy.org/https://github.com/${REPOSITORY}/releases/download`;
    const url = `${baseUrl}/${VERSION}/ripgrep-${VERSION}-${target}`;
    const downloadPath = `${xdgCache}/vscode-ripgrep/ripgrep-${VERSION}-${target}`;
    const binPath = overrideBinPath ?? __dirname;
    if (!(await pathExists(downloadPath))) {
        await downloadFile(url, downloadPath);
    } else {
        console.info(`File ${downloadPath} has been cached`);
    }
    if (downloadPath.endsWith('.tar.gz')) {
        await untarGz(downloadPath, binPath);
    } else if (downloadPath.endsWith('.zip')) {
        await unzip(downloadPath, binPath);
    } else {
        throw new Error(`Invalid downloadPath ${downloadPath}`);
    }
};
