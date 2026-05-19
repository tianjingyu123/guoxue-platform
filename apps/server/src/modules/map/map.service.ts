import { Injectable, Logger } from "@nestjs/common";
import * as crypto from "crypto";
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

/** 腾讯地图通用 API 响应 */
interface TencentMapResponse<TResult = unknown, TData = unknown> {
  status: number;
  message?: string;
  result?: TResult;
  count?: number;
  data?: TData;
}

interface GeocodeResult {
  location: { lat: number; lng: number };
  ad_info?: { adcode: string };
  address_components?: { province: string; city: string; district: string };
  title: string;
  reliability: number;
}

interface ReverseGeocodeResult {
  address: string;
  formatted_addresses?: { recommend?: string };
  ad_info?: { adcode: string; province?: string; city?: string; district?: string };
  pois?: MapPoiItem[];
}

interface IpLocationResult {
  location: { lat: number; lng: number };
  ad_info?: { adcode: string; nation?: string; province?: string; city?: string; district?: string };
}

interface DistanceMatrixResult {
  elements: DistanceElement[];
}

interface DrivingRouteResult {
  routes: Array<{
    distance: number;
    duration: number;
    polyline: unknown;
    steps: RouteStep[];
  }>;
}

/** 天气预警 */
interface WeatherAlarm {
  type_name: string;
  level_name: string;
  title: string;
  pub_content: string;
}

/** 空气质量 */
interface AirQuality {
  aqi: number;
  pm10: number;
  pm25: number;
  no2: number;
  o3: number;
  so2: number;
  co: number;
}

/** 生活指数 */
interface LifeIndex {
  index_date: string;
  ids: Array<{ name: string; level: string; desc: string }>;
}

/** 实时天气 */
interface RealtimeWeather {
  province: string;
  city: string;
  district: string;
  adcode: number;
  update_time: string;
  infos: {
    weather: string;
    temperature: number;
    wind_direction: string;
    wind_power: string;
    wind_power_v2: string;
    humidity: number;
    air_pressure: number;
  };
  alarms?: WeatherAlarm[];
  air?: AirQuality;
}

/** 逐日预报 */
interface DayForecast {
  date: string;
  week: string;
  day: { weather: string; temperature: number; wind_direction: string; wind_power: string; humidity: number };
  night: { weather: string; temperature: number; wind_direction: string; wind_power: string; humidity: number };
}

/** 预报天气 */
interface ForecastWeather {
  province: string;
  city: string;
  district: string;
  adcode: number;
  update_time: string;
  infos: DayForecast[];
  indexes?: LifeIndex[];
  air?: Array<{ air_date: string } & AirQuality>;
}

/** 逐时预报 */
interface HourForecast {
  hour: string;
  info: { weather: string; temperature: number; wind_direction: string; wind_power: string };
}

/** 小时预报 */
interface HourlyWeather {
  province: string;
  city: string;
  district: string;
  adcode: number;
  update_time: string;
  infos: HourForecast[];
}

/**
 * 腾讯地图 WebService API 服务
 * 文档: https://lbs.qq.com/service/webService/webServiceGuide
 */
@Injectable()
export class MapService {
  private readonly logger = new Logger(MapService.name);
  private readonly apiKey: string;
  private readonly apiSk: string;
  private readonly baseUrl = "https://apis.map.qq.com";
  private readonly geoCache = new MemoryCache<any>(500);       // 地址解析缓存 24h
  private readonly searchCache = new MemoryCache<any>(200);    // 搜索缓存 5min
  private readonly distCache = new MemoryCache<any>(200);      // 距离缓存 10min
  private readonly weatherCache = new MemoryCache<any>(100);   // 天气缓存 15min

  constructor() {
    this.apiKey = process.env.TENCENT_MAP_KEY || "";
    this.apiSk = process.env.TENCENT_MAP_SK || "";
    if (!this.apiKey) {
      this.logger.warn("腾讯地图API Key未配置，请在 .env 中设置 TENCENT_MAP_KEY");
    }
    if (!this.apiSk) {
      this.logger.warn("腾讯地图SK未配置，签名校验将失败，请在 .env 中设置 TENCENT_MAP_SK");
    }
  }

  /** 计算腾讯地图 API 请求签名（MD5） */
  private computeSig(path: string, params: Record<string, string>): string {
    const sorted = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
    return crypto.createHash("md5").update(path + "?" + sorted + this.apiSk).digest("hex");
  }

  /** 地址解析（地址→经纬度） */
  async geocode(address: string, city?: string) {
    const cacheKey = `geo:${address}:${city || ""}`;
    const cached = this.geoCache.get(cacheKey);
    if (cached) return cached;

    const path = "/ws/geocoder/v1";
    const rawParams: Record<string, string> = { address, key: this.apiKey };
    if (city) rawParams.region = city;
    const params = new URLSearchParams(rawParams);
    if (this.apiSk) params.set("sig", this.computeSig(path, rawParams));

    const resp = await fetch(`${this.baseUrl}${path}?${params}`);
    const data = await resp.json() as TencentMapResponse<GeocodeResult>;
    if (data.status !== 0) {
      this.logger.error("地址解析失败", data);
      return null;
    }
    const r = data.result!;
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
    const path = "/ws/geocoder/v1";
    const rawParams: Record<string, string> = {
      location: `${lat},${lng}`,
      key: this.apiKey,
      get_poi: "1",
    };
    const params = new URLSearchParams(rawParams);
    if (this.apiSk) params.set("sig", this.computeSig(path, rawParams));

    const resp = await fetch(`${this.baseUrl}${path}?${params}`);
    const data = await resp.json() as TencentMapResponse<ReverseGeocodeResult>;
    if (data.status !== 0) {
      this.logger.error("逆地址解析失败", data);
      return null;
    }
    const r = data.result!;
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
    const path = "/ws/location/v1/ip";
    const rawParams: Record<string, string> = { ip, key: this.apiKey };
    const params = new URLSearchParams(rawParams);
    if (this.apiSk) params.set("sig", this.computeSig(path, rawParams));

    const resp = await fetch(`${this.baseUrl}${path}?${params}`);
    const data = await resp.json() as TencentMapResponse<IpLocationResult>;
    if (data.status !== 0) return null;
    const r = data.result!;
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

    const path = "/ws/place/v1/search";
    const rawParams: Record<string, string> = {
      keyword: params.keyword,
      key: this.apiKey,
      page_index: String(params.pageIndex || 1),
      page_size: String(params.pageSize || 20),
    };
    if (params.boundary) rawParams.boundary = params.boundary;
    if (params.filter) rawParams.filter = params.filter;
    const qs = new URLSearchParams(rawParams);
    if (this.apiSk) qs.set("sig", this.computeSig(path, rawParams));

    const resp = await fetch(`${this.baseUrl}${path}?${qs}`);
    const data = await resp.json() as TencentMapResponse<unknown, MapPoiItem[]>;
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

  /** 距离计算（支持驾车/步行/骑行） */
  async distanceMatrix(
    from: { lat: number; lng: number },
    to: Array<{ lat: number; lng: number }>,
    mode: "driving" | "walking" | "bicycling" = "driving",
  ) {
    const toStr = to.map((t) => `${t.lat},${t.lng}`).join(";");
    const path = "/ws/distance/v1";
    const rawParams: Record<string, string> = {
      from: `${from.lat},${from.lng}`,
      to: toStr,
      key: this.apiKey,
      mode,
    };
    const params = new URLSearchParams(rawParams);
    if (this.apiSk) params.set("sig", this.computeSig(path, rawParams));

    const resp = await fetch(`${this.baseUrl}${path}?${params}`);
    const data = await resp.json() as TencentMapResponse<DistanceMatrixResult>;
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
  drivingRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
    return this.route("driving", from, to);
  }

  /** 步行路线规划 */
  walkingRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
    return this.route("walking", from, to);
  }

  /** 骑行路线规划 */
  bicyclingRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
    return this.route("bicycling", from, to);
  }

  /** 公交路线规划 */
  transitRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
    return this.route("transit", from, to);
  }

  /** 路线规划（统一实现） */
  private async route(mode: "driving" | "walking" | "bicycling" | "transit", from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
    const path = `/ws/direction/v1/${mode}`;
    const rawParams: Record<string, string> = {
      from: `${from.lat},${from.lng}`,
      to: `${to.lat},${to.lng}`,
      key: this.apiKey,
    };
    const params = new URLSearchParams(rawParams);
    if (this.apiSk) params.set("sig", this.computeSig(path, rawParams));

    const resp = await fetch(`${this.baseUrl}${path}?${params}`);
    const data = await resp.json() as TencentMapResponse<DrivingRouteResult>;
    if (data.status !== 0) {
      this.logger.error(`${mode}路线规划失败`, data);
      return null;
    }
    const r = data.result?.routes?.[0];
    if (!r) return null;
    return {
      distance: r.distance,
      duration: r.duration,
      polyline: r.polyline,
      steps: (r.steps as RouteStep[] || []).map((s) => ({
        instruction: s.instruction,
        road: s.road_name,
        distance: s.distance,
        duration: s.duration,
      })),
    };
  }

  /** 行政区划查询 */
  async districtList(id?: string) {
    const path = "/ws/district/v1/list";
    const rawParams: Record<string, string> = { key: this.apiKey };
    if (id) rawParams.id = id;
    const params = new URLSearchParams(rawParams);
    if (this.apiSk) params.set("sig", this.computeSig(path, rawParams));

    const resp = await fetch(`${this.baseUrl}${path}?${params}`);
    const data = await resp.json() as TencentMapResponse<DistrictNode[]>;
    if (data.status !== 0) return [];
    return (data.result as DistrictNode[] || []).flatMap((r) => this.flattenDistrict(r));
  }

  /** 实时天气查询 */
  async getRealtimeWeather(location: string, addedFields?: string[]) {
    const cacheKey = `weather:now:${location}`;
    const cached = this.weatherCache.get(cacheKey);
    if (cached) return cached;

    const path = "/ws/weather/v1";
    const rawParams: Record<string, string> = { location, key: this.apiKey, type: "now" };
    if (addedFields?.length) rawParams.added_fields = addedFields.join(",");
    const params = new URLSearchParams(rawParams);
    if (this.apiSk) params.set("sig", this.computeSig(path, rawParams));

    const resp = await fetch(`${this.baseUrl}${path}?${params}`);
    const data = await resp.json() as TencentMapResponse<RealtimeWeather>;
    if (data.status !== 0) {
      this.logger.error("天气查询失败", data);
      return null;
    }
    const result = {
      province: data.result!.province,
      city: data.result!.city,
      district: data.result!.district,
      adcode: data.result!.adcode,
      updateTime: data.result!.update_time,
      weather: data.result!.infos.weather,
      temperature: data.result!.infos.temperature,
      windDirection: data.result!.infos.wind_direction,
      windPower: data.result!.infos.wind_power,
      humidity: data.result!.infos.humidity,
      airPressure: data.result!.infos.air_pressure,
      alarms: data.result!.alarms || [],
      air: data.result!.air || null,
    };
    this.weatherCache.set(cacheKey, result, 15 * 60 * 1000);
    return result;
  }

  /** 逐日天气预报（4天/7天） */
  async getFutureWeather(location: string, days: 4 | 7 = 7, addedFields?: string[]) {
    const cacheKey = `weather:future:${location}:${days}`;
    const cached = this.weatherCache.get(cacheKey);
    if (cached) return cached;

    const path = "/ws/weather/v1";
    const rawParams: Record<string, string> = {
      location, key: this.apiKey, type: "future",
      get_md: days === 7 ? "1" : "0",
    };
    if (addedFields?.length) rawParams.added_fields = addedFields.join(",");
    const params = new URLSearchParams(rawParams);
    if (this.apiSk) params.set("sig", this.computeSig(path, rawParams));

    const resp = await fetch(`${this.baseUrl}${path}?${params}`);
    const data = await resp.json() as TencentMapResponse<ForecastWeather>;
    if (data.status !== 0) {
      this.logger.error("天气预报查询失败", data);
      return null;
    }
    const result = {
      province: data.result!.province,
      city: data.result!.city,
      district: data.result!.district,
      adcode: data.result!.adcode,
      updateTime: data.result!.update_time,
      forecasts: data.result!.infos.map((d) => ({
        date: d.date,
        week: d.week,
        day: { weather: d.day.weather, temperature: d.day.temperature, windDirection: d.day.wind_direction, windPower: d.day.wind_power, humidity: d.day.humidity },
        night: { weather: d.night.weather, temperature: d.night.temperature, windDirection: d.night.wind_direction, windPower: d.night.wind_power, humidity: d.night.humidity },
      })),
      indexes: data.result!.indexes || [],
      air: data.result!.air || [],
    };
    this.weatherCache.set(cacheKey, result, 60 * 60 * 1000); // 预报缓存1h
    return result;
  }

  /** 24小时逐时预报 */
  async getHourlyWeather(location: string) {
    const cacheKey = `weather:hours:${location}`;
    const cached = this.weatherCache.get(cacheKey);
    if (cached) return cached;

    const path = "/ws/weather/v1";
    const rawParams: Record<string, string> = { location, key: this.apiKey, type: "hours" };
    const params = new URLSearchParams(rawParams);
    if (this.apiSk) params.set("sig", this.computeSig(path, rawParams));

    const resp = await fetch(`${this.baseUrl}${path}?${params}`);
    const data = await resp.json() as TencentMapResponse<HourlyWeather>;
    if (data.status !== 0) {
      this.logger.error("逐时预报查询失败", data);
      return null;
    }
    const result = {
      province: data.result!.province,
      city: data.result!.city,
      district: data.result!.district,
      adcode: data.result!.adcode,
      updateTime: data.result!.update_time,
      hours: data.result!.infos.map((h) => ({
        hour: h.hour,
        weather: h.info.weather,
        temperature: h.info.temperature,
        windDirection: h.info.wind_direction,
        windPower: h.info.wind_power,
      })),
    };
    this.weatherCache.set(cacheKey, result, 30 * 60 * 1000); // 逐时缓存30min
    return result;
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
