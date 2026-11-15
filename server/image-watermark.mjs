import sharp from 'sharp';
import {readFileSync} from 'node:fs';

// Keep the official emblem inside server/** so Vercel includes it in the function.
const logo=readFileSync(new URL('./watermark-logo.svg',import.meta.url),'utf8')
 .replace(/<svg[^>]*>/,'').replace('</svg>','');

const wordmark=readFileSync(new URL('./watermark-wordmark.svg',import.meta.url),'utf8');
const lettering=(x,y,width,height,style='')=>wordmark.replace('<svg ',`<svg x="${x}" y="${y}" width="${width}" height="${height}" style="${style}" `);

export function watermarkSvg(width,height){
 const scale=Math.min(width/1600,height/900);
 const badgeW=390*scale,badgeH=84*scale,pad=28*scale;
 const x=width-badgeW-pad,y=height-badgeH-pad;
 return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
 ${lettering((width-500*scale)/2,(height-70*scale)/2,500*scale,70*scale,'color:white;opacity:.24')}
 <g transform="translate(${x} ${y}) scale(${scale})">
  <rect width="390" height="84" rx="18" fill="#10232f" fill-opacity=".68"/>
  <g transform="translate(18 20) scale(.18)">${logo}</g>
  ${lettering(126,19,246,47,'color:white')}
 </g></svg>`);
}

export async function prepareListingImage(input,{spin=false}={}){
 const image=sharp(input,{limitInputPixels:40000000});
 const metadata=await image.metadata();
 if(!['jpeg','png','webp'].includes(metadata.format))throw Error('Unsupported image format');
 // Decode/orient/resize once; the clean copy contains no uploaded EXIF/GPS data.
 const {data,info}=await image.rotate().resize({width:spin?1200:1600,height:spin?900:1200,fit:'inside',withoutEnlargement:true}).raw().toBuffer({resolveWithObject:true});
 const raw={width:info.width,height:info.height,channels:info.channels};
 const original=await sharp(data,{raw}).webp({quality:90}).toBuffer();
 const output=await sharp(data,{raw}).composite([{input:watermarkSvg(info.width,info.height),top:0,left:0}]).webp({quality:85}).toBuffer();
 return {original,output};
}
