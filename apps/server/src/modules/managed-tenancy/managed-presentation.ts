import { ClientPresentation, PresentationSurface } from "@guoxue/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { ClientPresentationService } from "../feature-flag/client-presentation.service";
import { FeatureFlagService } from "../feature-flag/feature-flag.service";
import { DistributionScope } from "../system/distribution.util";
import { RedisService } from "../../redis/redis.service";

/** 只消费公共发布裁决并收窄合同权限，不复制草稿、发布、回退或客户端能力登记。 */
export async function managedPresentation(prisma: PrismaService, scope: DistributionScope, userId: string, grant: { modules: string[] }, templateId: string, active: boolean, build: string, capabilities: string, resource: string) {
  const selected = await new ClientPresentationService(prisma).client(scope, build, capabilities, resource, userId);
  if (!selected.config) return selected;
  const operations: Record<string, string> = { shop: "shop_checkout", course: "client_course_purchase", circle: "client_circle_join", agent: "client_agent_purchase" };
  const flags = new FeatureFlagService(prisma, {} as RedisService);
  const allowed = new Set<string>();
  for (const module of grant.modules) if (active && operations[module] && (templateId !== "single-agent" || module === "agent") && await flags.getConfiguredOperationState(operations[module], userId, scope, build) === "OPEN") allowed.add(module);
  const entryModule: Record<string, string> = { mall: "shop", course: "course", circles: "circle", circle: "circle", agent: "agent" };
  const enabled = (id: string) => !!entryModule[id] && allowed.has(entryModule[id]);
  const config: ClientPresentation = JSON.parse(JSON.stringify(selected.config));
  config.entries = config.entries.map(entry => ({ ...entry, visible: entry.visible && enabled(entry.id) }));
  config.navigation = config.navigation.map(entry => ({ ...entry, visible: entry.visible && enabled(entry.id) }));
  const displayed = (id: string) => enabled(id) && config.entries.find(entry => entry.id === id)?.visible !== false;
  for (const surface of Object.keys(config.pages) as PresentationSurface[]) {
    if (surface !== "home" && !allowed.has(surface === "shop" ? "shop" : surface)) { delete config.pages[surface]; continue; }
    config.pages[surface] = config.pages[surface]!.filter(block => !block.targetEntryId || displayed(block.targetEntryId)).map(block => ({ ...block, entries: block.entries.filter(displayed) }));
  }
  // 保持公共协议的非空内容流声明；独立入口没有挂载通用推荐/搜索接口，客户端不能借布局跨域读取。
  return { ...selected, config, reasons: [...selected.reasons, "已按当前合同、模板及公共运营开关收窄；数据接口另行校验"] };
}
