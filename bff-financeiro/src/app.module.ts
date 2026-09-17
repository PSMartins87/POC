import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { HttpModule } from '@nestjs/axios';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MetricsService } from './metrics/metrics.service';
import { MetricsController } from './metrics/metrics.controller';
import { AuthModule } from './auth/auth.module';
import { ApiClientModule } from './api-client/api-client.module';
import { CircuitBreakerModule } from './circuit-breaker/circuit-breaker.module';
import { RedisCacheModule } from './redis-cache/redis-cache.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { FinnhubModule } from './finnhub/finnhub.module';
import { BacenModule } from './bacen/bacen.module';
import { SessionMiddleware } from './auth/session.middleware';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { SessionCleanupService } from './security/session-cleanup.service'; 
import { SessionRevocationController } from './security/session-revocation.controller';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
    PrometheusModule.register({
      defaultMetrics: { enabled: true },
      controller: MetricsController, 
    }),
    AuthModule,
    ApiClientModule,
    CircuitBreakerModule,
    RedisCacheModule,
    DashboardModule,
    FinnhubModule,
    BacenModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController, MetricsController, SessionRevocationController],
  providers: [
    AppService,
    MetricsService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    SessionCleanupService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionMiddleware).forRoutes('*');
  }
}