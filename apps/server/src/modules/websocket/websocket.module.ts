import { Module, Global } from "@nestjs/common";
import { AppGateway } from "./websocket.gateway";
import { WsAuthService } from "./ws-auth.service";
import { AuditModule } from "../audit/audit.module";

@Global()
@Module({
  imports: [AuditModule],
  providers: [AppGateway, WsAuthService],
  exports: [AppGateway, WsAuthService],
})
export class WebsocketModule {}
