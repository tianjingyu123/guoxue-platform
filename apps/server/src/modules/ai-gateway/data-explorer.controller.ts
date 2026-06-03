import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { DataExplorerService } from "./data-explorer.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("🤖 AI数据探索")
@Controller("ai/data-explorer")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
export class DataExplorerController {
  constructor(private readonly explorer: DataExplorerService) {}

  @Post("ask")
  @ApiOperation({ summary: "自然语言查询数据" })
  async ask(@Body() body: { question: string }) {
    return this.explorer.ask(body.question);
  }

  @Get("schema")
  @ApiOperation({ summary: "获取数据库Schema摘要（供AI对话上下文）" })
  async getSchema() {
    return { schema: this.explorer.getSchemaContext() };
  }
}
