import { SetMetadata } from "@nestjs/common";

export const SKIP_ACTIVE_USER_KEY = "skipActiveUser";

/** 豁免 ActiveUserGuard 检查（用于账户申诉、激活等端点） */
export const SkipActiveUserCheck = () => SetMetadata(SKIP_ACTIVE_USER_KEY, true);
