import { Controller, Get } from "@nestjs/common";
import { PushNotificationService } from "../services/push-notification.service";

/**
 * Öffentlicher Endpunkt für die Driver App, um den Web Push
 * VAPID Public Key abzurufen. Kein Guard nötig, da der Key öffentlich ist.
 * Pfad wird auf /drivers/push/public-key gemappt, damit das Frontend
 * keinen abweichenden Notifications-Pfad kennen muss.
 */
@Controller("drivers/push")
export class DriverPushController {
  constructor(private readonly pushService: PushNotificationService) {}

  @Get("public-key")
  getPublicKey() {
    return { publicKey: this.pushService.getVapidPublicKey() };
  }
}
