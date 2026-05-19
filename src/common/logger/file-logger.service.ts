import {
  ConsoleLogger,
  Injectable,
  LogLevel,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import { isAbsolute, join, parse } from 'node:path';
import { inspect } from 'node:util';

type LogRecord = {
  timestamp: string;
  level: LogLevel;
  context?: string;
  message: string;
  params?: string[];
};

@Injectable()
export class FileLogger extends ConsoleLogger implements OnModuleDestroy {
  private writeQueue = Promise.resolve();

  constructor(private readonly configService: ConfigService) {
    super({
      prefix: 'BE_02',
      timestamp: true,
    });
  }

  override log(message: unknown, ...optionalParams: unknown[]): void {
    this.writeToFile('log', message, optionalParams);
    super.log(message, ...optionalParams);
  }

  override error(message: unknown, ...optionalParams: unknown[]): void {
    this.writeToFile('error', message, optionalParams);
    super.error(message, ...optionalParams);
  }

  override warn(message: unknown, ...optionalParams: unknown[]): void {
    this.writeToFile('warn', message, optionalParams);
    super.warn(message, ...optionalParams);
  }

  override debug(message: unknown, ...optionalParams: unknown[]): void {
    this.writeToFile('debug', message, optionalParams);
    super.debug(message, ...optionalParams);
  }

  override verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.writeToFile('verbose', message, optionalParams);
    super.verbose(message, ...optionalParams);
  }

  override fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.writeToFile('fatal', message, optionalParams);
    super.fatal(message, ...optionalParams);
  }

  async onModuleDestroy(): Promise<void> {
    await this.writeQueue;
  }

  private writeToFile(
    level: LogLevel,
    message: unknown,
    optionalParams: unknown[],
  ): void {
    const record: LogRecord = {
      timestamp: new Date().toISOString(),
      level,
      context: this.getContext(optionalParams),
      message: this.stringify(message),
      params: this.stringifyParams(optionalParams),
    };
    const line = `${JSON.stringify(record)}\n`;

    this.writeQueue = this.writeQueue
      .then(() => this.appendRecord(level, line))
      .catch((error: unknown) => {
        super.error(
          `Cannot write log file: ${this.stringify(error)}`,
          FileLogger.name,
        );
      });
  }

  private async appendRecord(level: LogLevel, line: string): Promise<void> {
    const appLogPath = this.getLogPath('app.log');
    const errorLogPath = this.getLogPath('error.log');

    await fs.mkdir(this.getLogDirectory(), { recursive: true });
    await this.rotateIfNeeded(appLogPath);
    await fs.appendFile(appLogPath, line);

    if (level === 'error' || level === 'fatal') {
      await this.rotateIfNeeded(errorLogPath);
      await fs.appendFile(errorLogPath, line);
    }
  }

  private async rotateIfNeeded(filePath: string): Promise<void> {
    try {
      const stat = await fs.stat(filePath);

      if (stat.size < this.getMaxFileSizeBytes()) {
        return;
      }

      const parsedPath = parse(filePath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedPath = join(
        parsedPath.dir,
        `${parsedPath.name}-${timestamp}${parsedPath.ext}`,
      );

      await fs.rename(filePath, rotatedPath);
    } catch (error: unknown) {
      if (this.isFileNotFoundError(error)) {
        return;
      }

      throw error;
    }
  }

  private getLogDirectory(): string {
    const configuredPath = this.configService.get<string>(
      'app.logDirectory',
      'logs',
    );

    return isAbsolute(configuredPath)
      ? configuredPath
      : join(process.cwd(), configuredPath);
  }

  private getLogPath(fileName: string): string {
    return join(this.getLogDirectory(), fileName);
  }

  private getMaxFileSizeBytes(): number {
    return this.configService.get<number>(
      'app.logMaxFileSizeBytes',
      10_485_760,
    );
  }

  private isFileNotFoundError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    );
  }

  private stringifyParams(params: unknown[]): string[] | undefined {
    if (params.length === 0) {
      return undefined;
    }

    return params.map((param) => this.stringify(param));
  }

  private getContext(params: unknown[]): string | undefined {
    const lastParam = params.at(-1);
    return typeof lastParam === 'string' ? lastParam : undefined;
  }

  private stringify(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    return inspect(value, {
      breakLength: Infinity,
      depth: 8,
      maxArrayLength: 100,
      maxStringLength: 10000,
    });
  }
}
