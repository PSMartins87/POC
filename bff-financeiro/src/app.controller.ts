import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Get('health')
  getHealthCheck() {
    return {
      status: 'up',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };
  }
}