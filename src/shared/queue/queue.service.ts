import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type QueueJob<TPayload> = {
  id: string;
  name: string;
  payload: TPayload;
};

@Injectable()
export class QueueService {
  addJob<TPayload>(
    name: string,
    payload: TPayload,
  ): Promise<QueueJob<TPayload>> {
    return Promise.resolve({
      id: randomUUID(),
      name,
      payload,
    });
  }
}
