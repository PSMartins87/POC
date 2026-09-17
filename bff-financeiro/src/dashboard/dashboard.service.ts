import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { FinnhubService } from '../finnhub/finnhub.service';
import { BacenService } from '../bacen/bacen.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  constructor(
    private readonly finnhubService: FinnhubService,
    private readonly bacenService: BacenService,
  ) {}

  async getMacroEconomics() {
    try {
      this.logger.debug({ msg: 'Buscando indicadores macroeconômicos do Bacen em paralelo' });

      const [selic, ipca, ptax] = await Promise.all([
        this.bacenService.fetchLastValue(432),   
        this.bacenService.fetchLastValue(13522), 
        this.bacenService.fetchLastValue(1),     
      ]);

      return {
        indicadores: {
          selic,
          ipca,
          ptax,
        },
      };
    } catch (error: any) {
      this.logger.error({
        msg: 'Erro ao buscar dados macroeconômicos',
        err: error.message,
      });
      throw new InternalServerErrorException('Erro ao carregar dados macroeconômicos');
    }
  }

  async getMarketOverview(ticker: string = 'AAPL') {
    try {
      this.logger.debug({ msg: 'Orquestrando painel de mercado no Finnhub', ticker });

      const [quote, profile, metrics, news, status] = await Promise.all([
        this.finnhubService.getQuote(ticker),
        this.finnhubService.getProfile(ticker),
        this.finnhubService.getMetrics(ticker),
        this.finnhubService.getMarketNews(),
        this.finnhubService.getMarketStatus('US'),
      ]);

      return {
        ativo: profile,
        cotacaoAtual: quote,
        metricas: metrics,
        noticiasGerais: news,
        statusMercado: status,
      };
    } catch (error: any) {
      this.logger.error({
        msg: 'Erro ao orquestrar painel de mercado',
        ticker,
        err: error.message,
      });
      throw new InternalServerErrorException('Erro ao carregar o overview do mercado');
    }
  }
}