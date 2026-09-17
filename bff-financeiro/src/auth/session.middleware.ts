import { Injectable, NestMiddleware, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import type { Request, Response, NextFunction } from 'express';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { SecurityEvent } from '../common/interfaces/security-event.interface';
import type { RedisClientType } from 'redis';

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SessionMiddleware.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientProxy,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const session = req.session as Record<string, any>;
    if (!session || !session.accessToken) {
      return next();
    }
    try {
      if (this.isTokenExpired(session.accessToken)) {
        this.logger.log({ msg: 'Access Token expirado. Renovando automaticamente via Refresh Token...' });
        if (!session.refreshToken) {
          this.logger.warn({ msg: 'Refresh Token ausente na sessão.' });
          return next();
        }
        const newTokens = await this.refreshTokensFromKeycloak(session.refreshToken);
        if (newTokens) {
          session.accessToken = newTokens.access_token;
          if (newTokens.refresh_token) {
            session.refreshToken = newTokens.refresh_token;
          }
          const userId = session.keycloakPayload?.sub;
          try {
            const payloadBase64 = newTokens.access_token.split('.')[1];
            const decodedNewToken = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
            const newExpTimeMs = decodedNewToken.exp * 1000;
            await this.redis.zAdd('sessions:expiration_index', [
              { score: newExpTimeMs, value: `${req.sessionID}:${userId}` },
            ]);
          } catch (redisErr) {
            this.logger.error({ msg: 'Erro ao atualizar índice de expiração no Redis', err: redisErr });
          }

          await new Promise((resolve, reject) => {
            session.save((err) => (err ? reject(err) : resolve(true)));
          });
          if (userId) {
            this.kafkaClient.emit('security.events', {
              eventId: uuidv4(),
              eventType: 'TOKEN_REFRESH',
              occurredAt: new Date().toISOString(),
              userId,
              sessionId: req.sessionID,
              origin: this.configService.get<string>('APP_NAME') || 'bff-financeiro',
              details: { message: 'Renovação silenciosa de token concluída' },
            } as SecurityEvent);
          }
          this.logger.log({ msg: 'Tokens renovados com sucesso nos bastidores!' });
        }
      }
      if (session.accessToken) {
        req.headers.authorization = `Bearer ${session.accessToken}`;
      }
    } catch (error: any) {
      this.logger.error({ msg: 'Falha na renovação do token', err: error.message });
      const sid = req.sessionID;
      session.destroy(() => {
        this.redis.zRem('sessions:expiration_index', sid).catch(() => {});
      });
    }

    next();
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payloadBase64 = token.split('.')[1];
      const decodedPayload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
      const expirationTime = decodedPayload.exp * 1000;
      return Date.now() >= expirationTime - 10000;
    } catch {
      return true;
    }
  }

  private async refreshTokensFromKeycloak(refreshToken: string) {
    const authServerUrl = this.configService.getOrThrow<string>('KEYCLOAK_INTERNAL_URL');
    const realm = this.configService.getOrThrow<string>('KEYCLOAK_REALM');
    const clientId = this.configService.getOrThrow<string>('KEYCLOAK_CLIENT_ID');
    const clientSecret = this.configService.getOrThrow<string>('KEYCLOAK_CLIENT_SECRET');

    const tokenUrl = `${authServerUrl}/realms/${realm}/protocol/openid-connect/token`;

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });

    const response = await firstValueFrom(
      this.httpService.post(tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );

    return response.data;
  }
}