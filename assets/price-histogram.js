const money=n=>Number(n).toLocaleString('az-AZ',{maximumFractionDigits:2})+' ₼';
export function mountPriceHistogram(host,form,fetchHistogram,readFilters){
 const doc=host.ownerDocument,minInput=form.elements.price_min,maxInput=form.elements.price_max;
 for(const input of [minInput,maxInput])input.step='0.01';
 host.innerHTML='<div class="price-distribution-head"><strong>Qiymət paylanması</strong><output class="price-selection"></output></div><p class="muted price-distribution-status" role="status">Real elanların qiymətləri yüklənir…</p><div class="price-distribution-controls" hidden><div class="price-bars" role="img" aria-label="Elanların qiymət paylanması"></div><div class="price-axis"><span></span><span></span></div><div class="price-sliders"><label>Minimum qiymət<input type="range" aria-label="Minimum qiymət slayderi" step="0.01"></label><label>Maksimum qiymət<input type="range" aria-label="Maksimum qiymət slayderi" step="0.01"></label></div></div>';
 const status=host.querySelector('[role=status]'),controls=host.querySelector('.price-distribution-controls'),bars=host.querySelector('.price-bars'),ranges=[...host.querySelectorAll('[type=range]')],output=host.querySelector('output');let data,version=0;
 function sync(){
  if(!data?.total)return;
  const lo=minInput.value===''?data.min:Number(minInput.value),hi=maxInput.value===''?data.max:Number(maxInput.value);
  ranges[0].value=String(Math.max(data.min,Math.min(data.max,lo)));ranges[1].value=String(Math.max(data.min,Math.min(data.max,hi)));
  ranges[0].setAttribute('aria-valuetext',money(Number(ranges[0].value)));ranges[1].setAttribute('aria-valuetext',money(Number(ranges[1].value)));
  output.textContent=(minInput.value===''?'Minimum yoxdur':money(lo))+' — '+(maxInput.value===''?'Maksimum yoxdur':money(hi));
  [...bars.children].forEach((bar,i)=>bar.classList.toggle('in-range',data.bins[i].to>=lo&&data.bins[i].from<=hi));
 }
 ranges.forEach((range,i)=>range.addEventListener('input',()=>{
  let value=Number(range.value);
  if(i===0&&maxInput.value!=='')value=Math.min(value,Number(maxInput.value));
  if(i===1&&minInput.value!=='')value=Math.max(value,Number(minInput.value));
  (i===0?minInput:maxInput).value=String(value);sync();
 }));
 for(const input of [minInput,maxInput])input.addEventListener('input',sync);
 async function refresh(){
  const request=++version;controls.hidden=true;output.textContent='';data=null;status.textContent='Real elanların qiymətləri yüklənir…';
  try{
   const result=await fetchHistogram(readFilters());if(request!==version||!host.isConnected)return;data=result;
   if(!data.total){status.textContent='Bu filtrlərə uyğun real elan yoxdur. Qiyməti minimum–maksimum sahələrində yaza bilərsiniz.';return;}
   status.textContent=`${data.total} real elanın qiymət paylanması. Elan qiymətləridir, satış qiymətləri deyil. Aralığı seçib “Elanları axtar” düyməsinə basın.`;
   bars.replaceChildren();const peak=Math.max(...data.bins.map(b=>b.count));
   for(const bin of data.bins){const bar=doc.createElement('span');bar.style.height=bin.count?Math.max(3,bin.count/peak*100)+'%':'0';bar.title=`${money(bin.from)} – ${money(bin.to)}: ${bin.count} elan`;bars.append(bar);}
   bars.setAttribute('aria-label',`${data.total} elan. `+data.bins.map(b=>`${money(b.from)} – ${money(b.to)}: ${b.count} elan`).join('; '));
   const axis=host.querySelectorAll('.price-axis span');axis[0].textContent=money(data.min);axis[1].textContent=money(data.max);
   for(const r of ranges){r.min=String(data.min);r.max=String(data.max);r.disabled=data.min===data.max;}
   controls.hidden=false;sync();
  }catch{if(request!==version)return;status.textContent='Qiymət paylanması yüklənmədi. Minimum–maksimum sahələri ilə axtarış edə bilərsiniz.';}
 }
 form.addEventListener('change',e=>{if(e.target===minInput||e.target===maxInput)sync();else if(e.target.name)void refresh();});
 void refresh();return {refresh,sync};
}
