import { Injectable, Logger } from "@nestjs/common";
import { MemoryCache } from "../../common/cache.util";

/** 腾讯地图行政区划节点 */
interface DistrictNode {
  id: string;
  fullname: string;
  level: string;
  location?: { lat: number; lng: number };
  children?: DistrictNode[];
}

export interface FlatDistrict {
  adcode: string;
  name: string;
  level: string;
  lat: number | undefined;
  lng: number | undefined;
}

/** 腾讯地图POI项目 */
interface MapPoiItem {
  id: string;
  title: string;
  address: string;
  tel?: string;
  location: { lat: number; lng: number };
  _distance: number;
  category: string;
}

/** 驾车距离矩阵元素 */
interface DistanceElement {
  distance: number;
  duration: number;
}

/** 驾车路线步骤 */
interface RouteStep {
  instruction: string;
  road_name: string;
  distance: number;
  duration: number;
}

/**
 * 腾讯地图 WebService API 服务
 * 文档: https://lbs.qq.com/service/webService/webServiceGuide
 */
@Injectable()
export class MapService {
  private readonly logger = new Logger(MapService.name);
  private readonly apiKey: string;
  private readonly baseUrl = "https://apis.map.qq.com";
  private readonly geoCache = new MemoryCache<any>(500);       // 地址解析缓存 24h
  private readonly searchCache = new MemoryCache<any>(200);    // 搜索缓存 5min
  private readonly distCache = new MemoryCache<any>(200);      // 距离缓存 10min

  constructor() {
    this.apiKey = process.env.TENCENT_MAP_KEY || "";
    if (!this.apiKey) {
      this.logger.warn("腾讯地图API Key未配置，请在 .env 中设置 TENCENT_MAP_KEY");
    }
  }

  /** 地址解析（地址→经纬度） */
  async geocode(address: string, city?: string) {
    const cacheKey = `geo:${address}:${city || ""}`;
    const cached = this.geoCache.get(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({ address, key: this.apiKey });
    if (city) params.set("region", city);

    const resp = await fetch(`${this.baseUrl}/ws/geocoder/v1/?${params}`);
    const data = await resp.json() as any;
    if (data.status !== 0) {
      this.logger.error("地址解析失败", data);
      return null;
    }
    const r = data.result;
    const result = {
      lat: r.location.lat,
      lng: r.location.lng,
      adcode: r.ad_info?.adcode || "",
      province: r.address_components?.province || "",
      city: r.address_components?.city || "",
      district: r.address_components?.district || "",
      title: r.title,
      reliability: r.reliability,
    };
    this.geoCache.set(cacheKey, result, 24 * 3600 * 1000); // 地址24h不变
    return result;
  }

  /** 逆地址解析（经纬度→地址） */
  async reverseGeocode(lat: number, lng: number) {
    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      key: this.apiKey,
      get_poi: "1",
    });

    const resp = await fetch(`${this.baseUrl}/ws/geocoder/v1/?${params}`);
    const data = await resp.json() as any;
    if (data.status !== 0) {
      this.logger.error("逆地址解析失败", data);
      return null;
    }
    const r = data.result;
    return {
      address: r.address,
      formatted: r.formatted_addresses?.recommend || r.address,
      adcode: r.ad_info?.adcode || "",
      province: r.ad_info?.province || "",
      city: r.ad_info?.city || "",
      district: r.ad_info?.district || "",
      pois: (r.pois as MapPoiItem[] || []).map((p) => ({
        id: p.id, title: p.title, address: p.address,
        lat: p.location.lat, lng: p.location.lng,
        distance: p._distance, category: p.category,
      })),
    };
  }

  /** IP定位 */
  async ipLocation(ip: string) {
    const params = new URLSearchParams({ ip, key: this.apiKey });
    const resp = await fetch(`${this.baseUrl}/ws/location/v1/ip?${params}`);
    const data = await resp.json() as any;
    if (data.status !== 0) return null;
    const r = data.result;
    return {
      lat: r.location.lat,
      lng: r.location.lng,
      adcode: r.ad_info?.adcode || "",
      nation: r.ad_info?.nation || "",
      province: r.ad_info?.province || "",
      city: r.ad_info?.city || "",
      district: r.ad_info?.district || "",
    };
  }

  /** 地点搜索 */
  async placeSearch(params: {
    keyword: string;
    boundary?: string;
    pageIndex?: number;
    pageSize?: number;
    filter?: string;
  }) {
    const cacheKey = `search:${params.keyword}:${params.boundary || ""}:${params.pageIndex || 1}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached) return cached;

    const qs = new URLSearchParams({
      keyword: params.keyword,
      key: this.apiKey,
      page_index: String(params.pageIndex || 1),
      page_size: String(params.pageSize || 20),
    });
    if (params.boundary) qs.set("boundary", params.boundary);
    if (params.filter) qs.set("filter", params.filter);

    const resp = await fetch(`${this.baseUrl}/ws/place/v1/search?${qs}`);
    const data = await resp.json() as any;
    if (data.status !== 0) {
      this.logger.error("地点搜索失败", data);
      return { total: 0, list: [] };
    }
    const result = {
      total: data.count,
      list: (data.data as MapPoiItem[] || []).map((p) => ({
        id: p.id, title: p.title, address: p.address,
        tel: p.tel, category: p.category,
        lat: p.location.lat, lng: p.location.lng,
        distance: p._distance,
      })),
    };
    this.searchCache.set(cacheKey, result, 5 * 60 * 1000); // 搜索5min缓存
    return result;
  }

  /** 距离计算（驾车距离矩阵） */
  async distanceMatrix(from: { lat: number; lng: number }, to: Array<{ lat: number; lng: number }>) {
    const toStr = to.map((t) => `${t.lat},${t.lng}`).join(";");
    const params = new URLSearchParams({
      from: `${from.lat},${from.lng}`,
      to: toStr,
      key: this.apiKey,
      mode: "driving",
    });

    const resp = await fetch(`${this.baseUrl}/ws/distance/v1/?${params}`);
    const data = await resp.json() as any;
    if (data.status !== 0) {
      this.logger.error("距离计算失败", data);
      return [];
    }
    return (data.result?.elements as DistanceElement[] || []).map((e) => ({
      distance: e.distance, // 米
      duration: e.duration, // 秒
    }));
  }

  /** 驾车路线规划 */
  async drivingRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
    const params = new URLSearchParams({
      from: `${from.lat},${from.lng}`,
      to: `${to.lat},${to.lng}`,
      key: this.apiKey,
    });

    const resp = await fetch(`${this.baseUrl}/ws/direction/v1/driving/?${params}`);
    const data = await resp.json() as any;
    if (data.status !== 0) {
      this.logger.error("路线规划失败", data);
      return null;
    }
    const route = data.result?.routes?.[0];
    if (!route) return null;
    return {
      distance: route.distance,
      duration: route.duration,
      polyline: route.polyline,
      steps: (route.steps as RouteStep[] || []).map((s) => ({
        instruction: s.instruction,
        road: s.road_name,
        distance: s.distance,
        duration: s.duration,
      })),
    };
  }

  /** 行政区划查询 */
  async districtList(id?: string) {
    const params = new URLSearchParams({ key: this.apiKey });
    if (id) params.set("id", id);

    const resp = await fetch(`${this.baseUrl}/ws/district/v1/list?${params}`);
    const data = await resp.json() as any;
    if (data.status !== 0) return [];
    return (data.result as DistrictNode[] || []).flatMap((r) => this.flattenDistrict(r));
  }

  /** 搜索附近驿站（供 OfflineService 调用） */
  async searchNearbyStations(lat: number, lng: number, radius: number = 5000, keyword: string = "国学") {
    const boundary = `nearby(${lat},${lng},${radius})`;
    return this.placeSearch({ keyword, boundary });
  }

  /** 计算两点直线距离（Haversine公式，用于快速排序） */
  static haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // 地球半径（米）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private flattenDistrict(node: DistrictNode): FlatDistrict[] {
    const items = [{ adcode: node.id, name: node.fullname, level: node.level, lat: node.location?.lat, lng: node.location?.lng }];
    if (node.children) {
      for (const child of node.children) items.push(...this.flattenDistrict(child));
    }
    return items;
  }
}
