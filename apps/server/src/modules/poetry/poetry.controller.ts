import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { PoetryService } from "./poetry.service";
import {
  CategoryDto,
  CollectionItemDto,
  HomeResponseDto,
  PoemDetailResponseDto,
} from "./poetry.dto";

@ApiTags("诗词雅集")
@Controller("poetry")
export class PoetryController {
  constructor(private readonly poetry: PoetryService) {}

  @Get("home")
  @ApiOperation({ summary: "诗词首页", description: "返回每日一首 + 热门诗词 + 热门诗人" })
  @ApiResponse({ status: 200, type: HomeResponseDto })
  getHome(): Promise<HomeResponseDto> {
    return this.poetry.getHome();
  }

  @Get("categories")
  @ApiOperation({ summary: "诗词分类列表", description: "返回全部诗词分类及作品数量" })
  @ApiResponse({ status: 200, type: [CategoryDto] })
  getCategories(): Promise<CategoryDto[]> {
    return this.poetry.getCategories();
  }

  @Get("collections")
  @ApiOperation({ summary: "诗词合集列表", description: "返回已发布的诗词合集/收藏集" })
  @ApiResponse({ status: 200, type: [CollectionItemDto] })
  getCollections(): Promise<CollectionItemDto[]> {
    return this.poetry.getCollections();
  }

  @Get(":id")
  @ApiOperation({ summary: "诗词详情", description: "返回诗词正文、赏析、注释、相关诗词及逐句译文" })
  @ApiParam({ name: "id", description: "诗词ID" })
  @ApiResponse({ status: 200, type: PoemDetailResponseDto })
  getDetail(@Param("id") id: string): Promise<PoemDetailResponseDto> {
    return this.poetry.getDetail(id);
  }
}
