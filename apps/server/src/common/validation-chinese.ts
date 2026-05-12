import { ValidationError, BadRequestException } from "@nestjs/common";

/** 字段名中文映射 */
const fieldNameMap: Record<string, string> = {
  title: "标题",
  body: "正文",
  type: "类型",
  author: "作者",
  dynasty: "朝代",
  excerpt: "摘要",
  cover: "封面",
  tags: "标签",
  status: "状态",
  phone: "手机号",
  password: "密码",
  name: "名称",
  email: "邮箱",
  source: "支付渠道",
  billDate: "账单日期",
  orderId: "订单ID",
  amount: "金额",
  reason: "原因",
  reviewNote: "审核意见",
  userId: "用户ID",
  period: "结算周期",
  stationId: "分站ID",
  auditReason: "驳回原因",
  account: "账号",
  nickname: "昵称",
  avatar: "头像",
  gender: "性别",
  birthday: "生日",
  city: "城市",
  address: "地址",
  intro: "简介",
  content: "内容",
  price: "价格",
  stock: "库存",
  keyword: "关键词",
  page: "页码",
  pageSize: "每页条数",
  bankName: "开户银行",
  bankAccount: "银行账号",
  bankHolder: "开户人",
  alipayAccount: "支付宝账号",
  expressNo: "快递单号",
  invoiceUrl: "发票链接",
  taxNo: "税号",
  targetType: "目标类型",
  targetId: "目标ID",
  id: "ID",
  description: "描述",
  remark: "备注",
  url: "链接",
  sort: "排序",
  sortOrder: "排序序号",
  productId: "商品ID",
  flashPrice: "秒杀价",
  limitPerUser: "每人限购",
  startTime: "开始时间",
  endTime: "结束时间",
  startDate: "开始日期",
  endDate: "结束日期",
  isFree: "是否免费",
  dailyLimit: "每日限额",
  monthlyPrice: "月费价格",
  botId: "智能体ID",
  circleId: "圈子ID",
  stationName: "分站名称",
  contactPhone: "联系电话",
  contactName: "联系人",
  categoryId: "分类ID",
  targetUrl: "目标链接",
  redirectUrl: "跳转链接",
  wechatAppId: "微信AppId",
  wechatSecret: "微信密钥",
  miniProgramAppId: "小程序AppId",
  commissionRate: "分佣比例",
  depositAmount: "保证金",
  note: "说明",
  ruleId: "规则ID",
  enabled: "是否启用",
  threshold: "阈值",
  penalty: "罚款金额",
  version: "版本号",
  code: "编码",
  channel: "渠道",
  quantity: "数量",
  coins: "虚拟币数量",
  level: "等级",
  icon: "图标",
  color: "颜色",
  text: "文本",
  html: "HTML内容",
  subject: "主题",
  to: "收件人",
};

/** 约束名中文映射 */
const constraintMap: Record<string, string> = {
  isString: "必须为文本",
  isInt: "必须为整数",
  isNumber: "必须为数字",
  isArray: "必须为数组",
  isEnum: "值不在允许范围内",
  isNotEmpty: "不能为空",
  isEmail: "邮箱格式不正确",
  isMobilePhone: "手机号格式不正确",
  isUrl: "链接格式不正确",
  isBoolean: "必须为是/否",
  isDate: "日期格式不正确",
  isDateString: "日期格式不正确",
  isPositive: "必须为正数",
  isNegative: "必须为负数",
  minLength: "长度不足",
  maxLength: "长度超出限制",
  min: "数值太小",
  max: "数值太大",
  matches: "格式不匹配",
  isIn: "值不在允许范围内",
  isNotIn: "值不允许",
  isUUID: "ID格式不正确",
  isObject: "必须为对象",
  isNotEmptyObject: "对象不能为空",
  arrayMinSize: "数组元素不足",
  arrayMaxSize: "数组元素超出限制",
  arrayNotEmpty: "数组不能为空",
  arrayUnique: "数组元素重复",
  whitelistValidation: "该字段不允许提交，请检查是否填了多余的字段",
};

function getFieldLabel(property: string): string {
  return fieldNameMap[property] || property;
}

/** 从 class-validator 英文错误消息中提取数字（如 "must be longer than or equal to 1 characters" → 1） */
function extractNumbersFromEnglishMsg(msg: string): number[] {
  return (msg.match(/\d+/g) || []).map(Number);
}

function formatConstraintMessage(constraint: string, englishMsg: string): string {
  const nums = extractNumbersFromEnglishMsg(englishMsg);
  switch (constraint) {
    case "minLength": return `长度不能少于${nums[0] ?? "?"}个字符`;
    case "maxLength": return `长度不能超过${nums[0] ?? "?"}个字符`;
    case "min": return `值不能小于${nums[0] ?? "?"}`;
    case "max": return `值不能大于${nums[0] ?? "?"}`;
    case "isIn": {
      // 从消息中提取允许值列表 (e.g. "must be one of the following values: A, B, C")
      const match = englishMsg.match(/following values:\s*(.+)/);
      return match ? `必须为: ${match[1]}` : "值不在允许范围内";
    }
    case "isEnum": return "值不在允许范围内";
    default: return constraintMap[constraint] || constraint;
  }
}

function flattenErrors(errors: ValidationError[], parentPath = ""): string[] {
  const messages: string[] = [];
  for (const error of errors) {
    const propertyPath = parentPath ? `${parentPath}.${error.property}` : error.property;
    const fieldLabel = getFieldLabel(propertyPath);

    if (error.constraints) {
      for (const [constraint, englishMsg] of Object.entries(error.constraints)) {
        messages.push(`【${fieldLabel}】${formatConstraintMessage(constraint, englishMsg)}`);
      }
    }

    if (error.children?.length) {
      messages.push(...flattenErrors(error.children, propertyPath));
    }
  }
  return messages;
}

/**
 * ValidationPipe 的 exceptionFactory
 * 将 class-validator 的英文错误消息转换为中文
 */
export function chineseValidationExceptionFactory(errors: ValidationError[]) {
  const messages = flattenErrors(errors);
  return new BadRequestException(messages.length > 0 ? messages : "输入数据校验失败");
}
