import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { ArticleService } from "./article.service";
import { CreateArticleDto, UpdateArticleDto, AddRecommendDto } from "./article.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("文章")
@Controller("articles")
export class ArticleController {
  constructor(private article: ArticleService) {}

  // ───────── 文章 CRUD ─────────

  @Post("circles/:circleId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建文章" })
  @ApiBearerAuth()
  create(@Param("circleId") circleId: string, @Req() req: any, @Body() dto: CreateArticleDto) {
    return this.article.create(circleId, req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "获取文章列表" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页条数" })
  @ApiQuery({ name: "circleId", required: false, type: String, description: "圈子ID" })
  @ApiQuery({ name: "tag", required: false, type: String, description: "标签" })
  @ApiQuery({ name: "isPushHome", required: false, type: String, description: "是否推送首页" })
  list(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("circleId") circleId?: string,
    @Query("tag") tag?: string,
    @Query("isPushHome") isPushHome?: string,
  ) {
    return this.article.listArticles({
      page: +page,
      pageSize: +pageSize,
      circleId,
      tag,
      isPushHome: isPushHome === "true" ? true : isPushHome === "false" ? false : undefined,
    });
  }

  @Get("feed")
  @ApiOperation({ summary: "获取首页动态" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页条数" })
  getHomeFeed(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Req() req?: any,
  ) {
    return this.article.getHomeFeed({ page: +page, pageSize: +pageSize, userId: req?.user?.id });
  }

  @Get(":id/related")
  @ApiOperation({ summary: "获取相关文章" })
  getRelated(@Param("id") id: string) {
    return this.article.getRelated(id);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取文章详情" })
  detail(@Param("id") id: string) {
    return this.article.getDetail(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新文章" })
  @ApiBearerAuth()
  update(@Param("id") id: string, @Req() req: any, @Body() dto: UpdateArticleDto) {
    return this.article.update(id, req.user.id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除文章" })
  @ApiBearerAuth()
  delete(@Param("id") id: string, @Req() req: any) {
    return this.article.delete(id, req.user.id);
  }

  // ───────── 审核管理 ─────────

  @Put(":id/audit")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "审核文章" })
  @ApiBearerAuth()
  audit(@Param("id") id: string, @Body("status") status: string) {
    return this.article.auditArticle(id, status);
  }

  // ───────── 推荐卡片 ─────────

  @Post(":id/recommends")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "添加推荐" })
  @ApiBearerAuth()
  addRecommend(@Param("id") articleId: string, @Req() req: any, @Body() dto: AddRecommendDto) {
    return this.article.addRecommend(articleId, req.user.id, dto);
  }

  @Delete(":id/recommends/:recId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "移除推荐" })
  @ApiBearerAuth()
  removeRecommend(@Param("recId") recId: string, @Req() req: any) {
    return this.article.removeRecommend(recId, req.user.id);
  }
}
