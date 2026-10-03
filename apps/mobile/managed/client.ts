type Method='GET'|'POST'|'PUT'
export type ManagedKind='product'|'course'|'circle'|'agent'
export type ManagedPublic={mode:'LEASE';applicationId:string;applicationSubject:string;tradingSubject:string;brand:{name:string;themeColor:string};templateId:string;operatingStatus:string;modules:string[]}
export type ManagedContext=ManagedPublic&{userId:string;role:string;chatReady:boolean;paymentReady:boolean}
export type ManagedRow={id:string;[key:string]:unknown}
type Session={accessToken:string;refreshToken:string;expiresIn:number;userId:string;role:string;expiresAt?:number}
const env=import.meta.env,origin=String(env.VITE_MANAGED_API_ORIGIN||'').replace(/\/$/,''),clientKey=String(env.VITE_APP_CLIENT_KEY||'');
const storageKey='managed-lease:'+encodeURIComponent(origin)+':'+encodeURIComponent(clientKey);
let refreshing:Promise<void>|undefined;
let sessionGeneration=0;
export function requestKey(){return 'request-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,14)}
export class ManagedClientError extends Error{constructor(message:string,readonly status:number){super(message)}}
function stored():Session|undefined{try{return uni.getStorageSync(storageKey)||undefined}catch{return undefined}}
function save(session:Session){uni.setStorageSync(storageKey,{...session,expiresAt:Date.now()+session.expiresIn*1000})}
export function clearManagedSession(){sessionGeneration++;uni.removeStorageSync(storageKey)}
export function hasManagedSession(){return !!stored()?.refreshToken}
async function raw<T>(path:string,method:Method,body:unknown,token?:string,extra:Record<string,string>={}):Promise<T>{
  if(!clientKey||!path.startsWith('/')||path.includes('..'))throw new ManagedClientError('应用尚未完成开通配置，请联系维护人员',503);
  return new Promise((done,reject)=>uni.request({url:origin+'/api/v1/lease'+path,method,data:body===undefined?undefined:JSON.stringify(body),timeout:45000,header:{'Content-Type':'application/json','x-app-client':clientKey,...(token?{Authorization:'Bearer '+token}:{}),...extra},success:response=>{
    const value=response.data as T&{message?:string|string[]};
    if(response.statusCode<200||response.statusCode>=300){if(response.statusCode===401&&(!token||stored()?.accessToken===token))clearManagedSession();reject(new ManagedClientError(Array.isArray(value?.message)?value.message.join('；'):value?.message||'操作未完成，请刷新已有记录核对',response.statusCode));return;}done(value);
  },fail:()=>reject(new ManagedClientError(method==='GET'?'网络连接失败，请重试读取':'结果尚未确认，请先刷新记录核对；重试时保留原请求标识',0))}));
}
export async function managedCall<T>(path:string,method:Method='GET',body?:unknown,extra:Record<string,string>={}):Promise<T>{
  let session=stored();if(!session)throw new ManagedClientError('请先登录本客户账号',401);
  if(!session.expiresAt||session.expiresAt-Date.now()<60000){
    if(!refreshing){const generation=sessionGeneration;refreshing=raw<Session>('/auth/refresh','POST',{refreshToken:session.refreshToken}).then(result=>{if(generation!==sessionGeneration)throw new ManagedClientError('登录状态已变化，请重新进入账号',401);save(result)}).finally(()=>{refreshing=undefined});}
    await refreshing;session=stored();
  }
  if(!session)throw new ManagedClientError('登录已失效，请重新登录',401);
  // 写请求从不自动重发；超时后必须核对已有请求和业务记录。
  return raw<T>(path,method,body,session.accessToken,extra);
}
export async function managedBootstrap(){const value=await raw<ManagedPublic>('/bootstrap','GET',undefined);if(value.mode!=='LEASE'||value.applicationId!==String(env.VITE_APP_APPLICATION_ID||''))throw new ManagedClientError('应用登记与当前安装配置不符，请联系维护人员',503);return value}
export async function managedLogin(username:string,password:string,nickname?:string){
  const result=await raw<Session>(nickname===undefined?'/auth/login':'/auth/register','POST',{username,password,...(nickname!==undefined?{nickname}:{})});sessionGeneration++;save(result);return result;
}
export async function managedLogout(){const session=stored();try{if(session)await managedCall('/auth/logout','POST',{})}finally{clearManagedSession()}}
export const managedResources=(kind:ManagedKind)=>managedCall<ManagedRow[]>('/resources?kind='+kind);
export async function managedAsset(id:string){const row=await managedCall<{contentType:string;dataBase64:string}>('/assets/'+encodeURIComponent(id));return 'data:'+row.contentType+';base64,'+row.dataBase64}
