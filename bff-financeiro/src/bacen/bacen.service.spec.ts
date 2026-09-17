import { Test, TestingModule } from '@nestjs/testing';
import { BacenService } from './bacen.service';

describe('BacenService', () => {
  let service: BacenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BacenService],
    }).compile();

    service = module.get<BacenService>(BacenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
