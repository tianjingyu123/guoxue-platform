import { Controller, Post, Get, Query, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { ContentGenerationService } from "./content-generation.service";

@ApiTags("AI内容生成")
@Controller("content-generation")
export class ContentGenerationController {
  constructor(private readonly service: ContentGenerationService) {}

  @Post("generate")
  @ApiOperation({ summary: "手动触发生成品类种子内容" })
  async generate(
    @Body()
    body: {
      categoryLevel1: string;
      categoryLevel2?: string;
      types?: ("knowledge" | "classics" | "tutorial")[];
    },
  ) {
    return this.service.generateForCategory(
      body.categoryLevel1,
      body.categoryLevel2,
      body.types,
    );
  }

  @Get("stats")
  @ApiOperation({ summary: "获取品类内容统计" })
  async getStats() {
    return this.service.getCategoryStats();
  }

  @Get("categories")
  @ApiOperation({ summary: "获取品类标签树" })
  getCategories() {
    return this.service.getCategoryTree();
  }

  @Post("auto-fill")
  @ApiOperation({ summary: "手动触发自动填充空品类" })
  async autoFill() {
    await this.service.autoFillEmptyCategories();
    return { message: "自动填充已触发" };
  }
}
