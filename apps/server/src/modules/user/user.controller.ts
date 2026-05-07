import { Controller, Get, Put, Body, UseGuards, Req } from "@nestjs/common";
import { UserService } from "./user.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@Controller("users")
export class UserController {
  constructor(private user: UserService) {}

  @Get("profile")
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: any) {
    return this.user.getProfile(req.user.id);
  }

  @Put("profile")
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Req() req: any,
    @Body() body: { nickname?: string; avatar?: string },
  ) {
    return this.user.updateProfile(req.user.id, body);
  }

  @Get("favorites")
  @UseGuards(JwtAuthGuard)
  getFavorites(@Req() req: any) {
    return this.user.getFavorites(req.user.id);
  }
}
