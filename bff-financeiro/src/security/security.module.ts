import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RedisCacheModule } from '../redis-cache/redis-cache.module';
import { SessionCleanupService } from './session-cleanup.service';
import { SessionRevocationController } from './session-revocation.controller';

@Module({
  imports: [HttpModule, RedisCacheModule],
  controllers: [SessionRevocationController],
  providers: [SessionCleanupService],
})
export class SecurityModule {}