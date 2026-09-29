import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountCarAnalysis,applyCarSuggestions} from '../assets/car-analysis.js';
const result=()=>({status:'ready',same_vehicle:'yes',issues:[],notes:['Yoxlayın.'],suggestions:{brand:{value:'Hyundai',confidence:'high'},model:{value:'Elantra',confidence:'medium'},color:{value:'Ağ',confidence:'high'},body:{value:'Sedan',confidence:'medium'}}});
async function setup({existing=false,api:customApi}={}){
 const dom=new JSDOM(`<form><select name="category"><option value="car">Car</option><option value="parts">Parts</option></select><select name="brand"><option value=""></option><option>Hyundai</option><option>BMW</option></select><input name="model"><select name="color"><option value=""></option><option>Ağ</option><option>Qara</option></select><select name="body"><option value=""></option><option>Sedan</option><option>SUV</option></select><input name="year" value="2018"><input name="mileage" value="80000"><input name="price" value="22000"><section id="ai"></section></form>`,{url:'https://sosavto.test/elan-ver.html'});
 const doc=dom.window.document,form=doc.querySelector('form'),calls=[],uploads=[];
 if(existing){form.elements.brand.value='BMW';form.elements.model.value='5 Series';form.elements.color.value='Qara';}
 const controller=await mountCarAnalysis({root:doc.querySelector('#ai'),form,api:async(...args)=>{calls.push(args);return customApi?customApi(...args):{id:'11111111-1111-4111-8111-111111111111',result:result()};},prepare:async file=>'data:image/jpeg;base64,'+file.name,addPhotos:async pictures=>uploads.push(pictures.map(p=>p.role))});
 async function photo(role,name=role){const input=doc.querySelector('[data-role="'+role+'"]');Object.defineProperty(input,'files',{value:[{name}],configurable:true});await input.onchange();}
 async function analyze(){for(const role of ['front','rear','interior'])await photo(role);const consent=doc.querySelector('#car-ai-consent');consent.checked=true;consent.onchange();await doc.querySelector('#car-ai-analyze').onclick();}
 return {dom,doc,form,calls,uploads,controller,photo,analyze,close:()=>dom.window.close()};
}
test('three distinct images plus consent are mandatory before sending',async()=>{
 const p=await setup();try{const button=p.doc.querySelector('#car-ai-analyze');assert.equal(button.disabled,true);await p.photo('front');await p.photo('rear');assert.equal(button.disabled,true);await p.photo('interior');assert.equal(button.disabled,true);const consent=p.doc.querySelector('#car-ai-consent');consent.checked=true;consent.onchange();assert.equal(button.disabled,false);await button.onclick();assert.equal(p.calls.length,1);assert.deepEqual(p.calls[0][2].images.map(x=>x.role),['front','rear','interior']);assert.equal(p.form.elements.brand.value,'','analysis does not write fields');}finally{p.close();}
});
test('apply transfers only reviewed fields and photos, never year, mileage or price',async()=>{
 const p=await setup();try{await p.analyze();assert.match(p.doc.querySelector('#car-ai-result').textContent,/Elantra/);await p.doc.querySelector('#car-ai-apply').onclick();assert.equal(p.form.elements.brand.value,'Hyundai');assert.equal(p.form.elements.model.value,'Elantra');assert.equal(p.form.elements.year.value,'2018');assert.equal(p.form.elements.mileage.value,'80000');assert.equal(p.form.elements.price.value,'22000');assert.equal(p.uploads.length,1);assert.match(p.dom.window.location.search,/analysis=/);}finally{p.close();}
});
test('existing fields start unchecked and stay unchanged unless explicitly selected',async()=>{
 const p=await setup({existing:true});try{await p.analyze();for(const key of ['brand','model','color'])assert.equal(p.doc.querySelector(`[data-field="${key}"]`).checked,false);await p.doc.querySelector('#car-ai-apply').onclick();assert.equal(p.form.elements.brand.value,'BMW');assert.equal(p.form.elements.model.value,'5 Series');assert.equal(p.form.elements.color.value,'Qara');assert.equal(p.form.elements.body.value,'Sedan');}finally{p.close();}
});
test('inconsistent brand/model selection is rejected before uploading',async()=>{
 const p=await setup({existing:true});try{await p.analyze();p.doc.querySelector('[data-field="brand"]').checked=true;await p.doc.querySelector('#car-ai-apply').onclick();assert.equal(p.uploads.length,0);assert.equal(p.form.elements.brand.value,'BMW');assert.match(p.doc.querySelector('#car-ai-status').textContent,/model/);}finally{p.close();}
});
test('edits made while reviewing cannot be silently overwritten',async()=>{
 const p=await setup();try{await p.analyze();p.form.elements.color.value='Qara';await p.doc.querySelector('#car-ai-apply').onclick();assert.equal(p.form.elements.brand.value,'');assert.equal(p.form.elements.color.value,'Qara');assert.equal(p.uploads.length,0);assert.equal(p.doc.querySelector('[data-field="color"]').checked,false);}finally{p.close();}
});
test('duplicate pictures are rejected and changed pictures invalidate prior results',async()=>{
 const p=await setup();try{await p.photo('front','same');await p.photo('rear','same');assert.equal(p.doc.querySelector('[data-preview="rear"]').hidden,true);assert.match(p.doc.querySelector('#car-ai-status').textContent,/təkrar/);await p.analyze();await p.photo('front','new');assert.equal(p.doc.querySelector('#car-ai-apply'),null);assert.equal(p.form.elements.model.value,'');}finally{p.close();}
});
test('mixed or unclear images do not expose an apply button; notes render as text',async()=>{
 const p=await setup({api:async()=>({id:'test',result:{status:'needs_photos',same_vehicle:'no',issues:['interior'],suggestions:{},notes:['<img src=x onerror=alert(1)>']}})});try{await p.analyze();assert.equal(p.doc.querySelector('#car-ai-apply'),null);assert.equal(p.doc.querySelector('#car-ai-result img'),null);assert.match(p.doc.querySelector('#car-ai-result').textContent,/Salon/);}finally{p.close();}
});
test('failed provider calls leave fields usable and retry uses the same idempotency key',async()=>{
 const p=await setup({api:async()=>{throw Object.assign(Error('AI unavailable'),{status:502});}});try{await p.analyze();assert.equal(p.controller.isBusy(),false);assert.equal(p.form.elements.brand.value,'');assert.equal(p.doc.querySelector('#car-ai-analyze').disabled,false);await p.doc.querySelector('#car-ai-analyze').onclick();assert.equal(p.calls[0][2].client_key,p.calls[1][2].client_key);p.doc.querySelector('#car-ai-new').onclick();await p.doc.querySelector('#car-ai-analyze').onclick();assert.notEqual(p.calls[1][2].client_key,p.calls[2][2].client_key);}finally{p.close();}
});
test('double clicks do not send a second in-flight request',async()=>{
 let resolve;const p=await setup({api:()=>new Promise(r=>resolve=r)});try{for(const role of ['front','rear','interior'])await p.photo(role);p.doc.querySelector('#car-ai-consent').checked=true;const run=p.doc.querySelector('#car-ai-analyze').onclick();await p.doc.querySelector('#car-ai-analyze').onclick();assert.equal(p.calls.length,1);resolve({id:'test',result:result()});await run;assert.equal(p.controller.isBusy(),false);}finally{p.close();}
});
test('non-car categories cannot run analysis or apply results',async()=>{
 const p=await setup();try{await p.analyze();p.form.elements.category.value='parts';await p.doc.querySelector('#car-ai-apply').onclick();assert.equal(p.uploads.length,0);p.controller.categoryChanged();assert.equal(p.doc.querySelector('#car-ai-apply'),null);await p.doc.querySelector('#car-ai-analyze').onclick();assert.equal(p.calls.length,1);}finally{p.close();}
});
