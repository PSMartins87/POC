import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Logger, 
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import type { RedisClientType } from 'redis';
import { CACHE_DURATION_KEY } from './cache-duration.decorator';

@Injectable()
export class RedisCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RedisCacheInterceptor.name); 

  constructor(
    private readonly reflector: Reflector,
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
  ) {}

  private cleanFallbackFlags(obj: any) {
    if (obj && typeof obj === 'object') {
      if (Array.isArray(obj)) {
        obj.forEach((item) => this.cleanFallbackFlags(item));
      } else {
        delete obj._isFallback;
        Object.values(obj).forEach((val) => this.cleanFallbackFlags(val));
      }
    }
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    if (req.method !== 'GET') {
      return next.handle();
    }

    const key = `__nestjs__${req.originalUrl || req.url}`;

    try {
      if (this.redisClient && this.redisClient.isReady) {
        const cachedResponse = await this.redisClient.get(key);
        
        if (cachedResponse) {
          this.logger.log(`[CACHE HIT - REDIS] Retornando dados para: ${key}`);
          res.setHeader('X-Cache', 'HIT');
          return of(JSON.parse(cachedResponse)); 
        }
      }
    } catch (error: any) {
      this.logger.error(`[REDIS ERROR] Falha na consulta de cache para ${key}: ${error.message}`);
    }

    this.logger.debug(`[CACHE MISS - REDIS] Buscando na origem: ${key}`);
    res.setHeader('X-Cache', 'MISS');

    const durationSec = this.reflector.get<number>(CACHE_DURATION_KEY, context.getHandler()) || 60;

    return next.handle().pipe(
      map((data) => {
        if (!data) return data;

        const bodyString = JSON.stringify(data);
        const hasFallback = bodyString.includes('"_isFallback":true') || 
                            (Array.isArray(data) && data.length === 0);

        if (!hasFallback) {
          if (this.redisClient && this.redisClient.isReady) {
            this.redisClient
              .set(key, bodyString, { EX: durationSec })
              .catch((err) => this.logger.error(`[REDIS ERROR] Falha ao salvar cache: ${err.message}`));
          }
        } else {
          this.logger.warn(`[CACHE SKIP] Fallback detectado em ${key}. Ignorando cache.`);
          
          const cleanedData = JSON.parse(bodyString);
          this.cleanFallbackFlags(cleanedData);
          return cleanedData;
        }

        return data;
      })
    );
  }
}