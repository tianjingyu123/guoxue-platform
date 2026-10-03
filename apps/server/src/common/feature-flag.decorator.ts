import { applyDecorators, SetMetadata } from "@nestjs/common";

export const FEATURE_FLAG_KEY = "feature_flag";
export const FEATURE_FLAG_WRITE_KEY = "feature_flag_write";
export const FEATURE_FLAG_OPTIONAL_KEY = "feature_flag_optional";

/** 要求指定功能开关启用才能访问 */
export const RequireFeature = (
  key: string,
  options: { writes?: boolean; whenConfigured?: boolean } = {},
) =>
  applyDecorators(
    SetMetadata(FEATURE_FLAG_KEY, key),
    SetMetadata(FEATURE_FLAG_WRITE_KEY, options.writes === true),
    SetMetadata(FEATURE_FLAG_OPTIONAL_KEY, options.whenConfigured === true),
  );
