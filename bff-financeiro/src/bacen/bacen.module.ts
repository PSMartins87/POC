import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'; 
import { BacenService } from './bacen.service';
import { CircuitBreakerModule } from '../circuit-breaker/circuit-breaker.module'; 

@Module({
  imports: [HttpModule, CircuitBreakerModule], 
  providers: [BacenService],
  exports: [BacenService],
})
export class BacenModule {}