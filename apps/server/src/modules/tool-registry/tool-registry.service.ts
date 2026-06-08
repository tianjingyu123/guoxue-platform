import { Injectable } from "@nestjs/common";
import { getToolsDirectory, getToolById, getToolsByCategory, ALL_TOOLS } from "@guoxue/shared";
import type { ToolsDirectory, ToolEntry } from "@guoxue/shared";
import * as path from "node:path";
import * as fs from "node:fs";

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

  /** 获取工具Mock数据 */
  getMockData(toolId: string): unknown {
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
      const data = JSON.parse(raw);
      this.mockCache.set(toolId, data);
      return data;
    } catch {
      return null;
    }
  }
}
