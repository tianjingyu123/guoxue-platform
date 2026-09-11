import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { serverConfig } from "./server-config";

/** 分享入口可切换；登录/API白名单仍由部署配置独立控制。 */
export function normalizeH5Entry(value: string): string {
  let url: URL;
  try { url = new URL(value.trim()); } catch {
    throw new BadRequestException("H5入口必须是完整的HTTPS地址");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash
    || url.port || !/^\/h5\/?$/.test(url.pathname)) {
    throw new BadRequestException("H5入口须使用HTTPS及/h5/路径，不能包含端口、账号、查询参数或片段");
  }
  return `${url.origin}/h5/`;
}

/** 只允许切换到运维已登记的入口，不自动扩大授权或跨域权限。 */
export function validateH5EntrySwitch(value: string): string {
  const normalized = normalizeH5Entry(value);
  const origin = new URL(normalized).origin;
  const origins = (values: (string | undefined)[]) => values.flatMap(value => {
    try { return value?.trim() ? [new URL(value.trim()).origin] : []; } catch { return []; }
  });
  const defaults = [process.env.PUBLIC_H5_URL, process.env.PUBLIC_API_URL];
  const cors = origins([...defaults, ...(process.env.CORS_ORIGIN || "").split(",")]);
  const websocket = origins([...defaults, ...(process.env.WS_CORS_ORIGIN || process.env.CORS_ORIGIN || "").split(",")]);
  const oauth = origins([...defaults, ...(process.env.WECHAT_OAUTH_ALLOWED_ORIGINS || "").split(",")]);
  if (!cors.includes(origin) || !websocket.includes(origin) || !oauth.includes(origin)) {
    throw new BadRequestException("此H5域名尚未接入，请先配置跨域访问及微信授权允许域名");
  }
  return normalized;
}

/** 只读数据库，不缓存到进程：两节点和后台保存后读取一致。 */
export async function getH5Entry(prisma: PrismaService): Promise<string> {
  const row = await prisma.brandConfig.findUnique({ where: { id: "default" }, select: { h5Url: true } });
  if (!row?.h5Url?.trim()) return serverConfig.publicH5Url;
  try { return normalizeH5Entry(row.h5Url); } catch { return serverConfig.publicH5Url; }
}

export async function getH5Base(prisma: PrismaService): Promise<string> {
  return (await getH5Entry(prisma)).replace(/\/+$/, "");
}
