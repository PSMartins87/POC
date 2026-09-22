import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'; 

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.setGlobalPrefix('api');
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  const logger = app.get(Logger);
  app.useLogger(logger);
  const configService = app.get(ConfigService);
  const isProduction = configService.get<string>('NODE_ENV') === 'production';


  const frontendUrl = configService.getOrThrow<string>('FRONTEND_URL');
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });

  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  const redisUrl = configService.getOrThrow<string>('REDIS_URL');
  const redisClient = createClient({ url: redisUrl });

  redisClient.on('error', (err) => logger.error({ msg: '❌ Falha na conexão do Redis (Session)', err }));
  redisClient.on('connect', () => logger.log({ msg: '✅ Redis (Session) conectado com sucesso!' }));

  await redisClient.connect();

  const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'sess:', 
    ttl: 60 * 35, 
    disableTouch: true,
  });

  const cookieDomain = isProduction ? '.paulosilveriomartins.com.br' : undefined;
  const sessionSecret = configService.getOrThrow<string>('SESSION_SECRET');

  app.use(
    session({
      store: redisStore,
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      name: 'admin.sid',
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

  const rabbitmqUrl = configService.getOrThrow<string>('RABBITMQ_URL');
  
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'queue.bff.admin.session.revoke', 
      noAck: false, 
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();

  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port);
  
  logger.log({ msg: `🚀 BFF Admin rodando na porta: ${port}` });
}
bootstrap();