import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from "@nestjs/swagger";
import { ClassicsBffService } from "./classics-bff.service";

/**
 * 古籍馆「页面聚合（BFF）」控制器，前缀 /classics（复数），服务前端 pkg-classics 各页面。
 * 与既有 /classic（单数）REST 资源接口并存、互不影响。
 *
 * 注意路由顺序：静态段（home/ranking/...）必须声明在动态 :id 之前，
 * 否则 GET /classics/home 会被 GET /classics/:id 抢先匹配。
 */
@ApiTags("古籍馆-页面聚合")
@Controller("classics")
export class ClassicsBffController {
  constructor(private readonly bff: ClassicsBffService) {}

  @Get("home")
  @ApiOperation({ summary: "古籍馆首页（统计+四部+排行+精选）" })
  @ApiResponse({ status: 200, description: "成功" })
  getHome() {
    return this.bff.getHome();
  }

  @Get("ranking")
  @ApiOperation({ summary: "古籍排行榜（sort=hot/new）" })
  @ApiQuery({ name: "sort", required: false, description: "hot=热门(阅读量) / new=最新收录" })
  @ApiResponse({ status: 200, description: "成功" })
  getRanking(@Query("sort") sort?: string) {
    return this.bff.getRanking(sort);
  }

  @Get("lists")
  @ApiOperation({ summary: "精选书单（暂无数据源，返回空）" })
  @ApiResponse({ status: 200, description: "成功" })
  getLists() {
    return this.bff.getLists();
  }

  @Get("audiobooks")
  @ApiOperation({ summary: "有声书列表（暂无数据源，返回空）" })
  @ApiResponse({ status: 200, description: "成功" })
  getAudiobooks() {
    return this.bff.getAudiobooks();
  }

  @Get("audiobooks/:id")
  @ApiOperation({ summary: "有声书播放器（暂无数据源，返回空）" })
  @ApiParam({ name: "id", description: "有声书ID" })
  getAudiobookPlayer(@Param("id") id: string) {
    return this.bff.getAudiobookPlayer(id);
  }

  @Get("bookshelf")
  @ApiOperation({ summary: "我的书架（需登录，后续批次接入）" })
  @ApiResponse({ status: 200, description: "成功" })
  getBookshelf() {
    return this.bff.getBookshelf();
  }

  @Get("bookmarks")
  @ApiOperation({ summary: "我的书签（需登录，后续批次接入）" })
  @ApiResponse({ status: 200, description: "成功" })
  getBookmarks() {
    return this.bff.getBookmarks();
  }

  @Get("notes")
  @ApiOperation({ summary: "我的笔记（需登录，后续批次接入）" })
  @ApiResponse({ status: 200, description: "成功" })
  getNotes() {
    return this.bff.getNotes();
  }

  @Get("collections")
  @ApiOperation({ summary: "我的收藏（暂无数据源，返回空）" })
  @ApiResponse({ status: 200, description: "成功" })
  getCollections() {
    return this.bff.getCollections();
  }

  @Get("collections/:id")
  @ApiOperation({ summary: "合集详情（暂无数据源，返回空）" })
  @ApiParam({ name: "id", description: "合集ID" })
  getCollectionDetail(@Param("id") id: string) {
    return this.bff.getCollectionDetail(id);
  }

  @Get("search")
  @ApiOperation({ summary: "古籍搜索" })
  @ApiQuery({ name: "q", required: false, description: "搜索关键词" })
  @ApiResponse({ status: 200, description: "成功" })
  getSearch(@Query("q") q: string) {
    return this.bff.getSearch(q);
  }

  @Get("category/:cat")
  @ApiOperation({ summary: "分类书籍列表（jing/shi/zi/ji/fo/dao/ming/yi）" })
  @ApiParam({ name: "cat", description: "分类ID：jing/shi/zi/ji/fo/dao/ming/yi" })
  @ApiQuery({ name: "sort", required: false, description: "hot=最热 / new=最新" })
  @ApiResponse({ status: 200, description: "成功" })
  getCategory(@Param("cat") cat: string, @Query("sort") sort?: string) {
    return this.bff.getCategory(cat, sort);
  }

  @Get(":id")
  @ApiOperation({ summary: "古籍详情" })
  @ApiParam({ name: "id", description: "书籍ID" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "书籍不存在" })
  getDetail(@Param("id") id: string) {
    return this.bff.getDetail(id);
  }
}
