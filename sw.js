// Push only: do not cache authenticated pages, API data or moderation actions.
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{};}catch{}
 let url='/admin.html';try{const candidate=new URL(data.url,self.location.origin);if(candidate.origin===self.location.origin&&candidate.pathname==='/admin.html')url=candidate.pathname+candidate.search;}catch{}
 event.waitUntil(self.registration.showNotification(data.title||'SosAvto — admin bildirişi',{
  body:data.body||'Admin panelində yeni hadisə var.',icon:'/assets/push-icon-192.png',badge:'/assets/push-icon-192.png',
  tag:data.tag||'sosavto-admin',data:{url},requireInteraction:true
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target=new URL(event.notification.data?.url||'/admin.html',self.location.origin);
 if(target.origin!==self.location.origin||target.pathname!=='/admin.html')return;
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of windows)if(new URL(client.url).pathname==='/admin.html'){
   await client.navigate(target.href);return client.focus();
  }
  return self.clients.openWindow(target.href);
 })());
});
