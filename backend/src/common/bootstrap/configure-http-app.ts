import { INestApplication, ValidationPipe } from "@nestjs/common";

/**
 * Applies the routing-relevant HTTP contract shared by the local runtime and
 * in-process E2E applications. It intentionally does not listen on a port.
 */
export function configureHttpApplication(app: INestApplication): void {
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
}
