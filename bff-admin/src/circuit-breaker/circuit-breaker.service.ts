import { Injectable, Logger } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge, Counter } from 'prom-client';
import CircuitBreaker from 'opossum';

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);

  constructor(
    @InjectMetric('circuit_breaker_state') public stateGauge: Gauge<string>,
    @InjectMetric('circuit_breaker_rejections_total')
    public rejectionsCounter: Counter<string>,
  ) {}

  createBreaker(
    asyncFunction: (...args: any[]) => Promise<any>,
    fallbackValue: any,
    serviceName: string = 'Serviço Externo',
    endpointName: string = 'Geral',
  ): CircuitBreaker {
    const options = {
      timeout: 3000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    };

    const breaker = new CircuitBreaker(asyncFunction, options);
    this.stateGauge.set({ service: serviceName, endpoint: endpointName }, 0);

    breaker.fallback((...args: any[]) => {
      const error =
        args.find((arg) => arg instanceof Error) ||
        new Error('Erro desconhecido');

      if (breaker.opened) {
        this.rejectionsCounter.inc({
          service: serviceName,
          endpoint: endpointName,
        });
      }

      this.logger.warn(
        `Fallback acionado para ${serviceName} (${endpointName}). Motivo: ${error.message}`,
      );

      if (
        typeof fallbackValue === 'object' &&
        fallbackValue !== null &&
        !Array.isArray(fallbackValue)
      ) {
        return {
          ...fallbackValue,
          isFallback: true,
        };
      }

      return fallbackValue;
    });

    breaker.on('open', () => {
      this.stateGauge.set({ service: serviceName, endpoint: endpointName }, 2);
      this.logger.error(
        `[CIRCUIT BREAKER] ABERTO para ${serviceName} (${endpointName}).`,
      );
    });

    breaker.on('halfOpen', () => {
      this.stateGauge.set({ service: serviceName, endpoint: endpointName }, 1);
      this.logger.warn(
        `[CIRCUIT BREAKER] MEIO-ABERTO para ${serviceName} (${endpointName}).`,
      );
    });

    breaker.on('close', () => {
      this.stateGauge.set({ service: serviceName, endpoint: endpointName }, 0);
      this.logger.log(
        `[CIRCUIT BREAKER] FECHADO para ${serviceName} (${endpointName}).`,
      );
    });

    return breaker;
  }
}
