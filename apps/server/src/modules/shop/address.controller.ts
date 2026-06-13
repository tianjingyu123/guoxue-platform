import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { AddressService } from "./address.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { CreateAddressDto, UpdateAddressDto } from "./dto/address.dto";

@ApiTags("收货地址")
@Controller("shop/addresses")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AddressController {
  constructor(private readonly svc: AddressService) {}

  @Get()
  @ApiOperation({ summary: "获取收货地址列表" })
  @ApiResponse({ status: 200, description: "成功" })
  list(@Req() req: Request) {
    return this.svc.list(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: "新增收货地址" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  create(@Req() req: Request, @Body() dto: CreateAddressDto) {
    return this.svc.create(req.user.id, dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "编辑收货地址" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  update(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateAddressDto) {
    return this.svc.update(id, req.user.id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除收货地址" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  delete(@Req() req: Request, @Param("id") id: string) {
    return this.svc.delete(id, req.user.id);
  }

  @Put(":id/default")
  @ApiOperation({ summary: "设为默认地址" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  setDefault(@Req() req: Request, @Param("id") id: string) {
    return this.svc.setDefault(id, req.user.id);
  }
}
