import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { SafeService } from './modules/safe/safe.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: config.get<string>('cors.origin'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api', { exclude: ['health'] });

  // Fail fast if any enabled chain's RPC doesn't actually serve that chain —
  // silently trusting a misconfigured/swapped RPC URL risks sending real
  // transactions to the wrong network.
  await app.get(SafeService).assertChainIdsMatch();

  const port = config.get<number>('port') ?? 4000;
  await app.listen(port);
  Logger.log(`FundBrave MVP API running on http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
