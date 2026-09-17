import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';

@Injectable()
export class BacenService implements OnModuleInit {
  private breakers: Record<number, any> = {};
  private readonly logger = new Logger(BacenService.name);
  private seriesConfig = {
    432: { name: 'SELIC', fallback: { valor: null, _isFallback: true } },
    13522: { name: 'IPCA', fallback: { valor: null, _isFallback: true } },
    1: { name: 'PTAX', fallback: { valor: null, _isFallback: true } },
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly breakerFactory: CircuitBreakerService,
  ) {}

  onModuleInit() {
    const baseURL = this.configService.get<string>('BACEN_API_URL');

    Object.keys(this.seriesConfig).forEach((codeStr) => {
      const code = parseInt(codeStr, 10);
      const config = this.seriesConfig[code];

      this.breakers[code] = this.breakerFactory.createBreaker(
        async () => {
          this.logger.debug({ msg: `Consultando série ${config.name} (${code}) no Bacen` });

          const response = await firstValueFrom(
            this.httpService.get(`${baseURL}/bcdata.sgs.${code}/dados/ultimos/12`, {
              params: { formato: 'json' },
            })
          );
          return response.data[0];
        },
        config.fallback,
        'Bacen',
        config.name,
      );
    });

    this.logger.log({ msg: '✅ Circuit Breakers para as séries do Bacen inicializados com sucesso.' });
  }

  async fetchLastValue(seriesCode: number) {
    const breaker = this.breakers[seriesCode];

    if (!breaker) {
      this.logger.error({ msg: `Tentativa de acesso à série Bacen inválida ou não configurada`, seriesCode });
      throw new Error(`Série Bacen ${seriesCode} não está configurada nos disjuntores.`);
    }

    return breaker.fire();
  }
}