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

afterEach(async () => {
  await transactionalContext.finish();
});

afterAll(async () => {
  await dataSource.destroy();
});

describe('findAllOrderById 테스트', () => {
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

describe('findExistingPatients 테스트', () => {
  it('uk가 모두 일치하는 데이터 전체 조회', async () => {
    //given
    const target = repository.create({
      name: `환자3`,
      phone: `01012340002`,
      chart_number: `1003`,
    });

    //when
    const result = await repository.findExistingPatients(
      dataSource.createQueryRunner(),
      [target],
    );

    //then
    expect(result.length).toBe(1);
  });

  it('uk가 모두 일치하는 데이터가 존재하지 않으면 빈 배열 반환', async () => {
    //given
    const target = repository.create({
      name: `환자3`,
      phone: `01012340002`,
      chart_number: `empty`,
    });

    //when
    const result = await repository.findExistingPatients(
      dataSource.createQueryRunner(),
      [target],
    );

    //then
    expect(result.length).toBe(0);
  });
});

describe('findPatientsWithEmptyChart 테스트', () => {
  beforeEach(async () => {
    // 테스트용 환자 데이터 삽입
    const patients = Array.from({ length: 100 }).map((_, i) =>
      repository.create({
        name: `환자${i + 1}`,
        phone: `0101234${String(i).padStart(4, '0')}`,
        chart_number: 'empty',
        ssn: `990101-${String(i).padStart(6, '*')}`,
      }),
    );

    await repository.save(patients);
  });

  it('(name, phone)이 일치하면서 chart가 empty인 데이터 전체 조회', async () => {
    //given
    const target = repository.create({
      name: `환자3`,
      phone: `01012340002`,
    });

    //when
    const result = await repository.findPatientsWithEmptyChart(
      dataSource.createQueryRunner(),
      [target],
    );
    const findData = await repository.findOneBy({ id: result[0].id });

    //then
    expect(result.length).toBe(1);
    expect(result[0].name).toBe(target.name);
    expect(result[0].phone).toBe(target.phone);
    expect(findData?.chart_number).toBe('empty');
  });

  it('(name, phone)이 일치하면서 chart가 empty이 인 데이터가 없다면 빈 배열 반환', async () => {
    //given
    const target = repository.create({
      name: `환자00`,
      phone: `01012340002`,
    });

    //when
    const result = await repository.findPatientsWithEmptyChart(
      dataSource.createQueryRunner(),
      [target],
    );

    //then
    expect(result.length).toBe(0);
  });
});

describe('insertOrUpdatePatients 테스트', () => {
  it('uk 중복 데이터가 존재 시 중복 데이터 update', async () => {
    //given
    const target = repository.create({
      name: `환자3`,
      phone: `01012340002`,
      chart_number: `1003`,
      address: 'updateAddress',
      ssn: 'updateSsn',
    });

    //when
    const beforeInsertCount = await repository.countBy({
      name: target.name,
      phone: target.phone,
      chart_number: target.chart_number,
    });
    await repository.insertOrUpdatePatients(dataSource.createQueryRunner(), [
      target,
    ]);
    const result = await repository.findBy({
      name: target.name,
      phone: target.phone,
      chart_number: target.chart_number,
    });

    //then
    expect(beforeInsertCount).toBe(1);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe(target.name);
    expect(result[0].phone).toBe(target.phone);
    expect(result[0].chart_number).toBe(target.chart_number);
    expect(result[0].ssn).toBe(target.ssn);
    expect(result[0].address).toBe(target.address);
  });

  it('uk 중복 데이터가 존재하지 않으면 insert', async () => {
    //given
    const target = repository.create({
      name: `새환자`,
      phone: `01012340002`,
      chart_number: `1003`,
      address: 'updateAddress',
      ssn: 'updateSsn',
    });

    //when
    const beforeInsertCount = await repository.countBy({
      name: target.name,
      phone: target.phone,
      chart_number: target.chart_number,
    });
    await repository.insertOrUpdatePatients(dataSource.createQueryRunner(), [
      target,
    ]);
    const result = await repository.findBy({
      name: target.name,
      phone: target.phone,
      chart_number: target.chart_number,
    });

    //then
    expect(beforeInsertCount).toBe(0);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe(target.name);
    expect(result[0].phone).toBe(target.phone);
    expect(result[0].chart_number).toBe(target.chart_number);
    expect(result[0].ssn).toBe(target.ssn);
    expect(result[0].address).toBe(target.address);
  });
});
