// Contact phone numbers are never implicitly promoted into login identities.
export function normalizeLoginPhone(value){
 if(typeof value!=='string'||value.length>40||!/^[+\d\s()-]+$/.test(value))return '';
 const compact=value.replace(/[\s()-]/g,'');
 const phone=/^0\d{9}$/.test(compact)?'+994'+compact.slice(1):/^994\d{9}$/.test(compact)?'+'+compact:compact;
 return /^\+994\d{9}$/.test(phone)?phone:'';
}
