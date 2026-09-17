import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Gauge } from 'prom-client';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private redisClient: RedisClientType;
  public bffActiveSessions: Gauge<string>;
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.bffActiveSessions = new Gauge({
      name: 'bff_active_sessions_total',
      help: 'Total de sessões ativas armazenadas no Redis',
      collect: async () => {
        try {
          if (this.redisClient && this.redisClient.isReady) {
            // 👈 Corrigido para buscar pelo prefixo padronizado 'sess:*'
            const keys = await this.redisClient.keys('sess:*');
            this.bffActiveSessions.set(keys.length);
          } else {
            this.bffActiveSessions.set(0);
          }
        } catch (error: any) {
          this.logger.error({
            msg: 'Falha ao contar sessões ativas no Redis para métricas',
            err: error.message,
          });
          this.bffActiveSessions.set(0);
        }
      },
    });
  }

  async onModuleInit() {
    const redisUrl = this.configService.getOrThrow<string>('REDIS_URL');
    
    this.redisClient = createClient({ url: redisUrl });
    
    this.redisClient.on('error', (err) => {
      this.logger.error({ msg: 'Erro no cliente Redis de métricas', err: err.message });
    });

    await this.redisClient.connect();

    const { register } = await import('prom-client');
    register.registerMetric(this.bffActiveSessions);

    this.logger.log({ msg: '📊 MetricsService inicializado e métrica de sessões registrada com sucesso.' });
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}