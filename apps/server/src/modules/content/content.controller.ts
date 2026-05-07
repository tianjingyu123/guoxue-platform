import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards,
} from "@nestjs/common";
import { ContentService } from "./content.service";
import { CreateContentDto, UpdateContentDto, ContentListQueryDto } from "./content.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@Controller("contents")
export class ContentController {
  constructor(private content: ContentService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateContentDto) {
    return this.content.create(dto);
  }

  @Get()
  list(@Query() q: ContentListQueryDto) {
    return this.content.list(q);
  }

  @Get(":id")
  detail(@Param("id") id: string) {
    return this.content.detail(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  update(@Param("id") id: string, @Body() dto: UpdateContentDto) {
    return this.content.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  remove(@Param("id") id: string) {
    return this.content.remove(id);
  }
}
