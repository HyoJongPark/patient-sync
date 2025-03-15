import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, QueryRunner } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientRepository } from '../repository/patient.repository';
import { Patient } from '../domain/patient.entity';
import { typeOrmTestConfig } from '../../config/typeorm.config';
import { TransactionalTestContext } from 'typeorm-transactional-tests';

describe('PatientRepository (Integration Tests)', () => {
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

  // ✅ 중복 데이터 검증 테스트
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
      await repository.bulkInsertOrUpdate(patients, uniqueMap);

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
      await repository.bulkInsertOrUpdate(patients, uniqueMap);

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
      await repository.bulkInsertOrUpdate(patients, uniqueMap);

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
      await repository.bulkInsertOrUpdate([updatedPatient], uniqueMap);

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
      await repository.bulkInsertOrUpdate([updatedPatient], uniqueMap);

      //then
      const result = await repository.findBy({
        name: '김철수',
        phone: '01012345678',
      });
      console.log(result);

      expect(result.length).toBe(1);
      expect(result[0].chart_number).toBe(updatedPatient.chart_number);
    });
  });
});
