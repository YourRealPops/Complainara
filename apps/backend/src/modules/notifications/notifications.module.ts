import { Module } from '@nestjs/common';
import type { NotificationService } from './notifications.interface';
import { ConsoleNotificationService } from './console-notification.service';

/**
 * Notifications module.
 *
 * Currently uses ConsoleNotificationService (stub).
 * To switch to a real provider (Resend, Postmark, etc.):
 *   1. Install the SDK
 *   2. Create a new service implementing NotificationService
 *   3. Replace the provider binding below
 */
@Module({
  providers: [
    {
      provide: 'NotificationService',
      useClass: ConsoleNotificationService,
    },
  ],
  exports: ['NotificationService'],
})
export class NotificationsModule {}
