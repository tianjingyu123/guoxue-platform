import {readFileSync} from "fs";
import {isAbsolute} from "path";
import {createHash,createHmac,timingSafeEqual} from "crypto";
import {ManagedCredential} from "./managed-credentials";
import {ManagedChatProvider,ManagedChatBudget,managedChatBudget} from "./managed-lease-chat";
import {ServiceUnavailableException} from "@nestjs/common";
import {QwenAdapter} from "../ai-gateway/adapters/qwen.adapter";

export type ManagedProviderReceipt={customerId:string;spaceKey:string;provider:"qwen";baseUrl:string;model:string;keyFingerprint:string;verifiedAt:string;expiresAt:string;verificationMethod:"GET_MODELS";providerRequestId:string;responseSha256:string;paidCallsAuthorized:boolean;callBudget?:ManagedChatBudget};
export type ManagedProviderRegistration={baseUrl:string;model:string;apiKey:string;receipt:ManagedProviderReceipt;signature:string};
export function managedQwenUrl(value:string){
  const url=new URL(value);
  const regional=["dashscope.aliyuncs.com","dashscope-intl.aliyuncs.com","dashscope-us.aliyuncs.com","cn-hongkong.dashscope.aliyuncs.com"];
  if(url.protocol!=="https:"||url.username||url.password||url.port||url.search||url.hash||url.pathname!=="/compatible-mode/v1"||(!regional.includes(url.hostname)&&!/^[-a-z0-9]{1,80}\.(cn-beijing|ap-southeast-1|cn-hongkong|eu-central-1|ap-northeast-1|us-east-1)\.maas\.aliyuncs\.com$/.test(url.hostname)))throw new Error("客户模型通道须为维护配置的官方HTTPS端点");
  return url.href;
}
export function providerReceiptSignature(receipt:ManagedProviderReceipt,key:string){
  return createHmac("sha256",key).update(JSON.stringify(Object.fromEntries(Object.entries(receipt).sort(([a],[b])=>a.localeCompare(b))))).digest("hex");
}
export function verifyProviderRegistration(entry:ManagedProviderRegistration,customerId:string,spaceKey:string,key:string){
  if(!entry||typeof entry.apiKey!=="string"||entry.apiKey.length<16||entry.apiKey.length>512||/\s/.test(entry.apiKey)||Array.from(entry.apiKey).some(char=>char.charCodeAt(0)<32)||typeof entry.model!=="string"||!/^[-a-zA-Z0-9_.]{1,100}$/.test(entry.model))throw new Error("客户模型配置无效");
  const baseUrl=managedQwenUrl(entry.baseUrl),receipt=entry.receipt;
  if(!receipt||receipt.customerId!==customerId||receipt.spaceKey!==spaceKey||receipt.provider!=="qwen"||receipt.model!==entry.model||receipt.baseUrl!==baseUrl||receipt.keyFingerprint!==createHash("sha256").update(entry.apiKey).digest("hex")||receipt.verificationMethod!=="GET_MODELS"||typeof receipt.paidCallsAuthorized!=="boolean"||!/^[-a-zA-Z0-9_.:]{1,128}$/.test(receipt.providerRequestId)||!/^[a-f0-9]{64}$/.test(receipt.responseSha256)||!Number.isFinite(Date.parse(receipt.verifiedAt))||!Number.isFinite(Date.parse(receipt.expiresAt))||Date.parse(receipt.verifiedAt)>Date.now()+60000||Date.parse(receipt.expiresAt)-Date.parse(receipt.verifiedAt)>86400000||Date.parse(receipt.expiresAt)<=Date.parse(receipt.verifiedAt))throw new Error("客户模型只读核验记录与固定客户、空间或密钥不符");
  const expected=providerReceiptSignature(receipt,key);if(typeof entry.signature!=="string"||!/^[a-f0-9]{64}$/.test(entry.signature)||!timingSafeEqual(Buffer.from(expected),Buffer.from(entry.signature)))throw new Error("客户模型核验记录签名无效");
  if(receipt.paidCallsAuthorized||receipt.callBudget!==undefined)managedChatBudget(receipt.callBudget);
  return entry;
}
type Completion=ManagedChatProvider["complete"];
/** 运行期间重读签名授权；固定模型和密钥轮换仍须重启，缺失或损坏不沿用旧授权。 */
export function registeredManagedChatProvider(customerId:string,spaceKey:string,credential:ManagedCredential,file:string,complete:(entry:ManagedProviderRegistration,input:Parameters<Completion>[0])=>ReturnType<Completion>):ManagedChatProvider|undefined{
  let initial:ManagedProviderRegistration;
  const read=()=>{
    const raw=JSON.parse(readFileSync(file,"utf8"))[customerId] as ManagedProviderRegistration|undefined;
    return raw?verifyProviderRegistration(raw,customerId,spaceKey,credential.authKey):undefined;
  };
  try{
    if(!isAbsolute(file))throw new Error();
    const entry=read();if(!entry)return undefined;initial=entry;
  }catch{throw new Error("客户模型受限配置或核验签名无效，拒绝启动");}
  const current=()=>{
    try{
      const entry=read();
      if(!entry||entry.baseUrl!==initial.baseUrl||entry.model!==initial.model||entry.receipt.keyFingerprint!==initial.receipt.keyFingerprint||!entry.receipt.paidCallsAuthorized||!entry.receipt.callBudget||Date.parse(entry.receipt.expiresAt)<=Date.now())throw new Error();
      return entry;
    }catch{throw new ServiceUnavailableException("客户模型当前签名授权不可用，请由维护侧核对");}
  };
  return {ready:()=>{try{current();return true;}catch{return false;}},budget:()=>managedChatBudget(current().receipt.callBudget),complete:async input=>{
    const entry=current();if(input.signal.aborted)throw new Error("客户模型请求已取消");
    return complete(entry,input);
  }};
}

/** 没有客户专属只读核验与明确调用授权时不加载供应商，不继承平台环境变量。 */
export function managedChatProvider(customerId:string,spaceKey:string,credential:ManagedCredential):ManagedChatProvider|undefined{
  const file=process.env.MANAGED_CHAT_PROVIDERS_FILE;if(!file)return undefined;
  return registeredManagedChatProvider(customerId,spaceKey,credential,file,async(entry,input)=>{
    const response=await new QwenAdapter({apiKey:entry.apiKey,baseUrl:entry.baseUrl}).chat(entry.model,input.messages,{maxTokens:512,timeout:30000,signal:input.signal});
    if(response.finishReason!=="stop")throw new Error("供应商未确认完整响应");return {content:response.content};
  });
}
