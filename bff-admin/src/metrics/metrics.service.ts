import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Gauge } from 'prom-client';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private redisClient: RedisClientType;
  public bffActiveSessions: Gauge<string>;
  constructor(private configService: ConfigService) {
    this.bffActiveSessions = new Gauge({
      name: 'bff_active_sessions_total',
      help: 'Total de sessões ativas armazenadas no Redis',
      collect: async () => {
        try {
          if (this.redisClient && this.redisClient.isReady) {
            const keys = await this.redisClient.keys('sessoes:*');
            this.bffActiveSessions.set(keys.length);
          } else {
            this.bffActiveSessions.set(0);
          }
        } catch (error) {
          console.error('[METRICS ERROR] Falha ao contar sessões:', error);
          this.bffActiveSessions.set(0);
        }
      },
    });
  }

  async onModuleInit() {
    const redisUrl =
      this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.redisClient = createClient({ url: redisUrl });
    this.redisClient.on('error', (err) =>
      console.error('[REDIS CLIENT ERROR]', err),
    );
    await this.redisClient.connect();
    import('prom-client').then(({ register }) => {
      register.registerMetric(this.bffActiveSessions);
    });
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}
