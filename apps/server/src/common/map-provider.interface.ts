/**
 * 地图服务 Provider 接口（国际化预留）
 *
 * 现有实现：MapService（腾讯地图）
 * 未来扩展：GoogleMapsProvider / MapboxProvider
 */

export interface IMapProvider {
  /** 地址解析 → 经纬度 */
  geocode(address: string): Promise<{ lat: number; lng: number; raw?: unknown }>;

  /** 逆地址解析 → 地址 */
  reverseGeocode(lat: number, lng: number): Promise<{ address: string; raw?: unknown }>;

  /** IP 定位 */
  ipLocation(ip: string): Promise<{ lat: number; lng: number; city?: string; raw?: unknown }>;

  /** 距离矩阵 */
  distanceMatrix(
    origins: Array<{ lat: number; lng: number }>,
    destinations: Array<{ lat: number; lng: number }>,
  ): Promise<{ distances: number[][]; durations: number[][]; raw?: unknown }>;

  /** 路线规划 */
  direction(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode?: 'driving' | 'walking' | 'bicycling' | 'transit',
  ): Promise<{ distance: number; duration: number; polyline?: string; steps?: unknown[]; raw?: unknown }>;

  /** 地点搜索 */
  search(keyword: string, region?: string): Promise<Array<{ name: string; address: string; lat: number; lng: number }>>;

  /** 天气查询 */
  weather?(lat: number, lng: number): Promise<{ current: WeatherInfo; forecast?: WeatherInfo[]; raw?: unknown }>;
}

export interface WeatherInfo {
  temperature: number;
  condition: string;
  humidity?: number;
  windSpeed?: number;
  icon?: string;
}
