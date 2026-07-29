import { MODULE_METADATA } from "@nestjs/common/constants";
import { AuthModule } from "../auth/auth.module";
import { WebSocketGateway } from "./websocket.gateway";
import { WebsocketModule } from "./websocket.module";

describe("WebsocketModule", () => {
  it("registers the canonical gateway with access to the JWT module", () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, WebsocketModule),
    ).toContain(AuthModule);
    expect(
      Reflect.getMetadata(MODULE_METADATA.PROVIDERS, WebsocketModule),
    ).toContain(WebSocketGateway);
  });
});
