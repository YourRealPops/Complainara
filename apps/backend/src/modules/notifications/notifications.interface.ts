/**
 * Interface for sending notifications on complaint status changes.
 *
 * Implementations:
 * - ConsoleNotificationService (dev/stub — logs to console)
 * - ResendNotificationService (TODO: plug in Resend API)
 * - PostmarkNotificationService (TODO: plug in Postmark API)
 *
 * To swap providers, update the provider binding in NotificationsModule.
 */

export type NotificationPayload = {
  /** The email address of the recipient */
  to: string;
  /** Human-readable subject line */
  subject: string;
  /** Plain-text body of the notification */
  body: string;
};

export interface NotificationService {
  send(payload: NotificationPayload): Promise<void>;
}
