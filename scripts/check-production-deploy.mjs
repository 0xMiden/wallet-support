// Local-only guard; reads configuration, never contacts Cloudflare.
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const config = JSON.parse(readFileSync(new URL('worker/feedback/wrangler.jsonc', root), 'utf8').replace(/^\s*\/\/.*$/gm, ''));
const problems = [];
if (config.name !== 'wallet-support') problems.push('canonical Worker must be wallet-support');
if (config.d1_databases?.length !== 1 || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(config.d1_databases[0]?.database_id ?? '')) problems.push('verified production D1 database ID is required');
const key = process.env.VITE_TURNSTILE_SITE_KEY ?? '';
if (!key.trim() || /^(1x|2x|3x)/.test(key)) problems.push('real support.miden.xyz Turnstile site key is required');
if (!process.env.CLOUDFLARE_ACCOUNT_ID) problems.push('verified production Cloudflare account ID is required');
for (const name of ['PUBLISH_ENABLED', 'STORE_SYNC_ENABLED', 'APP_STORE_SYNC_ENABLED', 'STORE_REPLY_ENABLED', 'STORE_HANDOFF_ENABLED']) {
  if (config.vars?.[name] !== 'false') problems.push(`${name} must remain false for this deployment draft`);
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('Static production prerequisites passed; remote bindings, secret names, migrations and domain still require operator verification.');
