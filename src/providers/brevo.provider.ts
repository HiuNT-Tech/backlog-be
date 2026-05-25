import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';
import { BusinessException } from '@common/exceptions/business.exception';
import { ErrorCode } from '@common/exceptions/error-code';

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
export interface EmailProvider {
  sendEmail(
    recipientEmail: string,
    subject: string,
    htmlContent: string,
  ): Promise<void>;
}
@Injectable()
export class BrevoEmailProvider implements OnModuleInit, EmailProvider {
  private readonly logger = new Logger(BrevoEmailProvider.name);

  private client: BrevoClient;
  private isConfigured = false;

  private senderEmail: string;
  private senderName: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const apiKey = this.configService.get<string>('app.brevoApiKey');

    if (!apiKey) {
      this.logger.warn(
        'BREVO_API_KEY is not configured — email sending will be unavailable',
      );
      return;
    }

    this.client = new BrevoClient({ apiKey });
    this.senderEmail = this.configService.get<string>(
      'app.mailSenderEmail',
      'no-reply@example.com',
    );
    this.senderName = this.configService.get<string>(
      'app.mailSenderName',
      'Backlog App',
    );
    this.isConfigured = true;
    this.logger.log('Brevo email provider initialised');
  }

  async sendEmail(
    recipientEmail: string,
    subject: string,
    htmlContent: string,
  ): Promise<void> {
    if (!this.isConfigured) {
      throw new BusinessException(
        ErrorCode.EMAIL_SERVICE_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: recipientEmail }],
        subject,
        htmlContent,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send email to ${recipientEmail}: ${detail}`);

      throw new BusinessException(
        ErrorCode.EMAIL_SERVICE_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
