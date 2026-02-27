import { getStoredAuth, logout } from '../auth/github-oauth.js';
import { info, error as logError, success } from '../utils/ui.js';

export async function logoutCommand(): Promise<void> {
  const auth = await getStoredAuth();
  if (!auth) {
    info('Not currently logged in.');
    return;
  }

  const removed = await logout();
  if (removed) {
    success(`Logged out from ${auth.github_username}.`);
  } else {
    logError('Failed to remove auth data.');
    process.exitCode = 1;
  }
}
