import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountBrandPicker} from '../assets/brand-picker.js';
import {brandLogos} from '../assets/brand-logos.js';
import {cars} from '../assets/cars.js';
test('logo mapping belongs to catalog with unique tile indices',()=>{
 for(const name of Object.keys(brandLogos))assert.ok(cars[name],name);
 assert.equal(new Set(Object.values(brandLogos)).size,Object.keys(brandLogos).length);
 for(const name of ['BMW','Mercedes-Benz','Toyota','Hyundai','Kia','BYD','Audi','Ford','Chevrolet'])assert.ok(name in brandLogos);
});
test('logo picker filters, chooses canonical native value, supports other and disabled state',()=>{
 const dom=new JSDOM('<form><label>Marka<select name="brand"><option value="">Marka seçin</option><option value="__other__">Digər — əl ilə yaz</option><option>BMW</option><option>Toyota</option><option value="Lada">Lada / VAZ</option></select></label></form>');
 const w=dom.window,d=w.document;w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 const select=d.querySelector('select'),picker=mountBrandPicker(select);let changes=0;select.addEventListener('change',()=>changes++);
 const trigger=d.querySelector('.brand-picker-trigger');trigger.click();const dialog=d.querySelector('dialog'),search=dialog.querySelector('input');assert.equal(dialog.open,true);
 search.value='toy';search.dispatchEvent(new w.Event('input'));assert.equal(d.querySelectorAll('.brand-picker-option').length,1);d.querySelector('.brand-picker-option').click();assert.equal(select.value,'Toyota');assert.equal(changes,1);assert.equal(dialog.open,false);assert.equal(new w.FormData(d.querySelector('form')).get('brand'),'Toyota');
 trigger.click();search.value='vaz';search.dispatchEvent(new w.Event('input'));assert.match(d.querySelector('.brand-picker-list').textContent,/Lada/);
 search.value='unlisted';search.dispatchEvent(new w.Event('input'));assert.equal(d.querySelector('.brand-picker-empty').hidden,false);d.querySelector('.brand-picker-other').click();assert.equal(select.value,'__other__');
 select.disabled=true;picker.sync();assert.equal(trigger.disabled,true);dom.window.close();
});
