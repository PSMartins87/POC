import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { RedisCacheInterceptor } from './redis-cache.interceptor';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.getOrThrow<string>('REDIS_URL');
        const client = createClient({ url: redisUrl });

        client.on('error', (err) => {
          console.error('[REDIS ERROR] Falha no cliente Redis do Cache:', err.message);
        });

        client.on('connect', () => {
          console.log('[REDIS] Conectado ao Redis de Cache com sucesso!');
        });

        await client.connect();
        return client;
      },
      inject: [ConfigService], 
    },
    RedisCacheInterceptor,
  ],
  exports: [
    'REDIS_CLIENT',
    RedisCacheInterceptor,
  ],
})
export class RedisCacheModule {}