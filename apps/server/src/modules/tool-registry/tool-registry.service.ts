import { Injectable } from "@nestjs/common";
import { getToolsDirectory, getToolById, getToolsByCategory, ALL_TOOLS } from "@guoxue/shared";
import type { ToolsDirectory, ToolEntry } from "@guoxue/shared";
import * as path from "node:path";
import * as fs from "node:fs";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { VERIFIED_TOOLS, REMOVED_WRONG } from "./verification-gate";

@Injectable()
export class ToolRegistryService {
  /** mock 数据缓存 */
  private mockCache = new Map<string, unknown>();

  /** 获取首页工具目录（按分类分组） */
  getDirectory(): ToolsDirectory {
    return getToolsDirectory();
  }

  /** 获取全部工具列表 */
  getAllTools(): ToolEntry[] {
    return ALL_TOOLS.filter((t) => t.visible);
  }

  /** 获取单个工具详情 */
  getToolById(id: string): ToolEntry | undefined {
    return getToolById(id);
  }

  /** 按分类获取工具 */
  getByCategory(category: string): ToolEntry[] {
    return getToolsByCategory(category);
  }

  /** 获取工具输入Schema（前端动态表单用） */
  getInputSchema(toolId: string): Record<string, unknown> | null {
    const tool = getToolById(toolId);
    return tool?.inputSchema ?? null;
  }

  /**
   * 获取工具 Mock 数据（前端表单/骨架预览用）。
   *
   * 🔴 2026-09-19 补闸门。此前这里是**绕过正确性闸门的一个口子**：
   * `POST /tools/taiyi/calculate` 会被 `REMOVED_WRONG` 挡下并说明理由，
   * 而 `GET /tools/taiyi/mock` **无鉴权、无闸门**，照样发出一份完整的太乙盘
   * （taiyi / jinkoujue / xuankong-feixing / qimen-yin 四个已确认算错、
   * 实现已删除的工具，mock 文件都还在，2.5–5KB 一份，长得跟真盘一模一样）。
   *
   * 决策人立过的规矩：不得用 mock 假装某个能力已经接上。
   * 一份结构完整的假盘摆在接口上，调用方没有任何办法看出它不是真算的——
   * 比 `/calculate` 直接报错危险得多。
   *
   * 现在两条：
   * ① 实现已按算错删除的工具，mock 一并拒发（与 `/calculate` 同一份 `REMOVED_WRONG`）；
   * ② 其余 mock 一律包一层 `__mock` 标记，调用方不可能把它误当成真算结果。
   */
  getMockData(toolId: string): unknown {
    const wrong = REMOVED_WRONG[toolId];
    if (wrong) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        `「${toolId}」的排盘算法已确认有误（${wrong}），其示例数据同步下架——` +
          `避免调用方拿一份结构完整的假盘当作真实排盘`,
      );
    }

    if (this.mockCache.has(toolId)) return this.mockCache.get(toolId);

    // toolId → mock文件名映射
    const mockFileMap: Record<string, string> = {
      "bazi": "bazi-mock.json",
      "ziwei": "ziwei-mock.json",
      "qimen-yang": "qimen-yang-mock.json",
      "qimen-yang-mingli": "qimen-yang-mingli-mock.json",
      "qimen-yin": "qimen-yin-mock.json",
      "qimen-yin-mingli": "qimen-yin-mingli-mock.json",
      "shanxiang-qimen": "shanxiang-qimen-mock.json",
      "qimen-chuanren": "qimen-chuanren-mock.json",
      "liuyao": "liuyao-mock.json",
      "meihua": "meihua-mock.json",
      "xiaochengtu": "xiaochengtu-mock.json",
      "jinqianke": "jinqianke-mock.json",
      "zhugeshenshu": "zhugeshenshu-mock.json",
      "kongmingshengua": "kongmingshengua-mock.json",
      "daliuren": "daliuren-mock.json",
      "xiaoliuren": "xiaoliuren-mock.json",
      "jinkoujue": "jinkoujue-mock.json",
      "xuankong-feixing": "xuankong-mock.json",
      "bazhai": "bazhai-mock.json",
      "dianzi-luopan": "luopan-mock.json",
      "taiyi": "taiyi-mock.json",
      "qizheng-siyu": "qizheng-siyu-mock.json",
      "wuyun-liuqi": "wuyun-liuqi-mock.json",
      "qiming": "qiming-mock.json",
      "xingming-jiexi": "xingming-jiexi-mock.json",
      "wannianli": "wannianli-mock.json",
      "feigong-xiaoqimen": "feigong-xiaoqimen-mock.json",
      "shoujihao-fenxi": "shoujihao-fenxi-mock.json",
      "qimen-fuzhou": "qimen-fuzhou-mock.json",
      "qimen-acupuncture": "qimen-acupuncture-mock.json",
      "company-naming": "company-naming-mock.json",
    };

    const fileName = mockFileMap[toolId];
    if (!fileName) return null;

    try {
      const mockPath = path.resolve(
        __dirname,
        "../../../../../packages/shared/src/mock",
        fileName,
      );
      const raw = fs.readFileSync(mockPath, "utf-8");
      /**
       * 包一层 `__mock`，让「这不是真算结果」写在数据本身上。
       * 裸返回时调用方只看响应体分辨不出真假——盘面字段一应俱全。
       * `verified` 顺带告诉调用方：即便去调 `/calculate`，这个工具当前也未必放行。
       */
      const data = {
        __mock: true,
        __notice: "示例数据，非真实排盘结果。真实排盘请调用 POST /tools/:id/calculate。",
        verified: VERIFIED_TOOLS.has(toolId),
        data: JSON.parse(raw),
      };
      this.mockCache.set(toolId, data);
      return data;
    } catch {
      return null;
    }
  }
}
