import { login } from '../auth/github-oauth.js';
import { error as logError } from '../utils/ui.js';

export async function loginCommand(): Promise<void> {
  try {
    await login();
  } catch (err) {
    logError((err as Error).message);
    process.exitCode = 1;
  }
}
