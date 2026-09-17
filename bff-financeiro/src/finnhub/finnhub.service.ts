import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';

@Injectable()
export class FinnhubService implements OnModuleInit {
  private  apiKey: string;
  private  baseURL: string;
  private readonly logger = new Logger(FinnhubService.name);

  private queuePromise: Promise<any> = Promise.resolve();
  
  private quoteBreaker: any;
  private profileBreaker: any;
  private trendsBreaker: any;
  private metricsBreaker: any;
  private newsBreaker: any;
  private statusBreaker: any;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly breakerFactory: CircuitBreakerService,
  ) {}

  onModuleInit() {

    this.apiKey = this.configService.getOrThrow<string>('FINNHUB_API_KEY');
    this.baseURL = this.configService.getOrThrow<string>('FINNHUB_API_URL');
    this.quoteBreaker = this.breakerFactory.createBreaker(
      async (ticker: string) => {
        this.logger.debug({ msg: 'Consultando cotação no Finnhub', ticker });
        const response = await firstValueFrom(
          this.httpService.get(`${this.baseURL}/quote`, {
            params: { symbol: ticker, token: this.apiKey },
          })
        );
        return response.data;
      },
      { c: 0, d: 0, dp: 0, h: 0, l: 0, o: 0, pc: 0, t: 0, _isFallback: true },
      'Finnhub',
      '/quote'
    );

    this.profileBreaker = this.breakerFactory.createBreaker(
      async (ticker: string) => {
        this.logger.debug({ msg: 'Consultando perfil do ativo no Finnhub', ticker });
        const response = await firstValueFrom(
          this.httpService.get(`${this.baseURL}/stock/profile2`, {
            params: { symbol: ticker, token: this.apiKey },
          })
        );
        return response.data;
      },
      { _isFallback: true },
      'Finnhub',
      '/stock/profile2'
    );

    this.trendsBreaker = this.breakerFactory.createBreaker(
      async (ticker: string) => {
        this.logger.debug({ msg: 'Consultando recomendações/tendências no Finnhub', ticker });
        const response = await firstValueFrom(
          this.httpService.get(`${this.baseURL}/stock/recommendation`, {
            params: { symbol: ticker, token: this.apiKey },
          })
        );
        return response.data;
      },
      [], // Array vazio (ignorado pelo middleware de cache)
      'Finnhub',
      '/stock/recommendation'
    );

    this.metricsBreaker = this.breakerFactory.createBreaker(
      async (ticker: string) => {
        this.logger.debug({ msg: 'Consultando métricas fundamentalistas no Finnhub', ticker });
        const response = await firstValueFrom(
          this.httpService.get(`${this.baseURL}/stock/metric`, {
            params: { symbol: ticker, metric: 'all', token: this.apiKey },
          })
        );
        return response.data;
      },
      { metric: {}, _isFallback: true },
      'Finnhub',
      '/stock/metric'
    );

    this.newsBreaker = this.breakerFactory.createBreaker(
      async () => {
        this.logger.debug({ msg: 'Consultando notícias gerais de mercado no Finnhub' });
        const response = await firstValueFrom(
          this.httpService.get(`${this.baseURL}/news`, {
            params: { category: 'general', token: this.apiKey },
          })
        );
        return response.data;
      },
      [],
      'Finnhub',
      '/news'
    );

    this.statusBreaker = this.breakerFactory.createBreaker(
      async (exchange: string) => {
        this.logger.debug({ msg: 'Consultando status da bolsa no Finnhub', exchange });
        const response = await firstValueFrom(
          this.httpService.get(`${this.baseURL}/stock/market-status`, {
            params: { exchange, token: this.apiKey },
          })
        );
        return response.data;
      },
      { isOpen: false, session: 'closed', _isFallback: true },
      'Finnhub',
      '/stock/market-status'
    );

    this.logger.log({ msg: '✅ Circuit Breakers do Finnhub configurados e inicializados com sucesso.' });
  }

  // Lógica de Throttling mantida preservando o encadeamento seguro de Promises
  private withThrottle<T>(fn: () => Promise<T>): Promise<T> {
    const task = this.queuePromise.then(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      return fn();
    });
    
    // Atualiza a fila e ignora erros para não travar os próximos elementos
    this.queuePromise = task.catch(() => {}) as Promise<any>;
    return task;
  }

  // ==========================================================================
  // FUNÇÕES EXPOSTAS (Consumidas pelo DashboardService)
  // ==========================================================================

  getQuote(ticker: string) {
    return this.withThrottle(() => this.quoteBreaker.fire(ticker));
  }

  getProfile(ticker: string) {
    return this.withThrottle(() => this.profileBreaker.fire(ticker));
  }

  getTrends(ticker: string) {
    return this.withThrottle(() => this.trendsBreaker.fire(ticker));
  }

  getMetrics(ticker: string) {
    return this.withThrottle(() => this.metricsBreaker.fire(ticker));
  }

  getMarketNews() {
    return this.withThrottle(() => this.newsBreaker.fire());
  }

  getMarketStatus(exchange = 'US') {
    return this.withThrottle(() => this.statusBreaker.fire(exchange));
  }
}