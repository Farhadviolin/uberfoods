import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Generiere UUID für diese Request
    const requestId = uuidv4();

    // Setze requestId auf Request-Objekt für spätere Verwendung
    req.requestId = requestId;

    // Setze x-request-id Header in der Response
    res.setHeader("x-request-id", requestId);

    // Setze auch requestId als lokale Variable für Response-Handler
    res.locals.requestId = requestId;

    next();
  }
}
