import { Controller, Post, Get, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ContentGenerationService } from "./content-generation.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("AI内容生成")
@ApiBearerAuth()
@Controller("content-generation")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
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
