import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger, 
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : (exception as Error).message || 'Internal Server Error';

    const stack = exception instanceof Error ? exception.stack : undefined;
    const isProduction = process.env.NODE_ENV === 'production';

    this.logger.error(
      `Falha na aplicação | URL: ${request.originalUrl} | Method: ${request.method} | Status: ${status} | Erro: ${message}`,
      stack,
    );

    const displayMessage =
      isProduction && status === HttpStatus.INTERNAL_SERVER_ERROR
        ? 'Ocorreu um erro interno no servidor. Nossa equipe já foi notificada.'
        : message;

    response.status(status).json({
      success: false,
      error: {
        code: status,
        type:
          status === HttpStatus.INTERNAL_SERVER_ERROR
            ? 'InternalServerError'
            : 'OperationalError',
        message: displayMessage,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  }
}