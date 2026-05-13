import { IsString, IsOptional, IsArray, MinLength } from "class-validator";

export class SendNotificationDto {
  @IsOptional() @IsString()
  userId?: string;

  @IsString()
  @MinLength(1)
  type: string;

  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
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
  @MinLength(1)
  type: string;

  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional() @IsString()
  targetType?: string;

  @IsOptional() @IsString()
  targetId?: string;
}
