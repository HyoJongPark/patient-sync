import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientRepository } from '../repository/patient.repository';
import { Patient } from '../domain/patient.entity';
import { typeOrmTestConfig } from '../../config/typeorm.config';
import { TransactionalTestContext } from 'typeorm-transactional-tests';
import { PatientService } from './patient.service';
import { PatientUploadRequest } from '../controller/request/patientUpload.request';

let patientRepository: PatientRepository;
let patientService: PatientService;
let dataSource: DataSource;
let transactionalContext: TransactionalTestContext;

const createPatientDTO = (data: Partial<PatientUploadRequest>) =>
  Object.assign(new PatientUploadRequest(), data);

beforeAll(async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot(typeOrmTestConfig),
      TypeOrmModule.forFeature([Patient]),
    ],
    providers: [PatientRepository, PatientService],
  }).compile();

  patientRepository = module.get<PatientRepository>(PatientRepository);
  patientService = module.get<PatientService>(PatientService);
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

// 중복 데이터 검증 테스트
describe('(이름, 주민번호, 차트번호)-UK 기준 중복 검사 테스트', () => {
  it('(이름, 전화번호)가 동일, 차트번호가 다른 경우 insert', async () => {
    //given - 차트번호만 다른 2개의 데이터
    const patients = [
      createPatientDTO({
        name: '김철수',
        phone: '01012345678',
        chart_number: '1001',
        ssn: '990101-1******',
      }),
      createPatientDTO({
        name: '김철수',
        phone: '01012345678',
        chart_number: '2002',
        ssn: '990101-1******',
      }),
    ];

    //when
    await patientService.upload(patients);

    //then
    const count = await patientRepository.count();
    expect(count).toBe(2);
  });

  it('(이름, 차트번호)가 동일, 전화번호가 다른 경우 insert', async () => {
    //given - 전화번호만 다른 2개의 데이터
    const patients = [
      createPatientDTO({
        name: '김철수',
        phone: '01012345678',
        chart_number: '1001',
        ssn: '990101-1******',
      }),
      createPatientDTO({
        name: '김철수',
        phone: '01087654321',
        chart_number: '1001',
        ssn: '990101-1******',
      }),
    ];

    //when
    await patientService.upload(patients);

    //then
    const count = await patientRepository.count();
    expect(count).toBe(2);
  });

  it('(전화번호, 차트번호)가 동일, 이름이 다른 경우 insert', async () => {
    //given - 이름만 다른 2개의 데이터
    const patients = [
      createPatientDTO({
        name: '김민수',
        phone: '01012345678',
        chart_number: '1001',
        ssn: '990101-1******',
      }),
      createPatientDTO({
        name: '김철수',
        phone: '01012345678',
        chart_number: '1001',
        ssn: '990101-1******',
      }),
    ];

    //when
    await patientService.upload(patients);

    //then
    const count = await patientRepository.count();
    expect(count).toBe(2);
  });

  it('(이름, 전화번호, 차트번호) 모두 동일하면 update', async () => {
    //given
    const patient = patientRepository.create({
      name: '김철수',
      phone: '01012345678',
      chart_number: '1001',
      ssn: '990101-1******',
      address: '서울 강남구',
    });
    const updatedPatient = createPatientDTO({
      name: '김철수',
      phone: '01012345678',
      chart_number: '1001',
      ssn: '990101-1******',
      address: '서울 서초구',
    });

    await patientRepository.save(patient);

    // when
    await patientService.upload([updatedPatient]);

    // then
    const result = await patientRepository.findBy({
      name: updatedPatient.name,
      phone: updatedPatient.phone,
      chart_number: updatedPatient.chart_number,
    });

    expect(result.length).toBe(1);
    expect(result[0].address).toBe(updatedPatient.address);
  });

  it('(이름, 전화번호, 차트번호)가 동일한 데이터가 없고, (이름, 전화번호, null)인 데이터가 있는 경우 해당 데이터 update', async () => {
    //given
    const patientWithoutChart = patientRepository.create({
      name: '김철수',
      phone: '01012345678',
      ssn: '990101-1******', // 차트번호 없음
    });
    const updatedPatient = createPatientDTO({
      name: '김철수',
      phone: '01012345678',
      chart_number: '1001',
      ssn: '990101-1******',
      address: '서울 서초구',
    });

    await patientRepository.save(patientWithoutChart);

    //when
    await patientService.upload([updatedPatient]);

    //then
    const result = await patientRepository.findBy({
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
  const emptyPatient = patientRepository.create({
    name: '김철수',
    phone: '01012345678',
    ssn: '990101-1******',
  });
  const patients = [
    createPatientDTO({
      name: '김철수',
      phone: '01012345678',
      chart_number: '1000',
      ssn: '990101-1******',
    }),
    createPatientDTO({
      name: '김철수',
      phone: '01012345678',
      chart_number: '2000',
      ssn: '990101-1******',
      address: '서울 서초구',
    }),
  ];

  await patientRepository.save(emptyPatient);

  //when
  await patientService.upload(patients);

  //then
  const emptyChartNumberCount = await patientRepository.count({
    where: { chart_number: 'empty' },
  });
  const result = await patientRepository.find({
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
    patientRepository.create({
      name: '김철수',
      phone: '01012345678',
      ssn: '990101-1******',
    }),
    patientRepository.create({
      name: '김철수',
      phone: '01012345678',
      chart_number: '1000',
      ssn: '990101-1******',
      address: '서울 서초구',
    }),
  ];
  const patient = createPatientDTO({
    name: '김철수',
    phone: '01012345678',
    chart_number: '1000',
    ssn: '990101-1******',
    address: '서울 동작구',
  });

  await patientRepository.save(patients);

  //when
  await patientService.upload([patient]);

  //then
  const result = await patientRepository.find({
    where: { name: patients[0].name, phone: patients[0].phone },
    order: { id: 'ASC' },
  });

  expect(result.length).toBe(2);
  expect(result[0].chart_number).toBe(patients[0].chart_number);
  expect(result[1].chart_number).toBe(patient.chart_number);
  expect(result[1].address).toBe(patient.address);
});
