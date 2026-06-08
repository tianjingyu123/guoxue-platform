import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsArray, MinLength } from "class-validator";

export class GenUserSigDto {
  @ApiPropertyOptional({ description: "用户ID（不传则使用当前登录用户）" })
  @IsString()
  @IsOptional()
  userId?: string;
}

export class ImportAccountDto {
  @ApiProperty({ description: "用户ID", example: "user-xxx" })
  @IsString()
  @MinLength(1)
  userId: string;

  @ApiPropertyOptional({ description: "昵称" })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiPropertyOptional({ description: "头像URL" })
  @IsString()
  @IsOptional()
  avatar?: string;
}

export class CreateGroupDto {
  @ApiProperty({ description: "群组ID（关联业务ID）", example: "circle-xxx" })
  @IsString()
  @MinLength(1)
  groupId: string;

  @ApiProperty({ description: "群名称", example: "国学交流群" })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: "群类型", example: "Public", default: "Public" })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: "群主用户ID" })
  @IsString()
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional({ description: "初始成员ID列表" })
  @IsArray()
  @IsOptional()
  memberIds?: string[];
}

export class AddGroupMembersDto {
  @ApiProperty({ description: "要添加的成员ID列表", example: ["user-1", "user-2"] })
  @IsArray()
  memberIds: string[];
}

// ───────── 单聊消息 ─────────

export class SendC2CMsgDto {
  @ApiProperty({ description: "接收者用户ID" })
  @IsString()
  @MinLength(1)
  toUserId: string;

  @ApiProperty({ description: "消息文本内容" })
  @IsString()
  @MinLength(1)
  text: string;
}

export class WithdrawMsgDto {
  @ApiProperty({ description: "接收者用户ID（单聊为对方ID，群聊为群ID）" })
  @IsString()
  @MinLength(1)
  toUserId: string;

  @ApiProperty({ description: "消息唯一Key" })
  @IsString()
  @MinLength(1)
  msgKey: string;
}

// ───────── 好友管理 ─────────

export class UpdateImProfileDto {
  @IsOptional() @IsString()
  nickname?: string;

  @IsOptional() @IsString()
  avatar?: string;
}

export class SendImGroupMsgDto {
  @IsString()
  @MinLength(1)
  text: string;
}

export class SendImageDto {
  @ApiProperty({ description: "接收者用户ID" })
  @IsString() @MinLength(1)
  toUserId: string;

  @ApiProperty({ description: "图片URL" })
  @IsString() @MinLength(1)
  imageUrl: string;

  @ApiPropertyOptional({ description: "图片宽度" })
  @IsOptional() @IsString()
  width?: number;

  @ApiPropertyOptional({ description: "图片高度" })
  @IsOptional() @IsString()
  height?: number;
}

export class SendCustomDto {
  @ApiProperty({ description: "接收者用户ID" })
  @IsString() @MinLength(1)
  toUserId: string;

  @IsOptional()
  data: Record<string, unknown>;

  @ApiPropertyOptional({ description: "描述" })
  @IsOptional() @IsString()
  desc?: string;
}

export class FriendDto {
  @ApiProperty({ description: "目标用户ID" })
  @IsString()
  @MinLength(1)
  toUserId: string;

  @ApiPropertyOptional({ description: "备注名" })
  @IsString()
  @IsOptional()
  remark?: string;
}
