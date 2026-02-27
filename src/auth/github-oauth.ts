import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import chalk from 'chalk';
import { GITHUB_API_URL, USER_AGENT } from '../constants.js';
import { createSpinner, info } from '../utils/ui.js';

const GITHUB_CLIENT_ID = 'Ov23liABGkxbsYDvhHaa';
const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const AUTH_DIR = join(homedir(), '.updose');
const AUTH_FILE = join(AUTH_DIR, 'auth.json');
const SCOPE = 'public_repo';
const GITHUB_USER_URL = `${GITHUB_API_URL}/user`;
const VERIFY_TIMEOUT_MS = 5_000;
const FETCH_USER_TIMEOUT_MS = 10_000;
const AUTH_FILE_MODE = 0o600;
const MAX_POLL_INTERVAL_SEC = 60;

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface AuthData {
  github_token: string;
  github_username: string;
}

export async function getStoredToken(): Promise<string | null> {
  try {
    const content = await readFile(AUTH_FILE, 'utf-8');
    const data = JSON.parse(content) as AuthData;
    return data.github_token ?? null;
  } catch {
    return null;
  }
}

export async function getStoredAuth(): Promise<AuthData | null> {
  try {
    const content = await readFile(AUTH_FILE, 'utf-8');
    return JSON.parse(content) as AuthData;
  } catch {
    return null;
  }
}

/**
 * Authenticate with GitHub via Device Flow.
 * Returns the access token. If a valid stored token exists, returns it immediately.
 */
export async function login(): Promise<string> {
  const stored = await getStoredToken();
  if (stored) {
    const valid = await verifyToken(stored);
    if (valid) {
      const auth = await getStoredAuth();
      if (auth?.github_username) {
        info(`Already logged in as ${chalk.bold(auth.github_username)}`);
      }
      return stored;
    }
  }

  const deviceRes = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      scope: SCOPE,
    }),
  });

  if (!deviceRes.ok) {
    throw new Error(`Failed to start device flow: ${deviceRes.status}`);
  }

  const deviceData = (await deviceRes.json()) as DeviceCodeResponse;

  console.log();
  info('To authenticate with GitHub:');
  console.log();
  console.log(`  1. Open ${chalk.cyan(deviceData.verification_uri)}`);
  console.log(`  2. Enter code: ${chalk.bold.yellow(deviceData.user_code)}`);
  console.log();

  const spinner = createSpinner('Waiting for authorization...').start();

  let token: string | null;
  try {
    token = await pollForToken(
      deviceData.device_code,
      deviceData.interval,
      deviceData.expires_in,
    );
  } catch (err) {
    spinner.fail('Authorization failed');
    throw err;
  }

  if (!token) {
    spinner.fail('Authorization timed out or was denied');
    throw new Error('GitHub authorization failed');
  }

  const username = await fetchUsername(token);

  await mkdir(AUTH_DIR, { recursive: true });
  await writeFile(
    AUTH_FILE,
    JSON.stringify(
      { github_token: token, github_username: username } satisfies AuthData,
      null,
      2,
    ),
    { mode: AUTH_FILE_MODE },
  );

  spinner.success(`Logged in as ${chalk.bold(username)}`);
  return token;
}

async function pollForToken(
  deviceCode: string,
  interval: number,
  expiresIn: number,
): Promise<string | null> {
  const deadline = Date.now() + expiresIn * 1000;
  let pollInterval = interval;

  while (Date.now() < deadline) {
    await sleep(pollInterval * 1000);

    let data: { access_token?: string; error?: string; interval?: number };
    try {
      const res = await fetch(ACCESS_TOKEN_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      });
      data = (await res.json()) as typeof data;
    } catch {
      // RFC 8628: on connection timeout, reduce polling frequency via exponential backoff
      pollInterval = Math.min(pollInterval * 2, MAX_POLL_INTERVAL_SEC);
      continue;
    }

    if (data.access_token) {
      return data.access_token;
    }

    if (data.error === 'authorization_pending') {
      continue;
    }

    if (data.error === 'slow_down') {
      pollInterval = data.interval ?? pollInterval + 5;
      continue;
    }

    if (data.error === 'expired_token' || data.error === 'access_denied') {
      return null;
    }
  }

  return null;
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(GITHUB_USER_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': USER_AGENT,
      },
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function fetchUsername(token: string): Promise<string> {
  const res = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': USER_AGENT,
    },
    signal: AbortSignal.timeout(FETCH_USER_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch GitHub user info: ${res.status}`);
  }

  const data = (await res.json()) as { login: string };
  return data.login;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function logout(): Promise<boolean> {
  try {
    await unlink(AUTH_FILE);
    return true;
  } catch {
    return false;
  }
}
