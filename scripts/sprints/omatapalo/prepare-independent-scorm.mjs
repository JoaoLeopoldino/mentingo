/** Download only the original public test package; never modify or redistribute its contents. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const url = 'https://scorm.com/wp-content/assets/golf_examples/PIFS/RuntimeBasicCalls_SCORM12.zip';
const expected = 'b778566f79d56e48fab58f3a4e1fe8c1d05f372be9db3385aa1a1896063fe02a';
const target = new URL('../../../.local/sprint/golf-scorm12.zip', import.meta.url);
await mkdir(new URL('.', target), { recursive: true });
let bytes;
try { bytes = await readFile(target); } catch (error) {
  if (error.code !== 'ENOENT') throw error;
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Package download failed: ${response.status}`);
  bytes = Buffer.from(await response.arrayBuffer());
}
const actual = createHash('sha256').update(bytes).digest('hex');
if (actual !== expected) throw new Error('Package changed: review source/license before updating the pinned hash');
await writeFile(target, bytes);
console.log(JSON.stringify({ url, sha256: actual, bytes: bytes.length,
  license: 'Rustici source: CC BY 3.0 US; original per-page content attributions retained',
  modified: false }));
