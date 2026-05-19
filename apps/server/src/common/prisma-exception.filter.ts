import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

/** Prisma 错误码 → 中文消息 */
const PRISMA_ERROR_ZH: Record<string, (meta: any) => string> = {
  P2000: () => "输入值过长，超出了数据库字段的长度限制",
  P2001: () => "找不到符合条件的记录",
  P2002: (meta: any) => {
    const fields = (meta?.target as string[])?.join("、") ?? "未知字段";
    return `"${fields}" 已存在，不能重复提交`;
  },
  P2003: (meta: any) => {
    const field = meta?.field_name ?? "关联字段";
    return `"${field}" 引用的数据不存在，请检查关联数据是否正确`;
  },
  P2004: () => "数据库约束校验失败",
  P2005: (meta: any) => {
    const actual = meta?.field_type ?? "未知";
    const expected = meta?.expected_type ?? "未知";
    return `字段类型不正确：存储的是 "${actual}"，但需要的类型是 "${expected}"`;
  },
  P2006: () => "提交的数据与数据库字段类型不匹配",
  P2007: () => "数据校验失败，请检查输入内容是否符合规则",
  P2008: () => "请求解析失败，请检查数据格式",
  P2009: () => "查询语句校验失败，请检查输入内容",
  P2010: () => "数据库操作失败，请稍后重试",
  P2011: (meta: any) => `"${meta?.constraint ?? "约束"}" 不能为空`,
  P2012: (meta: any) => `缺少必填字段：${meta?.path ?? "未知"}`,
  P2013: (meta: any) => `缺少必填参数：${meta?.argument_name ?? "未知"}`,
  P2014: (meta: any) => {
    const relation = meta?.relation_name ?? "关联数据";
    return `无法删除，因为 "${relation}" 中还有关联数据，请先处理关联项`;
  },
  P2015: (meta: any) => `找不到关联的 ${meta?.model ?? "记录"}`,
  P2016: () => "查询条件有误，解析失败",
  P2017: (meta: any) => {
    const parent = meta?.parent_name ?? "父级";
    const child = meta?.child_name ?? "子级";
    return `"${parent}" 和 "${child}" 之间的关联关系不完整`;
  },
  P2018: () => "找不到需要的关联记录",
  P2019: () => "输入的数据量超过了允许的上限",
  P2020: () => "数值超出了允许的范围",
  P2021: (meta: any) => `找不到名为 "${meta?.table ?? "未知"}" 的数据表`,
  P2022: (meta: any) => `找不到名为 "${meta?.column ?? "未知"}" 的字段`,
  P2023: (meta: any) => `字段 "${meta?.column ?? "未知"}" 中的数据不一致`,
  P2024: () => "数据库连接超时，请稍后重试",
  P2025: (meta: any) => {
    const model = meta?.model ?? "记录";
    return `要操作的${model}不存在或已被删除`;
  },
  P2026: () => "数据库不支持当前操作，请联系管理员",
  P2027: () => "同一时间执行的数据库操作过多，请稍后重试",
};

/** Prisma 异常过滤器 — 将英文 Prisma 错误转为中文提示 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const code = exception.code;
    const meta = exception.meta;
    const zhMessage = PRISMA_ERROR_ZH[code];

    const message = zhMessage
      ? zhMessage(meta)
      : `数据库操作异常（${code}），请稍后重试`;

    response.status(HttpStatus.BAD_REQUEST).json({
      code: HttpStatus.BAD_REQUEST,
      errorCode: code,
      message,
      timestamp: Date.now(),
      path: ctx.getRequest().url,
    });
  }
}
