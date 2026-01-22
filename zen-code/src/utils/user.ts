import os from 'os';

export function getCurrentUser(): string {
    try {
        const userInfo = os.userInfo();
        return userInfo.username;
    } catch (error) {
        // Fallback for environments where os.userInfo() might fail
        return process.env.USER || process.env.USERNAME || 'User';
    }
}

