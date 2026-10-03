import {createHash} from "crypto";
import {ManagedProviderRegistration,ManagedProviderReceipt,managedQwenUrl,providerReceiptSignature} from "./managed-chat-provider";
import {readBoundedJson} from "../ai-gateway/adapters/bounded-response";
type Request={baseUrl:string;model:string;apiKey:string};
/** 官方只读模型清单核验；不调用生成、充值或计费接口，不自动重试。 */
export async function probeManagedQwen(input:Request,binding:{customerId:string;spaceKey:string;authKey:string},paidCallsAuthorized=false,fetcher:typeof fetch=fetch):Promise<ManagedProviderRegistration>{
  const baseUrl=managedQwenUrl(input.baseUrl),url=new URL(baseUrl);
  if(!/^[-a-zA-Z0-9_.]{1,100}$/.test(input.model)||typeof input.apiKey!=="string"||input.apiKey.length<16||input.apiKey.length>512||/\s/.test(input.apiKey)||Array.from(input.apiKey).some(char=>char.charCodeAt(0)<32))throw new Error("客户模型只读核验配置无效");
  // 当前官方清单文档使用业务空间域名，直连只列出新加坡及香港入口。
  if(!url.hostname.endsWith(".maas.aliyuncs.com")&&!['dashscope-intl.aliyuncs.com','cn-hongkong.dashscope.aliyuncs.com'].includes(url.hostname))throw new Error("模型清单核验须配置已文档支持的业务空间或地域入口");
  url.pathname="/api/v1/models";url.searchParams.set("model",input.model);url.searchParams.set("page_size","1");
  const transport=new AbortController(),signal=AbortSignal.any([transport.signal,AbortSignal.timeout(10000)]);
  const response=await fetcher(url,{method:"GET",headers:{Authorization:`Bearer ${input.apiKey}`},redirect:"error",signal});
  if(!response.ok||!response.body){void response.body?.cancel().catch(()=>{});transport.abort();throw new Error("客户模型只读鉴权核验未成功");}
  let decoded:Awaited<ReturnType<typeof readBoundedJson>>;
  try{decoded=await readBoundedJson(response,1024*1024,signal);}catch{transport.abort();throw new Error("客户模型只读鉴权核验响应未完整读取");}
  const bytes=decoded.bytes,result=decoded.value as {request_id?:string;output?:{models?:Array<{model?:string}>}};
  if(!result.output?.models?.some(model=>model.model===input.model)||typeof result.request_id!=="string"||!/^[-a-zA-Z0-9_.:]{1,128}$/.test(result.request_id))throw new Error("模型清单未返回指定模型或可核对的请求编号");
  const now=Date.now(),receipt:ManagedProviderReceipt={customerId:binding.customerId,spaceKey:binding.spaceKey,provider:"qwen",baseUrl,model:input.model,keyFingerprint:createHash("sha256").update(input.apiKey).digest("hex"),verifiedAt:new Date(now).toISOString(),expiresAt:new Date(now+86400000).toISOString(),verificationMethod:"GET_MODELS",providerRequestId:result.request_id,responseSha256:createHash("sha256").update(bytes).digest("hex"),paidCallsAuthorized};
  return {...input,baseUrl,receipt,signature:providerReceiptSignature(receipt,binding.authKey)};
}
