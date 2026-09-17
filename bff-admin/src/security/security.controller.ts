import {
  Controller,
  Get,
  Delete,
  Param,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { SecurityService } from './security.service';

@Controller('admin/security')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  private getSessionData(req: Request) {
    const session = req.session as Record<string, any>;
    const token = session?.accessToken;
    const userId = session?.keycloakPayload?.sub;
    const sessionId = req.sessionID;

    if (!token || !userId || !sessionId) {
      throw new UnauthorizedException(
        'Sessão inválida. Por favor, faça login novamente.',
      );
    }
    return { token, userId, sessionId };
  }

  @Get('devices')
  async getDevices(@Req() req: Request) {
    const { token, userId, sessionId } = this.getSessionData(req);
    return this.securityService.getDevices(token, sessionId, userId);
  }

  @Get('sessions')
  async getSessions(@Req() req: Request) {
    const { token, userId, sessionId } = this.getSessionData(req);
    return this.securityService.getSessions(token, sessionId, userId);
  }

  @Delete('sessions/:targetSessionId')
  async revokeSession(
    @Req() req: Request,
    @Param('targetSessionId') targetSessionId: string,
  ) {
    const { token, userId, sessionId } = this.getSessionData(req);
    await this.securityService.revokeSession(token, sessionId, userId, targetSessionId);
    return { message: 'Sessão revogada com sucesso.' };
  }

  @Delete('devices/:deviceId')
  async forgetDevice(@Req() req: Request, @Param('deviceId') deviceId: string) {
    const { token, userId, sessionId } = this.getSessionData(req);
    await this.securityService.forgetDevice(token, sessionId, userId, deviceId);
    return { message: 'Dispositivo esquecido com sucesso.' };
  }
}