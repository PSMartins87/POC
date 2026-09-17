import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { FinnhubModule } from '../finnhub/finnhub.module'; 
import { BacenModule } from '../bacen/bacen.module';       
import { RedisCacheModule } from '../redis-cache/redis-cache.module'; 
import { AuthModule } from 'src/auth/auth.module';
import { HttpModule } from '@nestjs/axios'; 
@Module({
  imports: [
    FinnhubModule,
    BacenModule,
    RedisCacheModule,
    AuthModule,
    HttpModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}