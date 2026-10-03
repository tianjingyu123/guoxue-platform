import {AiChatResponse} from "../ai-gateway/adapters/base.adapter";

/** 只接受有界编号，不读响应正文、请求键或未知错误对象中的同名属性。 */
export function managedProviderRequestId(value:unknown):string|null{
  return typeof value==="string"&&/^[a-zA-Z0-9_.:-]{1,128}$/.test(value)?value:null;
}

/** 供应商已经返回可解析响应，但未确认完整结束；编号不代表计费或结果已确认。 */
export class ManagedIncompleteChatError extends Error{
  readonly requestId:string|null;
  constructor(requestId:unknown){
    super("供应商未确认完整响应");this.name="ManagedIncompleteChatError";
    this.requestId=managedProviderRequestId(requestId);
  }
}

export function managedChatResult(response:AiChatResponse):{content:string;requestId?:string}{
  const requestId=managedProviderRequestId(response.requestId);
  if(response.finishReason!=="stop")throw new ManagedIncompleteChatError(requestId);
  return {content:response.content,...(requestId?{requestId}:{})};
}
