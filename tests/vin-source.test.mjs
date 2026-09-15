import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceUrl, inspectSource, checkSource} from '../scripts/vin-source-check.mjs';
const vin = '5XXGW4L21HG139016';
const url = `https://americamotors.com/kia/optima/${vin}`;
const photo = 'https://vis.iaai.com/resizer?imageKeys=test&amp;width=833';
// Synthetic markup: tests matching/filtering, not the current live site's layout.
test('VIN source rejects arbitrary hosts, mismatched VINs and credentials', () => {
  for (const bad of ['https://localhost/a/b/'+vin, url.replace(vin,'5XXGW4L21HG139017'),url+'?url=x',url.replace('https://','https://user@')]) {
    assert.throws(() => sourceUrl(bad, vin));
  }
});
test('only exact VIN images on approved image host survive, duplicates collapse', () => {
  const html = `<img alt="${vin}" src="${photo}"><img alt="${vin}" src="${photo}">
    <img alt="5XXGW4L21HG139017" src="${photo}"><img alt="${vin}" src="https://other.example/a.jpg">`;
  const result = inspectSource(html, url, vin);
  assert.equal(result.photoUrls.length, 1);
  assert.equal(result.auctionDate, null);
  assert.equal(result.latestAccidentVerified, false);
  assert.equal(result.imageAvailabilityVerified, false);
});
test('missing matches and denied access stay errors, not clean-history results', async () => {
  assert.throws(() => inspectSource('<h1>Car not found</h1>', url, vin));
  await assert.rejects(checkSource(url,vin,async () => new Response('',{status:403})),/HTTP 403/);
});
