// Social media preview only. Never publishes or exposes account tokens.
export function socialShareEnabled(){ return process.env.SOCIAL_SHARE_ENABLED === 'true'; }
export function socialSharePreview(listing, imageUrl = '') {
 if (!listing || listing.status !== 'active') throw new Error('LISTING_NOT_ACTIVE');
 const origin = 'https://sosavto.az';
 const link = origin + '/elan?id=' + encodeURIComponent(listing.id);
 const title = String(listing.title || [listing.brand, listing.model, listing.year].filter(Boolean).join(' ')).trim();
 const price = Number(listing.price);
 const priceLabel = Number.isFinite(price) ? price.toLocaleString('az-AZ', {maximumFractionDigits: 0}) + ' AZN' : '';
 const caption = [title, priceLabel, listing.city, 'Elana bax: ' + link, '#SosAvto'].filter(Boolean).join('\n');
 return {listingId: listing.id, title, caption, link, imageUrl, platforms: ['instagram','facebook'], published: false};
}
