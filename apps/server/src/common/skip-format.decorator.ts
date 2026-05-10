import { SetMetadata } from "@nestjs/common";

export const SKIP_FORMAT_KEY = "skipFormat";
export const SkipFormat = () => SetMetadata(SKIP_FORMAT_KEY, true);
