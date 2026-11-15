import {prepareListingImage} from './image-watermark.mjs';
// Never stamp an already watermarked image. Missing clean originals are left alone.
export async function repairListingWatermarks(rows,{publicUrl,readOriginal,writeImage,updateImage}){
 const base=publicUrl.replace(/\/$/,'');let repaired=0,skipped=0;
 for(const row of rows){
  if(!/^[a-f0-9-]{36}$/i.test(row.id)||!/^[a-f0-9-]{36}$/i.test(row.user_id)||row.url!==`${base}/listings/${row.user_id}/${row.id}.webp`){skipped++;continue;}
  let original;try{original=await readOriginal(`originals/${row.user_id}/${row.id}.webp`);}catch(error){if(error.name==='NoSuchKey'||error.$metadata?.httpStatusCode===404){skipped++;continue;}throw error;}
  const {output}=await prepareListingImage(original,{spin:row.sort_order>=100});
  const key=`listings/${row.user_id}/${row.id}-wm2.webp`;
  await writeImage(key,output);
  await updateImage(row,`${base}/${key}`);repaired++;
 }
 return {repaired,skipped};
}
