import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { HttpService } from '@nestjs/axios';
import type { Request } from 'express';
import * as http from 'http';
import * as https from 'https';

@Injectable()
export class ApiClientService {
  private readonly logger = new Logger(ApiClientService.name);
  constructor(
    @Optional() @Inject(REQUEST) private readonly request: Request,
    private readonly httpService: HttpService,
  ) {
    const axiosRef = this.httpService.axiosRef;

    axiosRef.defaults.timeout = 5000;
    axiosRef.defaults.httpAgent = new http.Agent({ keepAlive: true });
    axiosRef.defaults.httpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });

    axiosRef.interceptors.request.use((config: any) => {
      config.metadata = { startTime: process.hrtime() };

      if (this.request && this.request.session) {
        const session = this.request.session as Record<string, any>;
        if (session && session.accessToken) {
          config.headers.Authorization = `Bearer ${session.accessToken}`;
        }
      }

      this.logger.debug({
        msg: 'Enviando requisição downstream',
        method: config.method?.toUpperCase(),
        url: `${config.baseURL || ''}${config.url}`,
      });

      return config;
    });


    axiosRef.interceptors.response.use(
      (response: any) => {
        const diff = process.hrtime(response.config.metadata.startTime);
        const durationMs = (diff[0] * 1e3 + diff[1] / 1e6).toFixed(2);
        const route = response.config.customRoute || response.config.url || '/';
        const serviceName = response.config.serviceName || 'ExternalService';

        this.logger.log({
          msg: 'Requisição downstream concluída com sucesso',
          service: serviceName,
          method: response.config.method?.toUpperCase(),
          route: `${response.config.baseURL || ''}${route}`,
          statusCode: response.status,
          durationMs: `${durationMs}ms`,
        });

        return response;
      },

      (error: any) => {
        let durationMs = 0;
        if (error.config && error.config.metadata) {
          const diff = process.hrtime(error.config.metadata.startTime);
          durationMs = Number((diff[0] * 1e3 + diff[1] / 1e6).toFixed(2));
        }

        const status = error.response ? error.response.status : error.code || 'NETWORK_ERROR';
        const route = error.config?.customRoute || error.config?.url || '/';
        const serviceName = error.config?.serviceName || 'ExternalService';
        const method = error.config?.method?.toUpperCase() || 'UNKNOWN';

        this.logger.error({
          msg: 'Falha na requisição downstream',
          service: serviceName,
          method,
          route: `${error.config?.baseURL || ''}${route}`,
          statusCode: status,
          durationMs: `${durationMs}ms`,
          error: error.response?.data || error.message,
        });

        return Promise.reject(error);
      }
    );
  }

  get(url: string, config?: any) {
    return this.httpService.axiosRef.get(url, config);
  }

  post(url: string, data?: any, config?: any) {
    return this.httpService.axiosRef.post(url, data, config);
  }

  put(url: string, data?: any, config?: any) {
    return this.httpService.axiosRef.put(url, data, config);
  }

  delete(url: string, config?: any) {
    return this.httpService.axiosRef.delete(url, config);
  }
}