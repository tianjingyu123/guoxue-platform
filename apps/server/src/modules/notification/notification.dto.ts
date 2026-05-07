import { IsString, IsOptional, IsInt, IsArray } from "class-validator";

export class SendNotificationDto {
  @IsString()
  type: string;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional() @IsString()
  targetType?: string;

  @IsOptional() @IsString()
  targetId?: string;
}

export class BatchSendDto {
  @IsArray()
  userIds: string[];

  @IsString()
  type: string;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional() @IsString()
  targetType?: string;

  @IsOptional() @IsString()
  targetId?: string;
}
