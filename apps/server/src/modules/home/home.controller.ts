import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { HomeService } from "./home.service";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";

@ApiTags("首页")
@Controller("home")
export class HomeController {
  constructor(private readonly home: HomeService) {}

  @Get()
  @ApiOperation({ summary: "首页聚合数据", description: "返回Banner/每日一句/推荐圈子/混合Feed流" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  @ApiResponse({ status: 200, description: "成功返回首页聚合数据" })
  @UseGuards(OptionalAuthGuard)
  getHome(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Req() req?: any,
  ) {
    return this.home.getHome({ page: +page, pageSize: +pageSize, userId: req?.user?.id });
  }
}
