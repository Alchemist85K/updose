import { USER_AGENT } from '../constants.js';

const DEFAULT_API_URL = 'https://tnjnfvbcdcucqdptbjoo.supabase.co/functions/v1';
const API_BASE_URL = process.env.UPDOSE_API_URL ?? DEFAULT_API_URL;
const FETCH_TIMEOUT_MS = 10_000;

export interface BoilerplateRow {
  id: number;
  public_id: string;
  repo: string;
  name: string;
  description: string | null;
  author: string;
  version: string;
  tags: string[];
  targets: string[];
  readme_url: string | null;
  downloads: number;
  avg_rating: number;
  rating_count: number;
  dir: string | null;
}

export interface SearchFilters {
  target?: string | undefined;
  tag?: string | undefined;
  author?: string | undefined;
}

export async function searchBoilerplates(
  query?: string | undefined,
  filters?: SearchFilters | undefined,
): Promise<BoilerplateRow[]> {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (filters?.target) params.set('target', filters.target);
  if (filters?.tag) params.set('tag', filters.tag);
  if (filters?.author) params.set('author', filters.author);

  const res = await fetch(`${API_BASE_URL}/search?${params.toString()}`, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Search failed: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as BoilerplateRow[];
}

export async function recordDownload(
  repo: string,
  dir?: string,
): Promise<void> {
  await fetch(`${API_BASE_URL}/download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify({ repo, dir: dir ?? null }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

export async function registerBoilerplate(
  repo: string,
  manifest: {
    name: string;
    author: string;
    version: string;
    description?: string | undefined;
    targets: string[];
    tags?: string[] | undefined;
  },
  githubToken: string,
  dir?: string,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${githubToken}`,
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify({ repo, manifest, dir: dir ?? null }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Registration failed: ${res.status} ${body}`);
  }
}
