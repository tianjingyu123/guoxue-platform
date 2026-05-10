import { SetMetadata } from "@nestjs/common";

export const FEATURE_FLAG_KEY = "feature_flag";

/** 要求指定功能开关启用才能访问 */
export const RequireFeature = (key: string) => SetMetadata(FEATURE_FLAG_KEY, key);
