import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RedisCacheModule');
        const redisUrl = configService.getOrThrow<string>('REDIS_URL');
        const client = createClient({ url: redisUrl });
        client.on('error', (err) => {
          logger.error('Falha na conexão com o Redis', err);
        });

        client.on('connect', () => {
          logger.log('Conectado ao Redis com sucesso!');
        });
        await client.connect();
        return client; 
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'], 
})
export class RedisCacheModule {}