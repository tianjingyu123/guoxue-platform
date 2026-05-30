import { SetMetadata } from "@nestjs/common";

export const SKIP_STATION_ISOLATION_KEY = "skipStationIsolation";

/** 豁免分站数据隔离（管理员操作或平台级端点） */
export const SkipStationIsolation = () => SetMetadata(SKIP_STATION_ISOLATION_KEY, true);
