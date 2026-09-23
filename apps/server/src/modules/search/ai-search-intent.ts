/** 只处理独立的寒暄；带有实际问题的句子仍交给模型回答。 */
export function getSimpleSearchReply(query: string): string | null {
  const plain = query.trim().replace(/[\s，。！？!?,.～~]+/g, "").toLowerCase();
  if (/^(你好|您好|嗨|哈喽|hello|hi|早上好|下午好|晚上好|在吗)$/.test(plain)) {
    return "你好！想了解什么？一句话问我就好。";
  }
  if (/^(谢谢|多谢|感谢|thankyou|thanks)$/.test(plain)) {
    return "不客气！需要时随时问我。";
  }
  return null;
}

/** 服务与交易问题不适合附带学习内容推荐。 */
export function shouldSuppressContentGuide(query: string): boolean {
  if (getSimpleSearchReply(query)) return true;
  return /退款|退费|投诉|举报|客服|订单|扣费|扣币|充值|余额|支付失败|登录失败|无法登录|打不开|闪退|卡顿|报错|故障|失效/.test(query);
}

/** 只有明确要求学习资源或同好社区时，才展示课程和圈子。 */
export function wantsLearningResources(query: string): boolean {
  return /课程|上课|听课|圈子|社群|同好|学习路线|学习计划|怎么学|如何学|入门|系统学|推荐.{0,8}(课|老师|圈)/.test(query);
}
