import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';
import { RedisCacheModule } from 'src/redis-cache/redis-cache.module';

@Module({
  imports: [HttpModule, RedisCacheModule],
  controllers: [SecurityController],
  providers: [SecurityService],
})
export class SecurityModule {}
