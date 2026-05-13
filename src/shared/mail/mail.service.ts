import { Injectable, Logger } from '@nestjs/common';

export type SendMailInput = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  sendMail(input: SendMailInput): Promise<void> {
    this.logger.log(`Mail queued to ${input.to}: ${input.subject}`);
    return Promise.resolve();
  }
}
