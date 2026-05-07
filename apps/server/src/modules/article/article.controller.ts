import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ArticleService } from "./article.service";
import { CreateArticleDto, UpdateArticleDto, AddRecommendDto } from "./article.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@Controller("articles")
export class ArticleController {
  constructor(private article: ArticleService) {}

  // ───────── 文章 CRUD ─────────

  @Post("circles/:circleId")
  @UseGuards(JwtAuthGuard)
  create(@Param("circleId") circleId: string, @Req() req: any, @Body() dto: CreateArticleDto) {
    return this.article.create(circleId, req.user.id, dto);
  }

  @Get()
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
  getHomeFeed(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Req() req?: any,
  ) {
    return this.article.getHomeFeed({ page: +page, pageSize: +pageSize, userId: req?.user?.id });
  }

  @Get(":id")
  detail(@Param("id") id: string) {
    return this.article.getDetail(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  update(@Param("id") id: string, @Req() req: any, @Body() dto: UpdateArticleDto) {
    return this.article.update(id, req.user.id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  delete(@Param("id") id: string, @Req() req: any) {
    return this.article.delete(id, req.user.id);
  }

  // ───────── 审核管理 ─────────

  @Put(":id/audit")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  audit(@Param("id") id: string, @Body("status") status: string) {
    return this.article.auditArticle(id, status);
  }

  // ───────── 推荐卡片 ─────────

  @Post(":id/recommends")
  @UseGuards(JwtAuthGuard)
  addRecommend(@Param("id") articleId: string, @Req() req: any, @Body() dto: AddRecommendDto) {
    return this.article.addRecommend(articleId, req.user.id, dto);
  }

  @Delete(":id/recommends/:recId")
  @UseGuards(JwtAuthGuard)
  removeRecommend(@Param("recId") recId: string, @Req() req: any) {
    return this.article.removeRecommend(recId, req.user.id);
  }
}
