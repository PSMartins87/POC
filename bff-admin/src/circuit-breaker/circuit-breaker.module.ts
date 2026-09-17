import { Module } from '@nestjs/common';
import {
  makeGaugeProvider,
  makeCounterProvider,
} from '@willsoto/nestjs-prometheus';
import { CircuitBreakerService } from './circuit-breaker.service';

@Module({
  providers: [
    CircuitBreakerService,
    makeGaugeProvider({
      name: 'circuit_breaker_state',
      help: 'Estado atual do Circuit Breaker (0=Fechado, 1=Meio-Aberto, 2=Aberto)',
      labelNames: ['service', 'endpoint'],
    }),
    makeCounterProvider({
      name: 'circuit_breaker_rejections_total',
      help: 'Total de requisições rejeitadas porque o circuito estava aberto',
      labelNames: ['service', 'endpoint'],
    }),
  ],
  exports: [CircuitBreakerService],
})
export class CircuitBreakerModule {}
