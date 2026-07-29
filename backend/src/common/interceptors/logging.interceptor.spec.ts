import { ForbiddenException, InternalServerErrorException } from "@nestjs/common";
import { lastValueFrom, throwError } from "rxjs";
import { LoggingInterceptor } from "./logging.interceptor";

function context() {
  const request = {
    method: "GET",
    url: "/api/drivers/driver-a/orders/active",
    body: undefined,
    query: {},
    params: { driverId: "driver-a" },
    ip: "127.0.0.1",
    requestId: "request-id",
    user: { sub: "driver-b", role: "DRIVER" },
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ statusCode: 200 }),
    }),
  } as any;
}

describe("LoggingInterceptor", () => {
  it("logs expected HTTP 4xx rejections as warnings without an error field", async () => {
    const interceptor = new LoggingInterceptor();
    const logger = (interceptor as any).logger;
    jest.spyOn(logger, "debug").mockImplementation();
    const warn = jest.spyOn(logger, "warn").mockImplementation();
    const error = jest.spyOn(logger, "error").mockImplementation();

    await expect(
      lastValueFrom(
        interceptor.intercept(context(), {
          handle: () =>
            throwError(
              () =>
                new ForbiddenException(
                  "Driver identity does not match authenticated user",
                ),
            ),
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(error).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      "Request rejected: GET /api/drivers/driver-a/orders/active",
      expect.objectContaining({
        statusCode: 403,
        message: "Driver identity does not match authenticated user",
      }),
    );
    expect(warn.mock.calls[0][1]).not.toHaveProperty("error");
  });

  it("retains error-level stack logging for HTTP 5xx failures", async () => {
    const interceptor = new LoggingInterceptor();
    const logger = (interceptor as any).logger;
    jest.spyOn(logger, "debug").mockImplementation();
    jest.spyOn(logger, "warn").mockImplementation();
    const error = jest.spyOn(logger, "error").mockImplementation();

    await expect(
      lastValueFrom(
        interceptor.intercept(context(), {
          handle: () =>
            throwError(() => new InternalServerErrorException("failed")),
        }),
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(error).toHaveBeenCalledWith(
      "Request failed: GET /api/drivers/driver-a/orders/active",
      expect.any(String),
      expect.objectContaining({ statusCode: 500, message: "failed" }),
    );
  });
});
