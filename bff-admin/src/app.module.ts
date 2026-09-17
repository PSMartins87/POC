import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exeption.filter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MetricsService } from './metrics/metrics.service';
import { MetricsController } from './metrics/metrics.controller';
import { HttpModule } from '@nestjs/axios';
import { AuthModule } from './auth/auth.module';
import { CircuitBreakerModule } from './circuit-breaker/circuit-breaker.module';
import { RedisCacheModule } from './redis-cache/redis-cache.module';
import { SessionMiddleware } from './auth/session.middleware';
import { SecurityModule } from './security/security.module';
import { SessionRevocationController } from './security/session-revocation.controller';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty' } 
            : undefined, 
      },
    }),
    PrometheusModule.register({
      defaultMetrics: { enabled: true },
      controller: MetricsController,
    }),
    HttpModule,
    AuthModule,
    CircuitBreakerModule,
    RedisCacheModule,
    SecurityModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [
    AppController,
    MetricsController,
    SessionRevocationController,
  ],
  providers: [
    AppService,
    MetricsService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionMiddleware).forRoutes('*');
  }
}
