import { Injectable, UnauthorizedException, HttpException, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import type { RedisClientType } from 'redis';

@Injectable()
export class SecurityService {
  private readonly iamAudience = 'iam-service';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  private async getServiceToken(userAccessToken: string, sessionId: string, audience: string): Promise<string> {
    const redisKey = `exchange:session:${sessionId}:${audience}`;
    const cachedToken = await this.redis.get(redisKey);
    
    if (cachedToken) return cachedToken;

    const keycloakInternalUrl = this.configService.getOrThrow<string>('KEYCLOAK_INTERNAL_URL');
    const realm = this.configService.getOrThrow<string>('KEYCLOAK_REALM');
    const clientId = this.configService.getOrThrow<string>('KEYCLOAK_CLIENT_ID');
    const clientSecret = this.configService.getOrThrow<string>('KEYCLOAK_CLIENT_SECRET');
    
    const tokenEndpoint = `${keycloakInternalUrl}/realms/${realm}/protocol/openid-connect/token`;

    const params = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
      client_id: clientId,
      client_secret: clientSecret,
      subject_token: userAccessToken,
      requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
      audience: audience,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post(tokenEndpoint, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      const tokenData = response.data;
      const ttl = tokenData.expires_in ? tokenData.expires_in - 10 : 300;
      await this.redis.set(redisKey, tokenData.access_token, { EX: ttl });

      return tokenData.access_token;
    } catch (error: any) {
      this.logger.error({
        msg: `Falha no Token Exchange para ${audience}`,
        err: error?.response?.data || error.message,
        sessionId,
      });
      throw new UnauthorizedException('Falha ao autenticar com o serviço de segurança.');
    }
  }

  async forgetDevice(originalToken: string, sessionId: string, userId: string, deviceId: string) {
    const iamUrl = this.configService.getOrThrow<string>('JAVA_IAM_URL');
    const exchangedToken = await this.getServiceToken(originalToken, sessionId, this.iamAudience);

    await firstValueFrom(
      this.httpService.delete(`${iamUrl}/api/security/devices/${deviceId}`, {
        headers: { Authorization: `Bearer ${exchangedToken}`, 'X-User-Id': userId },
      }).pipe(
        catchError((err) => {
          throw new HttpException(err.response?.data, err.response?.status);
        }),
      ),
    );
  }

  async getDevices(originalToken: string, sessionId: string, userId: string) {
    const iamUrl = this.configService.getOrThrow<string>('JAVA_IAM_URL');
    const exchangedToken = await this.getServiceToken(originalToken, sessionId, this.iamAudience);

    const { data } = await firstValueFrom(
      this.httpService.get(`${iamUrl}/api/security/devices`, {
        headers: { Authorization: `Bearer ${exchangedToken}`, 'X-User-Id': userId },
      }).pipe(
        catchError((err) => {
          throw new HttpException(err.response?.data, err.response?.status);
        }),
      ),
    );
    return { devices: data };
  }

  async getSessions(originalToken: string, sessionId: string, userId: string) {
    const iamUrl = this.configService.getOrThrow<string>('JAVA_IAM_URL');
    const exchangedToken = await this.getServiceToken(originalToken, sessionId, this.iamAudience);

    const { data } = await firstValueFrom(
      this.httpService.get(`${iamUrl}/api/security/sessions`, {
        headers: { Authorization: `Bearer ${exchangedToken}`, 'X-User-Id': userId },
      }).pipe(
        catchError((err) => {
          throw new HttpException(err.response?.data, err.response?.status);
        }),
      ),
    );
    return { sessions: data };
  }

  async revokeSession(originalToken: string, sessionId: string, userId: string, targetSessionId: string) {
    const iamUrl = this.configService.getOrThrow<string>('JAVA_IAM_URL');
    const exchangedToken = await this.getServiceToken(originalToken, sessionId, this.iamAudience);

    await firstValueFrom(
      this.httpService.delete(`${iamUrl}/api/security/sessions/${targetSessionId}/revoke`, {
        headers: { Authorization: `Bearer ${exchangedToken}`, 'X-User-Id': userId },
      }).pipe(
        catchError((err) => {
          throw new HttpException(err.response?.data, err.response?.status);
        }),
      ),
    );
  }
}