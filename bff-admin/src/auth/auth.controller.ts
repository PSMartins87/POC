import {
  Controller,
  Get,
  Req,
  Res,
  Session,
  Query,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { ClientProxy } from '@nestjs/microservices';
import type { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import * as geoip from 'geoip-lite';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { SecurityEvent } from '../common/interfaces/security-event.interface';
import type { RedisClientType } from 'redis';
import UAParser from 'ua-parser-js';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientProxy,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  @Get('login')
  async iniciarLogin(@Req() req: Request, @Res() res: Response) {
    const keycloakUrl = this.configService.getOrThrow<string>('KEYCLOAK_URL');
    const realm = this.configService.getOrThrow<string>('KEYCLOAK_REALM');
    const clientId = this.configService.getOrThrow<string>('KEYCLOAK_CLIENT_ID');
    const bffUrl = this.configService.getOrThrow<string>('BFF_URL');
    
    const redirectUri = `${bffUrl}/api/auth/callback`;
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    const state = crypto.randomBytes(16).toString('hex');

    const session = req.session as Record<string, any>;
    session.pkce = { state, codeVerifier };

    const authUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/auth` +
      `?client_id=${clientId}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=openid profile email` +
      `&code_challenge=${codeChallenge}` +
      `&code_challenge_method=S256` +
      `&state=${state}`;

    return new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          this.logger.error('Erro ao salvar contexto PKCE no Redis', err);
          res.status(500).send('Erro interno ao iniciar sessão');
          return reject(err);
        }
        res.redirect(authUrl);
        resolve();
      });
    });
  }

  @Get('callback')
  async keycloakCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Session() session: Record<string, any>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    if (!code || !state) {
      return res.redirect(`${frontendUrl}/login?erro=parametros_ausentes`);
    }

    const pkceData = session.pkce;
    if (!pkceData || pkceData.state !== state) {
      this.logger.warn('Tentativa de login com state inválido ou sessão expirada.');
      return res.redirect(`${frontendUrl}/login?erro=integridade`);
    }

    const codeVerifier = pkceData.codeVerifier;
    delete session.pkce;

    const keycloakInternalUrl = this.configService.getOrThrow<string>('KEYCLOAK_INTERNAL_URL');
    const realm = this.configService.getOrThrow<string>('KEYCLOAK_REALM');
    const clientId = this.configService.getOrThrow<string>('KEYCLOAK_CLIENT_ID');
    const clientSecret = this.configService.getOrThrow<string>('KEYCLOAK_CLIENT_SECRET');
    const bffUrl = this.configService.getOrThrow<string>('BFF_URL');
    const redirectUri = `${bffUrl}/api/auth/callback`;

    try {
      const tokenResponse = await firstValueFrom(
        this.httpService.post(
          `${keycloakInternalUrl}/realms/${realm}/protocol/openid-connect/token`,
          new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
          }).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        ),
      );

      const { access_token, refresh_token, id_token } = tokenResponse.data;
      const payloadDecodificado = jwt.decode(access_token) as jwt.JwtPayload;

      const userId = payloadDecodificado?.sub;
      const ipAddress = (req.headers['x-forwarded-for'] || req.ip || '127.0.0.1') as string;
      const cleanIp = ipAddress.split(',')[0].trim();
      
      const parser = new UAParser(req.headers['user-agent'] as string);
      const browserInfo = parser.getBrowser();
      const osInfo = parser.getOS();
      const geo = geoip.lookup(cleanIp);

      const fingerprint = {
        ip: cleanIp,
        browser: `${browserInfo.name || 'Desconhecido'} ${browserInfo.version || ''}`.trim(),
        os: `${osInfo.name || 'Desconhecido'} ${osInfo.version || ''}`.trim(),
        city: geo?.city || 'Desconhecida',
      };

      const agora = new Date().toISOString();

      session.accessToken = access_token;
      session.refreshToken = refresh_token;
      session.idToken = id_token;
      session.keycloakPayload = payloadDecodificado;
      session.contexto = {
        user_id: userId,
        ...fingerprint,
        first_login_at: agora,
        last_login_at: agora,
      };

      if (payloadDecodificado?.exp) {
        await this.redis.zAdd('sessions:expiration_index', [
          { score: payloadDecodificado.exp * 1000, value: `${req.sessionID}:${userId}` },
        ]).catch(err => this.logger.error('Falha ao registrar sessão no Redis', err));
      }

      if (userId) {
        const appName = this.configService.get<string>('APP_NAME') || 'bff';
        this.kafkaClient.emit('security.events', {
          eventId: uuidv4(),
          eventType: 'LOGIN_SUCCESS',
          occurredAt: agora,
          userId,
          sessionId: req.sessionID,
          origin: appName,
          details: { email: payloadDecodificado?.email, fingerprint },
        } as SecurityEvent);
      }

      req.session.save((err) => {
        if (err) return res.redirect(`${frontendUrl}/login?erro=sessao`);
        return res.redirect(frontendUrl);
      });
    } catch (error: any) {
      this.logger.error('Falha no fluxo de callback', error?.response?.data || error.message);
      res.redirect(`${frontendUrl}/login?erro=autenticacao`);
    }
  }

  @Get('me')
  verMeuPerfil(@Session() session: Record<string, any>) {
    if (!session.accessToken) {
      throw new UnauthorizedException('Sessão inválida');
    }

    const payload = session.keycloakPayload;
    const clientId = this.configService.getOrThrow<string>('KEYCLOAK_CLIENT_ID');
    
    return {
      usuario: {
        id: payload?.sub,
        nome: payload?.name || payload?.preferred_username,
        email: payload?.email,
        roles: payload?.resource_access?.[clientId]?.roles || [],
      },
      seguranca: session.contexto,
    };
  }

  @Get('logout')
  async fazerLogout(@Req() req: Request, @Res() res: Response) {
    const keycloakUrl = this.configService.getOrThrow<string>('KEYCLOAK_URL');
    const realm = this.configService.getOrThrow<string>('KEYCLOAK_REALM');
    const clientId = this.configService.getOrThrow<string>('KEYCLOAK_CLIENT_ID');
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    const sessionCustomizada = req.session as Record<string, any>;
    const idToken = sessionCustomizada?.idToken;
    const userId = sessionCustomizada?.keycloakPayload?.sub;
    const sessionId = req.sessionID;

    if (sessionId && userId) {
      const expTimeMs = sessionCustomizada?.keycloakPayload?.exp
        ? sessionCustomizada.keycloakPayload.exp * 1000
        : Date.now() + 3600000;

      this.kafkaClient.emit('security.events', {
        eventId: uuidv4(),
        eventType: 'LOGOUT',
        occurredAt: new Date().toISOString(),
        expiresAt: new Date(expTimeMs).toISOString(),
        userId,
        sessionId,
        origin: this.configService.get<string>('APP_NAME') || 'bff',
      } as SecurityEvent);

      await this.redis.zRem('sessions:expiration_index', `${sessionId}:${userId}`)
        .catch(err => this.logger.error('Falha ao remover sessão no logout', err));
    }

    req.session.destroy(() => {
      res.clearCookie('admin.sid', { // Certifique-se de que o nome do cookie está dinâmico se usar em múltiplos BFFs
        domain: isProduction ? '.paulosilveriomartins.com.br' : undefined,
        path: '/',
      });

      let logoutUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/logout`;
      logoutUrl += idToken 
        ? `?post_logout_redirect_uri=${encodeURIComponent(frontendUrl)}&id_token_hint=${idToken}` 
        : `?client_id=${clientId}`;

      return res.redirect(logoutUrl);
    });
  }
}