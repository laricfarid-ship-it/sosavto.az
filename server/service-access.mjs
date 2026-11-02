// Founder-only access while SOS and carwash remain under maintenance.
// Pin the verified account ID: usernames and display names are editable.
const founderId='ab3510c3-8458-4a38-96c2-64b5fcb9157e';
export const founderServiceAccess=user=>Boolean(user&&user.id===founderId&&user.role==='admin'&&user.status==='active');
export function serviceAccess(user,env=process.env){
 // Existing isolated local integration suites exercise multi-party workflows.
 const isolated=env.LOCAL_DATABASE==='true'&&env.NODE_ENV!=='production'&&!env.VERCEL;
 return isolated||founderServiceAccess(user);
}
