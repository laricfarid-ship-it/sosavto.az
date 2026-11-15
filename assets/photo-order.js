export function mountPhotoOrder(container,photos,render){
 const move=(from,to)=>{if(from===to||from<0||to<0||to>=photos.length)return;photos.splice(to,0,photos.splice(from,1)[0]);render();};
 container.querySelectorAll('[data-move-photo]').forEach(button=>button.onclick=()=>move(Number(button.dataset.index),Number(button.dataset.index)+Number(button.dataset.movePhoto)));
 container.querySelectorAll('[data-photo-handle]').forEach(handle=>{
  handle.onkeydown=e=>{const delta={ArrowLeft:-1,ArrowUp:-1,ArrowRight:1,ArrowDown:1}[e.key];if(!delta)return;e.preventDefault();const target=Number(handle.dataset.photoHandle)+delta;move(Number(handle.dataset.photoHandle),target);container.querySelector(`[data-photo-handle="${target}"]`)?.focus();};
  handle.onpointerdown=e=>{
   if(e.button!==0)return;e.preventDefault();
   const source=photos[Number(handle.dataset.photoHandle)];let target=source;
   handle.setPointerCapture?.(e.pointerId);
   const track=event=>{const card=container.ownerDocument.elementFromPoint?.(event.clientX,event.clientY)?.closest('[data-photo-index]');if(card&&container.contains(card)){target=photos[Number(card.dataset.photoIndex)];container.querySelectorAll('[data-photo-index]').forEach(x=>x.classList.toggle('photo-drop-target',x===card));}};
   const cleanup=()=>{handle.removeEventListener('pointermove',track);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',cancel);container.querySelectorAll('.photo-drop-target').forEach(x=>x.classList.remove('photo-drop-target'));};
   const finish=()=>{cleanup();move(photos.indexOf(source),photos.indexOf(target));};
   const cancel=()=>cleanup();handle.addEventListener('pointermove',track);handle.addEventListener('pointerup',finish,{once:true});handle.addEventListener('pointercancel',cancel,{once:true});
  };
 });
}
