// Tokens stay on the server. No automatic publication on moderation or build.
const version = 'v26.0';
const platforms = ['facebook', 'instagram'];
const required = {
 facebook: ['pages_read_engagement', 'pages_manage_posts'],
 instagram: ['pages_read_engagement', 'instagram_basic', 'instagram_content_publish']
};
const validId = value => /^\d+$/.test(value || '');
export function socialShareEnabled() {
 return process.env.SOCIAL_SHARE_ENABLED === 'true' &&
  (process.env.VERCEL_ENV !== 'production' || process.env.SOCIAL_SHARE_PRODUCTION_APPROVED === 'true');
}
export function socialConfigured(platform) {
 const token = platform === 'facebook' ? process.env.META_FB_PAGE_ACCESS_TOKEN : process.env.META_IG_ACCESS_TOKEN;
 return platforms.includes(platform) && validId(process.env.META_FB_PAGE_ID) && Boolean(token || process.env.META_ACCESS_TOKEN);
}
export function socialSharePreview(listing, imageUrl = '') {
 if (!listing || listing.status !== 'active' || listing.details?._deleted) throw new Error('LISTING_NOT_ACTIVE');
 const link = 'https://sosavto.az/elan?id=' + encodeURIComponent(listing.id);
 const title = String(listing.title || [listing.brand, listing.model, listing.year].filter(Boolean).join(' ')).trim();
 const price = Number(listing.price);
 const priceLabel = Number.isFinite(price) ? price.toLocaleString('az-AZ', {maximumFractionDigits: 0}) + ' AZN' : '';
 const caption = [title, priceLabel, listing.city, 'Elana bax: ' + link, '#SosAvto'].filter(Boolean).join('\n');
 return {listingId: listing.id, title, caption, link, imageUrl, platforms: ['instagram','facebook'], published: false};
}
// Never relay raw Meta messages, response bodies, request URLs or tokens to logs/UI.
async function graph(path, params, token, {method = 'GET', deadline = Date.now() + 22000} = {}) {
 if (!token || Date.now() >= deadline) throw new Error('META_REQUEST_UNAVAILABLE');
 const url = new URL('https://graph.facebook.com/' + version + '/' + path);
 const form = new URLSearchParams(params);
 if (method === 'GET') url.search = form.toString();
 let response, data;
 try {
  response = await fetch(url, {method, headers: {Authorization: 'Bearer ' + token},
   ...(method === 'POST' ? {body: form} : {}), redirect: 'error',
   signal: AbortSignal.timeout(Math.max(1, Math.min(6000, deadline - Date.now())))});
  data = await response.json();
 } catch { throw new Error('META_NETWORK_OR_RESPONSE_ERROR'); }
 if (!response.ok || data.error) {
  const code = Number.isInteger(data.error?.code) ? data.error.code : response.status;
  const error = new Error('META_API_' + code);
  let reason = String(data.error?.message || '');
  for (const secret of [token, ...Object.entries(process.env).filter(([k]) => /^META_.*TOKEN$/.test(k)).map(([,v]) => v)].filter(Boolean)) reason = reason.split(secret).join('[redacted]');
  error.diagnostic = reason.replace(/https?:\/\/\S+/gi, '[url]').replace(/[A-Za-z0-9_|.-]{35,}/g, '[redacted]').slice(0, 220);
  throw error;
 }
 return data;
}
async function credentials(platform, deadline) {
 if (!socialConfigured(platform)) throw new Error('META_NOT_CONFIGURED');
 const pageId = process.env.META_FB_PAGE_ID;
 const base = process.env.META_ACCESS_TOKEN;
 const explicit = platform === 'facebook' ? process.env.META_FB_PAGE_ACCESS_TOKEN : process.env.META_IG_ACCESS_TOKEN;
 const token = explicit || base;
 // Resolve only the configured Page; never depend on a personal /me/accounts list.
 const page = await graph(pageId, {fields: explicit ? 'id,instagram_business_account' : 'id,access_token,instagram_business_account'}, token, {deadline});
 if (String(page.id) !== pageId) throw new Error('META_PAGE_MISMATCH');
 const igId = page.instagram_business_account?.id;
 if (platform === 'instagram' && (!validId(igId) ||
  (process.env.META_IG_USER_ID && process.env.META_IG_USER_ID !== igId))) throw new Error('META_INSTAGRAM_NOT_LINKED_OR_MISMATCH');
 return {token: explicit || page.access_token || base, id: platform === 'facebook' ? pageId : igId};
}
async function permissionReport(token, deadline) {
 try {
  const permissions = await graph('me/permissions', {}, token, {deadline});
  if (!Array.isArray(permissions.data)) throw new Error('META_PERMISSIONS_UNAVAILABLE');
  return {valid: true, scopes: permissions.data.filter(p => p.status === 'granted').map(p => p.permission)};
 } catch {
  const debug = (await graph('debug_token', {input_token: token}, token, {deadline})).data;
  return {valid: debug?.is_valid === true, scopes: Array.isArray(debug?.scopes) ? debug.scopes : []};
 }
}
const diagnosticError = e => ({error: /^META_[A-Z_0-9]+$/.test(e.message) ? e.message : 'META_CHECK_FAILED', reason: e.diagnostic});
export async function socialConnectionReport() {
 const report = {enabled: socialShareEnabled(), graphVersion: version, tokenStored: Boolean(process.env.META_ACCESS_TOKEN), platforms: {}};
 const deadline = Date.now() + 25000;
 let basePermissions;
 if (process.env.META_ACCESS_TOKEN) {
  try {
   basePermissions = await permissionReport(process.env.META_ACCESS_TOKEN, deadline);
   const relevant = [...new Set([...required.facebook, ...required.instagram, 'pages_show_list', 'business_management'])];
   report.systemToken = {valid: basePermissions.valid, permissions: relevant.filter(scope => basePermissions.scopes.includes(scope))};
  } catch (e) { report.systemToken = diagnosticError(e); }
 }
 for (const platform of platforms) {
  let c;
  try { c = await credentials(platform, deadline); }
  catch (e) { report.platforms[platform] = {reachable: false, ...diagnosticError(e)}; continue; }
  const result = {accountId: c.id, reachable: true, readyForManualTest: false};
  try {
   const explicit = platform === 'facebook' ? process.env.META_FB_PAGE_ACCESS_TOKEN : process.env.META_IG_ACCESS_TOKEN;
   const permissions = !explicit && basePermissions ? basePermissions : await permissionReport(c.token, deadline);
   result.valid = permissions.valid;
   result.missingPermissions = required[platform].filter(scope => !permissions.scopes.includes(scope));
   result.readyForManualTest = permissions.valid && !result.missingPermissions.length;
  } catch (e) { result.permissionCheck = diagnosticError(e); }
  report.platforms[platform] = result;
 }
 return report;
}
export async function publishSocial(platform, preview, checkpoint = async () => {}) {
 if (!socialShareEnabled()) throw new Error('SOCIAL_SHARE_DISABLED');
 if (!platforms.includes(platform)) throw new Error('META_PLATFORM_INVALID');
 const image = new URL(preview.imageUrl);
 const allowed = [process.env.S3_PUBLIC_URL, process.env.SOCIAL_IMAGE_ORIGIN].filter(Boolean).map(v => new URL(v).origin);
 if (image.protocol !== 'https:' || image.username || image.password || image.search || image.hash || !allowed.includes(image.origin)) throw new Error('META_IMAGE_NOT_PUBLIC_STORAGE');
 const deadline = Date.now() + 23000;
 const c = await credentials(platform, deadline);
 if (platform === 'facebook') {
  const data = await graph(c.id + '/photos', {url: image.href, caption: preview.caption}, c.token, {method:'POST', deadline});
  if (!validId(data.id)) throw new Error('META_POST_ID_MISSING');
  return data.post_id || data.id;
 }
 const container = await graph(c.id + '/media', {image_url: image.href, caption: preview.caption}, c.token, {method:'POST', deadline});
 if (!validId(container.id)) throw new Error('META_CONTAINER_ID_MISSING');
 await checkpoint(container.id);
 let finished = false;
 for (let attempt = 0; attempt < 4; attempt++) {
  const state = await graph(container.id, {fields:'status_code'}, c.token, {deadline});
  if (state.status_code === 'FINISHED') { finished = true; break; }
  if (state.status_code !== 'IN_PROGRESS') throw new Error('META_CONTAINER_NOT_READY');
  await new Promise(resolve => setTimeout(resolve, 1000));
 }
 if (!finished) throw new Error('META_CONTAINER_PENDING');
 const data = await graph(c.id + '/media_publish', {creation_id: container.id}, c.token, {method:'POST', deadline});
 if (!validId(data.id)) throw new Error('META_POST_ID_MISSING');
 return data.id;
}
