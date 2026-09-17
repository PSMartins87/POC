import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FinnhubService } from './finnhub.service';
import { CircuitBreakerModule } from '../circuit-breaker/circuit-breaker.module';

@Module({
  imports: [HttpModule, CircuitBreakerModule],
  providers: [FinnhubService],
  exports: [FinnhubService] 
})
export class FinnhubModule {}