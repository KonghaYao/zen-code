/**
 * User utilities
 * Get current user information from the system
 */

import os from 'os';

/**
 * Get the current username
 * Fallback to environment variables if os.userInfo() fails
 */
export function getCurrentUser(): string {
  try {
    const userInfo = os.userInfo();
    return userInfo.username;
  } catch (error) {
    // Fallback for environments where os.userInfo() might fail
    return process.env.USER || process.env.USERNAME || 'User';
  }
}
