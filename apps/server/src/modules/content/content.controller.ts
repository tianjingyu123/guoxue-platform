import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards,
} from "@nestjs/common";
import { ContentService } from "./content.service";
import { CreateContentDto, UpdateContentDto, QueryContentDto } from "./content.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@Controller("contents")
export class ContentController {
  constructor(private content: ContentService) {}

  @Get()
  list(@Query() query: QueryContentDto) {
    return this.content.list(query);
  }

  @Get(":id")
  detail(@Param("id") id: string) {
    return this.content.detail(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateContentDto) {
    return this.content.create(dto);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  update(@Param("id") id: string, @Body() dto: UpdateContentDto) {
    return this.content.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  remove(@Param("id") id: string) {
    return this.content.remove(id);
  }
}
