import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { isMongoId } from 'class-validator';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (metadata.type !== 'param') {
      return value;
    }

    if (!isMongoId(value)) {
      throw new BadRequestException('Invalid id format');
    }

    return value;
  }
}
