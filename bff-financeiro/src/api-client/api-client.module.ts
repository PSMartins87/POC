import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ApiClientService } from './api-client.service';

@Module({
  imports: [HttpModule],
  providers: [ApiClientService],
  exports: [ApiClientService],
})
export class ApiClientModule {}