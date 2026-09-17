import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { ClientProxy } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import type { RedisClientType } from 'redis';

@Injectable()
export class SessionCleanupService {
  constructor(
    private readonly logger: Logger,
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientProxy,
  ) {}

  @Interval(60000)
  async processExpiredSessions() {
    this.logger.debug({ msg: '⏱️ Iniciando varredura de sessões expiradas no Redis...' });

    const now = Date.now();
    const indexKey = 'sessions:expiration_index';
    const appName = this.configService.get<string>('APP_NAME') || 'bff-admin';

    try {
      const expiredRecords = await this.redis.zRange(indexKey, '-inf', now.toString(), { BY: 'SCORE' });

      if (!expiredRecords || expiredRecords.length === 0) return;

      this.logger.warn({ msg: `🧹 Encontradas ${expiredRecords.length} sessões expiradas. Limpando...` });

      for (const record of expiredRecords) {
        const [sessionId, ...userIdParts] = record.split(':');
        const userId = userIdParts.join(':');

        const removedCount = await this.redis.zRem(indexKey, record);

        if (removedCount > 0) {
          const sessionKey = `sess:${sessionId}`; 
          await this.redis.del(sessionKey);

          this.kafkaClient.emit('security.events', {
            eventType: 'SESSION_EXPIRED',
            sessionId: sessionId,
            userId: userId,
            occurredAt: new Date().toISOString(),
            origin: appName,
          });

          this.logger.log({ msg: `🚨 Kafka Notificado: Sessão expirada destruída`, sessionId, userId });
        }
      }
    } catch (error: any) {
      this.logger.error({ msg: '❌ Erro na varredura de sessões expiradas', err: error.message });
    }
  }
}