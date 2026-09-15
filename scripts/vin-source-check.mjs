// Developer-only source investigation. Not a public route or a VIN search provider.
import {JSDOM} from 'jsdom';
import {pathToFileURL} from 'node:url';

export function sourceUrl(value, vin) {
  vin = String(vin).trim().toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw new Error('Invalid 17-character VIN');
  const url = new URL(value);
  if (url.origin !== 'https://americamotors.com' || url.username || url.password ||
      url.search || url.hash || !/^\/[a-z0-9-]+\/[a-z0-9-]+\/[A-HJ-NPR-Z0-9]{17}$/i.test(url.pathname) ||
      url.pathname.split('/').at(-1).toUpperCase() !== vin) {
    throw new Error('Expected the exact America Motors vehicle URL for this VIN');
  }
  return {url: url.href, vin};
}

export function inspectSource(html, value, vin) {
  const checked = sourceUrl(value, vin);
  const dom = new JSDOM(html); // Scripts/resources never enabled.
  try {
    const doc = dom.window.document;
    const images = new Set();
    // Only use photos explicitly labelled with the requested VIN. Related-car
    // images and generic gallery URLs must never be attributed to this vehicle.
    for (const img of doc.querySelectorAll('img[alt]')) {
      if (img.getAttribute('alt').trim().toUpperCase() !== checked.vin) continue;
      const candidate = img.closest('a[href]')?.getAttribute('href') || img.getAttribute('src');
      if (!candidate) continue;
      try {
        const photo = new URL(candidate, checked.url);
        if (photo.origin !== 'https://vis.iaai.com' || photo.pathname !== '/resizer' ||
            photo.username || photo.password || !photo.searchParams.get('imageKeys')) continue;
        images.add(photo.href);
      } catch { /* Ignore malformed source URLs. */ }
    }
    if (!images.size) throw new Error('No explicitly VIN-matched IAAI photo links found; not evidence of no damage');
    return {vin: checked.vin, sourceUrl: checked.url, photoUrls: [...images].slice(0, 30),
      photoLinksOnly: true, imageAvailabilityVerified: false, auctionDate: null,
      latestAccidentVerified: false};
  } finally { dom.window.close(); }
}

export async function checkSource(value, vin, fetcher = fetch) {
  const checked = sourceUrl(value, vin);
  const response = await fetcher(checked.url, {redirect: 'manual', signal: AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error(`Source unavailable (HTTP ${response.status}); do not bypass or report a clean vehicle`);
  if (!response.headers.get('content-type')?.includes('text/html')) throw new Error('Expected HTML source');
  const reader = response.body.getReader();
  const chunks = []; let bytes = 0;
  try {
    for (;;) {
      const {done, value: chunk} = await reader.read();
      if (done) break;
      bytes += chunk.byteLength;
      if (bytes > 2_000_000) throw new Error('Source exceeds size limit');
      chunks.push(Buffer.from(chunk));
    }
  } finally { await reader.cancel(); }
  return inspectSource(Buffer.concat(chunks).toString('utf8'), checked.url, checked.vin);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await checkSource(process.argv[2], process.argv[3]), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
