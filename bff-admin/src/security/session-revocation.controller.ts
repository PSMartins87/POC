import { Controller, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventPattern, Payload, Ctx, RmqContext, ClientProxy } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';
import type { RedisClientType } from 'redis';
import { SecurityEvent } from '../common/interfaces/security-event.interface';

@Controller()
export class SessionRevocationController {
  constructor(
    private readonly logger: Logger,
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientProxy,
  ) {}

  @EventPattern('revoke.session.bff-admin')
  async handleRevokeSessionCommand(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const { sessionId, userId } = data;

    this.logger.warn({ msg: '🛑 Comando de revogação forçada recebido', data });

    if (!sessionId || !userId) {
      this.logger.error({ msg: 'Comando ignorado: parâmetros ausentes', data });
      channel.ack(originalMsg);
      return;
    }

    try {
      const sessionKey = `sess:${sessionId}`;
      const indexKey = 'sessions:expiration_index';

      const deleted = await this.redis.del(sessionKey);
      await this.redis.zRem(indexKey, `${sessionId}:${userId}`);

      if (deleted > 0) {
        this.logger.log({ msg: '✅ Sessão destruída com sucesso no Redis!', sessionId });

        const appName = this.configService.get<string>('APP_NAME') || 'bff-admin';

        const revocationEvent: SecurityEvent = {
          eventId: uuidv4(),
          eventType: 'REVOKE_SESSION',
          sessionId,
          userId,
          occurredAt: new Date().toISOString(),
          origin: appName, 
        };

        this.kafkaClient.emit('security.events', revocationEvent);
      } else {
        this.logger.warn({ msg: 'Sessão não encontrada no Redis. Provavelmente já expirada.', sessionId });
      }

      channel.ack(originalMsg);
      
    } catch (error: any) {
      this.logger.error({ msg: `❌ Falha grave ao tentar revogar sessão`, err: error.message, sessionId });
      channel.nack(originalMsg, false, true); 
    }
  }
}