import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class StationAssistantChatDto {
  @ApiProperty({ description: "站长的经营问题", maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  query: string;

  @ApiPropertyOptional({ description: "续聊会话 ID；首次对话可不传", format: "uuid" })
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}

export class StationAssistantSessionQueryDto {
  @ApiProperty({ description: "会话 ID", format: "uuid" })
  @IsUUID()
  conversationId: string;
}
