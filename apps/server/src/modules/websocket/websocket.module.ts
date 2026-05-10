import { Module, Global } from "@nestjs/common";
import { AppGateway } from "./websocket.gateway";
import { WsAuthService } from "./ws-auth.service";

@Global()
@Module({
  providers: [AppGateway, WsAuthService],
  exports: [AppGateway, WsAuthService],
})
export class WebsocketModule {}
