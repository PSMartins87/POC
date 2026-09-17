import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  app.setGlobalPrefix('api');
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  const configService = app.get(ConfigService);
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const frontendUrl = configService.getOrThrow<string>('FRONTEND_URL');
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });
  const redisUrl = configService.getOrThrow<string>('REDIS_URL');
  const redisClient = createClient({ url: redisUrl });
  redisClient.on('error', (err) => logger.error({ msg: '❌ [REDIS ERROR]', err: err.message }));
  redisClient.on('connect', () => logger.log({ msg: '✅ [REDIS] Conectado com sucesso!' }));
  
  await redisClient.connect();
  
  const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'sess:', // 
    ttl: () => 60 * 35,
    disableTouch: true, 
  });

  const cookieDomain = isProduction ? '.paulosilveriomartins.com.br' : undefined;

  app.use(
    session({
      store: redisStore,
      secret: configService.getOrThrow<string>('SESSION_SECRET'),
      resave: false,
      saveUninitialized: false,
      name: 'financeiro.sid',
      cookie: {
        secure: isProduction, 
        sameSite: isProduction ? 'none' : 'lax',
        httpOnly: true,
        domain: cookieDomain,
        path: '/',
        maxAge: 1000 * 60 * 60 * 4,
      },
    }),
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [configService.getOrThrow<string>('RABBITMQ_URL')],
      queue: 'queue.bff.financeiro.session.revoke', 
      noAck: false, 
      queueOptions: {
        durable: true,
      },
      exchange: 'session.commands.exchange', 
      exchangeType: 'direct',
      routingKey: 'revoke.session.bff-financeiro',
    },
  });

  await app.startAllMicroservices();

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  
  logger.log({ msg: `🚀 BFF rodando na porta: ${port}` });
}
bootstrap();