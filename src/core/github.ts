import {
  GITHUB_ACCEPT_HEADER,
  GITHUB_API_URL,
  MANIFEST_FILENAME,
  SKILLS_FILENAME,
  USER_AGENT,
} from '../constants.js';
import { warn } from '../utils/ui.js';
import type { Manifest } from './manifest.js';
import { parseManifest } from './manifest.js';

const GITHUB_RAW = 'https://raw.githubusercontent.com';
const FETCH_TIMEOUT_MS = 30_000;

export interface TreeEntry {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

interface RepoRef {
  owner: string;
  name: string;
}

function parseRepo(repo: string): RepoRef {
  const parts = repo.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(
      `Invalid repository format: "${repo}". Expected "owner/repo".`,
    );
  }
  return { owner: parts[0], name: parts[1] };
}

function getAuthHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

function createSignal(): AbortSignal {
  return AbortSignal.timeout(FETCH_TIMEOUT_MS);
}

function handleHttpError(res: Response): void {
  if (res.status === 429) {
    throw new Error(
      'GitHub API rate limit exceeded. Set GITHUB_TOKEN to increase the limit.',
    );
  }
  if (res.status === 403) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (remaining === '0') {
      throw new Error(
        'GitHub API rate limit exceeded. Set GITHUB_TOKEN to increase the limit.',
      );
    }
    throw new Error(
      'Access denied for repository. It may be private or GITHUB_TOKEN lacks permissions.',
    );
  }
}

const branchCache = new Map<string, string>();

async function getDefaultBranch(repo: string): Promise<string> {
  const cached = branchCache.get(repo);
  if (cached) return cached;

  const { owner, name } = parseRepo(repo);
  const res = await fetch(`${GITHUB_API_URL}/repos/${owner}/${name}`, {
    headers: {
      Accept: GITHUB_ACCEPT_HEADER,
      'User-Agent': USER_AGENT,
      ...getAuthHeaders(),
    },
    signal: createSignal(),
  });

  if (res.status === 404) {
    throw new Error(`Repository not found: ${repo}`);
  }
  handleHttpError(res);
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { default_branch: string };
  branchCache.set(repo, data.default_branch);
  return data.default_branch;
}

export async function fetchFile(
  repo: string,
  path: string,
): Promise<string | null> {
  const { owner, name } = parseRepo(repo);
  const branch = await getDefaultBranch(repo);
  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const url = `${GITHUB_RAW}/${owner}/${name}/${branch}/${encodedPath}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, ...getAuthHeaders() },
    signal: createSignal(),
  });
  if (res.status === 404) return null;
  handleHttpError(res);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${path} from ${repo}: ${res.status} ${res.statusText}`,
    );
  }
  return res.text();
}

export async function fetchManifest(repo: string): Promise<Manifest> {
  const content = await fetchFile(repo, MANIFEST_FILENAME);
  if (content === null) {
    throw new Error(
      `No ${MANIFEST_FILENAME} found in ${repo}. Is this an updose boilerplate?`,
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error(`Invalid JSON in ${MANIFEST_FILENAME} from ${repo}`);
  }

  return parseManifest(raw);
}

export async function fetchRepoTree(repo: string): Promise<TreeEntry[]> {
  const { owner, name } = parseRepo(repo);
  const branch = await getDefaultBranch(repo);
  const url = `${GITHUB_API_URL}/repos/${owner}/${name}/git/trees/${branch}?recursive=1`;

  const res = await fetch(url, {
    headers: {
      Accept: GITHUB_ACCEPT_HEADER,
      'User-Agent': USER_AGENT,
      ...getAuthHeaders(),
    },
    signal: createSignal(),
  });

  if (res.status === 404) {
    throw new Error(`Repository not found: ${repo}`);
  }
  handleHttpError(res);
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    tree: TreeEntry[];
    truncated: boolean;
  };

  if (data.truncated) {
    warn(
      `Repository tree for ${repo} was truncated — some files may be missing.`,
    );
  }

  return data.tree.filter((entry) => entry.type === 'blob');
}

export async function fetchSkillsJson(repo: string): Promise<string | null> {
  return fetchFile(repo, SKILLS_FILENAME);
}
