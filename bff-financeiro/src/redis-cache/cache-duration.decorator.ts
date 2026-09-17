import { SetMetadata } from '@nestjs/common';
export const CACHE_DURATION_KEY = 'cache_duration_sec';
export const CacheDuration = (seconds: number) => SetMetadata(CACHE_DURATION_KEY, seconds);