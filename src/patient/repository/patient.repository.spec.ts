import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientRepository } from '../repository/patient.repository';
import { Patient } from '../domain/patient.entity';
import { typeOrmTestConfig } from '../../config/typeorm.config';
import { TransactionalTestContext } from 'typeorm-transactional-tests';

let repository: PatientRepository;
let dataSource: DataSource;
let transactionalContext: TransactionalTestContext;

beforeAll(async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot(typeOrmTestConfig),
      TypeOrmModule.forFeature([Patient]),
    ],
    providers: [PatientRepository],
  }).compile();

  repository = module.get<PatientRepository>(PatientRepository);
  dataSource = module.get<DataSource>(DataSource);
});

beforeEach(async () => {
  transactionalContext = new TransactionalTestContext(dataSource);
  await transactionalContext.start();
});

afterEach(async () => {
  await transactionalContext.finish();
});

afterAll(async () => {
  await dataSource.destroy();
});

describe('페이징 테스트', () => {
  beforeEach(async () => {
    // 테스트용 환자 데이터 삽입
    const patients = Array.from({ length: 100 }).map((_, i) =>
      repository.create({
        name: `환자${i + 1}`,
        phone: `0101234${String(i).padStart(4, '0')}`,
        chart_number: `100${i + 1}`,
        ssn: `990101-${String(i).padStart(6, '*')}`,
      }),
    );

    await repository.save(patients);
  });

  it('조회 가능 데이터가 충분하다면 limit 만큼의 데이터 반환', async () => {
    // given-when
    const limit = 20;
    const offset = 0;
    const result = await repository.findAllOrderById(limit, offset);

    // then
    expect(result.length).toBe(limit);
    expect(result[0].name).toBe('환자1');
  });

  it('offset이후 데이터 조회 시 offset + 1 부터의 데이터 반환', async () => {
    // given-when
    const limit = 20;
    const offset = 50;
    const result = await repository.findAllOrderById(limit, offset);

    // then
    expect(result.length).toBe(limit);
    expect(result[0].name).toBe(`환자${50 + 1}`);
  });

  it('조회 가능 데이터가 충분하지 않다면 빈 배열 반환', async () => {
    // given-when
    const limit = 20;
    const offset = 500;
    const result = await repository.findAllOrderById(limit, offset);

    // then
    expect(result.length).toBe(0);
  });
});
