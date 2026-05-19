import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { ProductCategoryService } from "./product-category.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("商品分类")
@Controller("shop/categories")
export class ProductCategoryController {
  constructor(private readonly svc: ProductCategoryService) {}

  @Get("tree")
  @ApiOperation({ summary: "商品分类树（公开）" })
  getTree() {
    return this.svc.getTree();
  }

  @Get(":id/products")
  @ApiOperation({ summary: "按分类获取商品" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getProducts(@Param("id") id: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getProducts(id, +page, +pageSize);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "新增商品分类" })
  adminCreate(@Body() body: { name: string; parentId?: string; level?: number; sortOrder?: number; icon?: string }) {
    return this.svc.adminCreate(body);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "编辑商品分类" })
  adminUpdate(@Param("id") id: string, @Body() body: { name?: string; sortOrder?: number; icon?: string; status?: string }) {
    return this.svc.adminUpdate(id, body);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除商品分类" })
  adminDelete(@Param("id") id: string) {
    return this.svc.adminDelete(id);
  }
}
