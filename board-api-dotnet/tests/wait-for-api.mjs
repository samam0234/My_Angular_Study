const base = process.env.API_BASE_URL ?? 'http://127.0.0.1:5080';
let ready = false;
for (let attempt = 0; attempt < 60; attempt++) {
  try { ready = (await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(2000) })).ok; } catch {}
  if (ready) break;
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
if (!ready) throw new Error(`API readiness failed: ${base}`);
console.log(`API ready: ${base}`);
