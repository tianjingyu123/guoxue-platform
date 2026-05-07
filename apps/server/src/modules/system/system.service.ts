import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SystemService {
  constructor(private prisma: PrismaService) {}

  async getAllConfigs() {
    return this.prisma.configSystem.findMany({
      orderBy: { configKey: "asc" },
    });
  }

  async getConfig(key: string) {
    return this.prisma.configSystem.findUnique({ where: { configKey: key } });
  }

  async setConfig(key: string, value: string, description?: string, updatedBy?: string) {
    return this.prisma.configSystem.upsert({
      where: { configKey: key },
      create: { configKey: key, configValue: value, description, updatedBy },
      update: { configValue: value, description, updatedBy },
    });
  }

  async deleteConfig(key: string) {
    return this.prisma.configSystem.delete({ where: { configKey: key } });
  }

  /** 获取多个公开配置（供前端/移动端使用） */
  async getPublicConfigs(keys: string[]) {
    const configs = await this.prisma.configSystem.findMany({
      where: { configKey: { in: keys } },
    });
    const map: Record<string, string> = {};
    configs.forEach((c) => (map[c.configKey] = c.configValue));
    return map;
  }
}
