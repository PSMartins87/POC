import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const session = request.session as Record<string, any>;

    if (!session || !session.accessToken) {
      throw new UnauthorizedException('Sessão inválida ou expirada no BFF.');
    }
    request['auth'] = {
      sessionId: request.sessionID,
      userId: session.keycloakPayload?.sub,
      accessToken: session.accessToken,
    };

    return true;
  }
}