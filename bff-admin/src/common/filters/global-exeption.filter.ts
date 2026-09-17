import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from 'nestjs-pino'; 

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

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

    this.logger.error({
      msg: 'Falha na requisição interceptada pelo GlobalExceptionFilter',
      err: message,
      stack: stack,
      req: {
        method: request.method,
        url: request.originalUrl,
        ip: request.ip,
      },
      statusCode: status,
      context: GlobalExceptionFilter.name, 
    });

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