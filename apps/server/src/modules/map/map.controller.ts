import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { MapService } from "./map.service";
import { ThrottleGuard } from "../../common/throttle.guard";

@ApiTags("地图")
@Controller("map")
export class MapController {
  constructor(private map: MapService) {}

  @Get("geocode")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "地址解析（地址→经纬度）" })
  @ApiQuery({ name: "address", required: true, type: String, description: "地址" })
  @ApiQuery({ name: "city", required: false, type: String, description: "城市" })
  geocode(@Query("address") address: string, @Query("city") city?: string) {
    return this.map.geocode(address, city);
  }

  @Get("reverse")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "逆地址解析（经纬度→地址）" })
  @ApiQuery({ name: "lat", required: true, type: Number, description: "纬度" })
  @ApiQuery({ name: "lng", required: true, type: Number, description: "经度" })
  reverseGeocode(@Query("lat") lat: number, @Query("lng") lng: number) {
    return this.map.reverseGeocode(lat, lng);
  }

  @Get("search")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "地点搜索" })
  @ApiQuery({ name: "keyword", required: true, type: String, description: "关键词" })
  @ApiQuery({ name: "boundary", required: false, type: String, description: "范围限定" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  placeSearch(@Query("keyword") keyword: string, @Query("boundary") boundary?: string, @Query("page") page?: number) {
    return this.map.placeSearch({ keyword, boundary, pageIndex: page || 1 });
  }

  @Get("distance")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "距离计算" })
  @ApiQuery({ name: "fromLat", required: true, type: Number, description: "起点纬度" })
  @ApiQuery({ name: "fromLng", required: true, type: Number, description: "起点经度" })
  @ApiQuery({ name: "toLat", required: true, type: Number, description: "终点纬度" })
  @ApiQuery({ name: "toLng", required: true, type: Number, description: "终点经度" })
  distanceMatrix(@Query("fromLat") fromLat: number, @Query("fromLng") fromLng: number, @Query("toLat") toLat: number, @Query("toLng") toLng: number) {
    return this.map.distanceMatrix({ lat: fromLat, lng: fromLng }, [{ lat: toLat, lng: toLng }]);
  }

  @Get("route")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "驾车路线规划" })
  @ApiQuery({ name: "fromLat", required: true, type: Number })
  @ApiQuery({ name: "fromLng", required: true, type: Number })
  @ApiQuery({ name: "toLat", required: true, type: Number })
  @ApiQuery({ name: "toLng", required: true, type: Number })
  drivingRoute(@Query("fromLat") fromLat: number, @Query("fromLng") fromLng: number, @Query("toLat") toLat: number, @Query("toLng") toLng: number) {
    return this.map.drivingRoute({ lat: fromLat, lng: fromLng }, { lat: toLat, lng: toLng });
  }

  @Get("districts")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "行政区划查询" })
  @ApiQuery({ name: "id", required: false, type: String, description: "父级行政区ID" })
  districts(@Query("id") id?: string) {
    return this.map.districtList(id);
  }

  @Get("ip")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "IP定位" })
  ipLocation(@Query("ip") ip: string) {
    return this.map.ipLocation(ip);
  }
}
