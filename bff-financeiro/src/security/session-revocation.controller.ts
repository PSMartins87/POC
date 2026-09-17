import { Controller, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventPattern, Payload, Ctx, RmqContext, ClientProxy } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';
import type { RedisClientType } from 'redis';
import { SecurityEvent } from '../common/interfaces/security-event.interface';

@Controller()
export class SessionRevocationController {
  private readonly logger = new Logger(SessionRevocationController.name);
  constructor(
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientProxy, 
  ) {}

  @EventPattern('revoke.session.bff-financeiro') 
  async handleRevokeSessionCommand(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const { sessionId, userId } = data;

    this.logger.warn({ msg: '🛑 Comando de revogação recebido do RabbitMQ', data });

    if (!sessionId || !userId) {
      channel.ack(originalMsg);
      return;
    }

    try {
      const sessionKey = `sess:${sessionId}`;
      const indexKey = 'sessions:expiration_index';
      
      const deleted = await this.redis.del(sessionKey);
      await this.redis.zRem(indexKey, `${sessionId}:${userId}`);

      if (deleted > 0) {
        this.logger.log({ msg: '✅ Sessão destruída no Redis do BFF!', sessionId });

        const appName = this.configService.get<string>('APP_NAME') || 'bff-financeiro';

        const revocationEvent: SecurityEvent = {
          eventId: uuidv4(),
          eventType: 'REVOKE_SESSION',
          occurredAt: new Date().toISOString(),
          userId,
          sessionId,
          origin: appName, 
        };

        this.kafkaClient.emit('security.events', revocationEvent);
      } else {
        this.logger.warn({ msg: 'Sessão não encontrada no Redis. Provavelmente já expirada.', sessionId });
      }

      channel.ack(originalMsg);
    } catch (error: any) {
      this.logger.error({ msg: '❌ Erro ao revogar sessão', err: error.message, sessionId });
      channel.nack(originalMsg, false, true); 
    }
  }
}