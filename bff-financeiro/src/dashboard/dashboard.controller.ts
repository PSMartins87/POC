import { Controller, Get, Param, UseInterceptors, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { RedisCacheInterceptor } from '../redis-cache/redis-cache.interceptor';
import { CacheDuration } from '../redis-cache/cache-duration.decorator';

@Controller('dashboard')
@UseInterceptors(RedisCacheInterceptor) 
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('macro')
  @CacheDuration(3600) 
  async getDashboardData() {
    const macroData = await this.dashboardService.getMacroEconomics();
    return {
      success: true,
      data: macroData,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('market')
  @CacheDuration(60) 
  async getMarketData(@Query('ticker') ticker: string) {
    const symbol = ticker ? ticker.toUpperCase() : 'AAPL';
    const data = await this.dashboardService.getMarketOverview(symbol);
    return {
      success: true,
      data: data,
    };
  }
}