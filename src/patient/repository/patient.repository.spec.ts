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

describe('페이징 조회', () => {
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

// 중복 데이터 검증 테스트
describe('(이름, 주민번호, 차트번호)-UK 기준 중복 검사 테스트', () => {
  it('(이름, 전화번호)가 동일, 차트번호가 다른 경우 insert', async () => {
    //given - 차트번호만 다른 2개의 데이터
    const patients = [
      repository.create({
        name: '김철수',
        phone: '01012345678',
        chart_number: '1001',
        ssn: '990101-1******',
      }),
      repository.create({
        name: '김철수',
        phone: '01012345678',
        chart_number: '2002',
        ssn: '990101-1******',
      }),
    ];

    const uniqueMap = new Map<string, Patient>();
    for (const data of patients) {
      const key = `${data.name}-${data.phone}-${data.chart_number || 'empty'}`;
      uniqueMap.set(key, data);
    }

    //when
    await repository.bulkUpsertPatients(patients, uniqueMap);

    //then
    const count = await repository.count();
    expect(count).toBe(2);
  });

  it('(이름, 차트번호)가 동일, 전화번호가 다른 경우 insert', async () => {
    //given - 전화번호만 다른 2개의 데이터
    const patients = [
      repository.create({
        name: '김철수',
        phone: '01012345678',
        chart_number: '1001',
        ssn: '990101-1******',
      }),
      repository.create({
        name: '김철수',
        phone: '01087654321',
        chart_number: '1001',
        ssn: '990101-1******',
      }),
    ];

    const uniqueMap = new Map<string, Patient>();
    for (const data of patients) {
      const key = `${data.name}-${data.phone}-${data.chart_number || 'empty'}`;
      uniqueMap.set(key, data);
    }

    //when
    await repository.bulkUpsertPatients(patients, uniqueMap);

    //then
    const count = await repository.count();
    expect(count).toBe(2);
  });

  it('(전화번호, 차트번호)가 동일, 이름이 다른 경우 insert', async () => {
    //given - 이름만 다른 2개의 데이터
    const patients = [
      repository.create({
        name: '김민수',
        phone: '01012345678',
        chart_number: '1001',
        ssn: '990101-1******',
      }),
      repository.create({
        name: '김철수',
        phone: '01012345678',
        chart_number: '1001',
        ssn: '990101-1******',
      }),
    ];

    const uniqueMap = new Map<string, Patient>();
    for (const data of patients) {
      const key = `${data.name}-${data.phone}-${data.chart_number || 'empty'}`;
      uniqueMap.set(key, data);
    }

    //when
    await repository.bulkUpsertPatients(patients, uniqueMap);

    //then
    const count = await repository.count();
    expect(count).toBe(2);
  });

  it('(이름, 전화번호, 차트번호) 모두 동일하면 update', async () => {
    //given
    const patient = repository.create({
      name: '김철수',
      phone: '01012345678',
      chart_number: '1001',
      ssn: '990101-1******',
      address: '서울 강남구',
    });
    const updatedPatient = repository.create({
      name: '김철수',
      phone: '01012345678',
      chart_number: '1001',
      ssn: '990101-1******',
      address: '서울 서초구',
    });

    await repository.save(patient);
    const uniqueMap = new Map<string, Patient>();
    uniqueMap.set(
      `${updatedPatient.name}-${updatedPatient.phone}-${updatedPatient.chart_number || 'empty'}`,
      updatedPatient,
    );

    // when
    await repository.bulkUpsertPatients([updatedPatient], uniqueMap);

    // then
    const result = await repository.findBy({
      name: updatedPatient.name,
      phone: updatedPatient.phone,
      chart_number: updatedPatient.chart_number,
    });

    expect(result.length).toBe(1);
    expect(result[0].address).toBe(updatedPatient.address);
  });

  it('(이름, 전화번호, 차트번호)가 동일한 데이터가 없고, (이름, 전화번호, null)인 데이터가 있는 경우 해당 데이터 update', async () => {
    //given
    const patientWithoutChart = repository.create({
      name: '김철수',
      phone: '01012345678',
      ssn: '990101-1******', // 차트번호 없음
    });
    const updatedPatient = repository.create({
      name: '김철수',
      phone: '01012345678',
      chart_number: '1001',
      ssn: '990101-1******',
      address: '서울 서초구',
    });

    await repository.save(patientWithoutChart);
    const uniqueMap = new Map<string, Patient>();
    uniqueMap.set(
      `${updatedPatient.name}-${updatedPatient.phone}-${updatedPatient.chart_number || 'empty'}`,
      updatedPatient,
    );

    //when
    await repository.bulkUpsertPatients([updatedPatient], uniqueMap);

    //then
    const result = await repository.findBy({
      name: '김철수',
      phone: '01012345678',
    });

    expect(result.length).toBe(1);
    expect(result[0].chart_number).toBe(updatedPatient.chart_number);
    expect(result[0].address).toBe(updatedPatient.address);
  });
});

it('(이름, 전화번호)가 동일한 2개 이상의 데이터가 존재, DB에 (이름, 전화번호, null)인 데이터가 있는 경우 앞의 데이터는 update, 뒤의 데이터는 insert', async () => {
  //given
  const emptyPatient = repository.create({
    name: '김철수',
    phone: '01012345678',
    ssn: '990101-1******',
  });
  const patients = [
    repository.create({
      name: '김철수',
      phone: '01012345678',
      chart_number: '1000',
      ssn: '990101-1******',
    }),
    repository.create({
      name: '김철수',
      phone: '01012345678',
      chart_number: '2000',
      ssn: '990101-1******',
      address: '서울 서초구',
    }),
  ];

  await repository.save(emptyPatient);
  const uniqueMap = new Map<string, Patient>();
  for (const data of patients) {
    const key = `${data.name}-${data.phone}-${data.chart_number || 'empty'}`;
    uniqueMap.set(key, data);
  }

  //when
  await repository.bulkUpsertPatients(patients, uniqueMap);

  //then
  const emptyChartNumberCount = await repository.count({
    where: { chart_number: 'empty' },
  });
  const result = await repository.find({
    where: { name: patients[0].name, phone: patients[0].phone },
    order: { id: 'ASC' },
  });

  expect(emptyChartNumberCount).toBe(0);
  expect(result[0].chart_number).toBe(patients[0].chart_number);
  expect(result[1].chart_number).toBe(patients[1].chart_number);
});

it('DB에 (이름, 전화번호, 차트번호) 동일 데이터와 (이름, 전화번호, null)인 데이터 모두 존재할 때 우선적으로 (이름, 전화번호, 차트번호) 데이터 update', async () => {
  //given
  const patients = [
    repository.create({
      name: '김철수',
      phone: '01012345678',
      ssn: '990101-1******',
    }),
    repository.create({
      name: '김철수',
      phone: '01012345678',
      chart_number: '1000',
      ssn: '990101-1******',
      address: '서울 서초구',
    }),
  ];
  const patient = repository.create({
    name: '김철수',
    phone: '01012345678',
    chart_number: '1000',
    ssn: '990101-1******',
    address: '서울 동작구',
  });

  await repository.save(patients);

  const uniqueMap = new Map<string, Patient>();
  const key = `${patient.name}-${patient.phone}-${patient.chart_number || 'empty'}`;
  uniqueMap.set(key, patient);

  //when
  await repository.bulkUpsertPatients([patient], uniqueMap);

  //then
  const result = await repository.find({
    where: { name: patients[0].name, phone: patients[0].phone },
    order: { id: 'ASC' },
  });

  expect(result.length).toBe(2);
  expect(result[0].chart_number).toBe(patients[0].chart_number);
  expect(result[1].chart_number).toBe(patient.chart_number);
  expect(result[1].address).toBe(patient.address);
});
