const expected = process.env.TESTED_SHA;
if (!/^[0-9a-f]{40}$/.test(expected ?? '')) throw new Error('TESTED_SHA must be a full Git commit');
for (let attempt = 0; attempt < 6; attempt++) {
  try {
    const response = await fetch('https://support.miden.xyz/health', {
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(30000)
    });
    const body = await response.json();
    if (response.ok && body.ok === true && body.commit === expected) {
      console.log(`Production health passed for ${expected}`);
      process.exit(0);
    }
  } catch { /* Retry bounded edge propagation or transient errors. */ }
  if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 5000));
}
throw new Error('Production health failed or serving SHA differs; inspect deployment and perform an operator-reviewed rollback');
