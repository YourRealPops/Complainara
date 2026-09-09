import { Injectable, Logger } from '@nestjs/common';
import type {
  NotificationPayload,
  NotificationService,
} from './notifications.interface';

/**
 * Stub implementation that logs notifications to the console.
 * Swap this out for Resend/Postmark when ready — just update
 * the provider binding in NotificationsModule.
 */
@Injectable()
export class ConsoleNotificationService implements NotificationService {
  private readonly logger = new Logger(ConsoleNotificationService.name);

  async send(payload: NotificationPayload): Promise<void> {
    this.logger.log(
      `[STUB NOTIFICATION] To: ${payload.to} | Subject: ${payload.subject}\n${payload.body}`,
    );
  }
}
