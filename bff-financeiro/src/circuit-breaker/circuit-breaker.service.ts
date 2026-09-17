import { Injectable, Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);

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

    breaker.fallback((...args: any[]) => {
      const error = args.find((arg) => arg instanceof Error) || new Error('Erro desconhecido');

      this.logger.warn({
        msg: 'Fallback acionado para serviço externo',
        service: serviceName,
        endpoint: endpointName,
        reason: error.message,
        isCircuitOpen: breaker.opened,
      });

      if (typeof fallbackValue === 'object' && fallbackValue !== null && !Array.isArray(fallbackValue)) {
        return {
          ...fallbackValue,
          isFallback: true,
        };
      }

      return fallbackValue;
    });

    breaker.on('open', () => {
      this.logger.error({
        msg: 'Circuit Breaker ABERTO',
        service: serviceName,
        endpoint: endpointName,
      });
    });

    breaker.on('halfOpen', () => {
      this.logger.warn({
        msg: 'Circuit Breaker MEIO-ABERTO (Testando recuperação)',
        service: serviceName,
        endpoint: endpointName,
      });
    });

    breaker.on('close', () => {
      this.logger.log({
        msg: 'Circuit Breaker FECHADO (Operação normal)',
        service: serviceName,
        endpoint: endpointName,
      });
    });

    return breaker;
  }
}