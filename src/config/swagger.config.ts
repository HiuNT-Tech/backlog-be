import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

type SwaggerConfigOptions = {
  enabled: boolean;
};

export const setupSwagger = (
  app: INestApplication,
  options: SwaggerConfigOptions,
): void => {
  if (!options.enabled) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('Backlog API')
    .setDescription('API contract for the Backlog BE/FE integration.')
    .setVersion('1.0')
    .addCookieAuth(
      'accessToken',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'accessToken',
        description: 'JWT access token cookie',
      },
      'accessToken',
    )
    .addCookieAuth(
      'refreshToken',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken',
        description: 'JWT refresh token cookie',
      },
      'refreshToken',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token for Postman/Swagger testing',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Backlog API Docs',
  });
};
