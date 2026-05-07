import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ContentService } from "./content.service";
import { CreateContentDto, UpdateContentDto, ContentListQueryDto } from "./content.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("内容管理")
@Controller("contents")
export class ContentController {
  constructor(private content: ContentService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建内容" })
  @ApiBearerAuth()
  create(@Body() dto: CreateContentDto) {
    return this.content.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "获取内容列表" })
  list(@Query() q: ContentListQueryDto) {
    return this.content.list(q);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取内容详情" })
  detail(@Param("id") id: string) {
    return this.content.detail(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新内容" })
  @ApiBearerAuth()
  update(@Param("id") id: string, @Body() dto: UpdateContentDto) {
    return this.content.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "删除内容（管理员）" })
  @ApiBearerAuth()
  remove(@Param("id") id: string) {
    return this.content.remove(id);
  }
}
