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
  let prisma: {
    admin: { findUnique: jest.Mock };
    customer: { findUnique: jest.Mock };
    driver: { findUnique: jest.Mock };
    restaurant: { findUnique: jest.Mock };
    order: { findUnique: jest.Mock; findFirst: jest.Mock };
  };
  let gateway: WebSocketGateway;
  let middleware: SocketMiddleware;

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    const activeUser = jest.fn().mockResolvedValue({ id: "1", isActive: true });
    prisma = {
      admin: { findUnique: activeUser },
      customer: { findUnique: activeUser },
      driver: { findUnique: activeUser },
      restaurant: { findUnique: activeUser },
      order: { findUnique: jest.fn(), findFirst: jest.fn() },
    };
    gateway = new WebSocketGateway(jwtService as unknown as JwtService, prisma as never);
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
      await expect(gateway.joinRoom(client, room)).resolves.toEqual({ success: true, room });
      await expect(gateway.joinRoom(client, "customer_other")).resolves.toEqual({
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
