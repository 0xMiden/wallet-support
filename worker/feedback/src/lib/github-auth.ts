const WALLET_REPO = '0xMiden/wallet';
let cached: { token: string; expiresAt: number } | undefined;

export interface GitHubAuthEnv {
  GITHUB_APP_ID?: string;
  GITHUB_APP_INSTALLATION_ID?: string;
  GITHUB_APP_PRIVATE_KEY?: string;
  /** Tests and local migration checks only. Production uses the GitHub App. */
  GITHUB_WRITE_TOKEN?: string;
}

function base64url(value: string | ArrayBuffer): string {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function pemBytes(pem: string): ArrayBuffer {
  const binary = atob(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

export function assertWalletTarget(repo: string): void {
  if (repo !== WALLET_REPO) throw new Error(`Refusing GitHub access outside ${WALLET_REPO}.`);
}

export async function createGitHubAppJwt(appId: string, privateKey: string, now = Date.now()): Promise<string> {
  const issuedAt = Math.floor(now / 1000) - 60;
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ iat: issuedAt, exp: issuedAt + 540, iss: appId }));
  const unsigned = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    'pkcs8', pemBytes(privateKey), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64url(signature)}`;
}

export async function getGitHubToken(env: GitHubAuthEnv): Promise<string> {
  if (env.GITHUB_WRITE_TOKEN) return env.GITHUB_WRITE_TOKEN;
  if (cached && cached.expiresAt - Date.now() > 60_000) return cached.token;
  const { GITHUB_APP_ID: appId, GITHUB_APP_INSTALLATION_ID: installationId, GITHUB_APP_PRIVATE_KEY: privateKey } = env;
  if (!appId || !installationId || !privateKey) throw new Error('GitHub App credentials are not configured.');
  const jwt = await createGitHubAppJwt(appId, privateKey);
  const response = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${jwt}`, 'user-agent': 'wallet-support-feedback', 'x-github-api-version': '2022-11-28' }
  });
  if (!response.ok) throw new Error(`GitHub App token exchange failed (${response.status}).`);
  const payload = await response.json() as { token?: string; expires_at?: string };
  if (!payload.token || !payload.expires_at) throw new Error('GitHub App token response was incomplete.');
  cached = { token: payload.token, expiresAt: Date.parse(payload.expires_at) };
  return cached.token;
}

export async function verifyGitHubInstallation(env: GitHubAuthEnv, repo: string): Promise<{
  ok: boolean;
  status: number;
  repo: string;
  installed: boolean;
}> {
  assertWalletTarget(repo);
  const token = await getGitHubToken(env);
  const response = await fetch('https://api.github.com/installation/repositories?per_page=100', {
    headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${token}`, 'user-agent': 'wallet-support-feedback', 'x-github-api-version': '2022-11-28' }
  });
  if (!response.ok) return { ok: false, status: response.status, repo, installed: false };
  const payload = await response.json() as { repositories?: Array<{ full_name?: string }> };
  const installed = (payload.repositories ?? []).some(item => item.full_name === repo);
  return { ok: installed, status: response.status, repo, installed };
}
