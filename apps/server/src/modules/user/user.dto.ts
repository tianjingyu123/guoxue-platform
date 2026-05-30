import { IsString, IsOptional, IsEnum, IsInt, IsArray, ArrayMinSize, Min, MinLength, IsDateString } from "class-validator";
import { Type } from "class-transformer";
import { MemberLevel, RoleType, UserStatus } from "@prisma/client";

export class AssignRoleDto {
  @IsEnum(RoleType)
  roleType: RoleType;

  @IsOptional() @IsString()
  bindId?: string;
}

export class RemoveRoleDto {
  @IsOptional() @IsString()
  bindId?: string;
}

export class UserListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  pageSize?: number;

  @IsOptional() @IsString()
  keyword?: string;

  @IsOptional() @IsEnum(RoleType)
  roleType?: RoleType;

  @IsOptional() @IsEnum(MemberLevel)
  memberLevel?: MemberLevel;

  @IsOptional() @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional() @IsDateString()
  dateFrom?: string;

  @IsOptional() @IsDateString()
  dateTo?: string;
}

export class UpdateProfileDto {
  @IsOptional() @IsString()
  nickname?: string;

  @IsOptional() @IsString()
  avatar?: string;

  @IsOptional() @IsString()
  bio?: string;

  @IsOptional() @Type(() => Number) @IsInt()
  gender?: number;
}

export class UpdateUserStatusDto {
  @IsString()
  @MinLength(1)
  status: string;
}

export class BatchUpdateUserStatusDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[];

  @IsString()
  @MinLength(1)
  status: string;
}
