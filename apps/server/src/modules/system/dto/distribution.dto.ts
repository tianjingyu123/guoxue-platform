import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class RegisterDistributionDto {
  @IsString() @Matches(/^[a-z][a-z0-9-]{1,47}$/) applicationId: string;
  @IsString() @Matches(/^[a-z][a-z0-9-]{1,47}$/) productId: string;
  @IsString() @IsIn(["android", "ios", "harmony"]) platform: string;
  @IsString() @Matches(/^[a-z][a-z0-9-]{1,47}$/) channelId: string;
  @IsString() @Matches(/^[a-z][a-z0-9._-]{1,79}$/) clientKey: string;
  @IsString() @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,159}$/) @MaxLength(160) packageName: string;
  @IsOptional() @IsString() @Matches(/^[a-fA-F0-9]{64}$/) signingCertificateSha256?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() @MaxLength(1000) policyEvidence?: string;
}
