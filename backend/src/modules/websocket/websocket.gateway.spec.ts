import { JwtService } from "@nestjs/jwt";
import { Server, Socket } from "socket.io";
import { WebSocketGateway } from "./websocket.gateway";

type SocketMiddleware = (
  client: Socket,
  next: (error?: Error) => void,
) => void | Promise<void>;

const createClient = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "socket-1",
    handshake: { auth: {}, headers: {} },
    data: {},
    join: jest.fn(),
    disconnect: jest.fn(),
    ...overrides,
  }) as unknown as Socket & { data: Record<string, unknown> };

describe("WebSocketGateway", () => {
  let jwtService: jest.Mocked<Pick<JwtService, "verifyAsync">>;
  let gateway: WebSocketGateway;
  let middleware: SocketMiddleware;

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    gateway = new WebSocketGateway(jwtService as unknown as JwtService);
    gateway.afterInit({
      use: jest.fn((handler: SocketMiddleware) => {
        middleware = handler;
      }),
    } as unknown as Server);
  });

  const authenticate = async (client: Socket) => {
    let middlewareError: Error | undefined;
    await middleware(client, (error) => {
      middlewareError = error;
    });
    return middlewareError;
  };

  it("rejects missing and invalid authentication before a socket is connected", async () => {
    await expect(authenticate(createClient())).resolves.toEqual(
      expect.objectContaining({ message: "authentication required" }),
    );

    const invalidTokenClient = createClient({
      handshake: { auth: { token: "invalid" }, headers: {} },
    });
    jwtService.verifyAsync.mockRejectedValueOnce(new Error("invalid token"));
    await expect(authenticate(invalidTokenClient)).resolves.toEqual(
      expect.objectContaining({ message: "authentication required" }),
    );
  });

  it.each([
    ["customer", "customer_1"],
    ["driver", "driver_1"],
    ["restaurant", "restaurant_1"],
    ["ADMIN", "admin-room"],
  ])(
    "authorizes %s sockets only for their primary room",
    async (role, room) => {
      const client = createClient({
        handshake: { auth: { token: "valid" }, headers: {} },
      });
      jwtService.verifyAsync.mockResolvedValueOnce({ sub: "1", role });

      await expect(authenticate(client)).resolves.toBeUndefined();
      gateway.handleConnection(client);
      expect(client.join).toHaveBeenCalledWith(room);
      expect(gateway.joinRoom(client, room)).toEqual({ success: true, room });
      expect(gateway.joinRoom(client, "customer_other")).toEqual({
        success: false,
        error: "room access denied",
      });
    },
  );

  it("rejects tokens without an allowed role", async () => {
    const client = createClient({
      handshake: { auth: { token: "valid" }, headers: {} },
    });
    jwtService.verifyAsync.mockResolvedValueOnce({ sub: "1", role: "unknown" });

    await expect(authenticate(client)).resolves.toEqual(
      expect.objectContaining({ message: "authentication required" }),
    );
  });
});
