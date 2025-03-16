import { Test, TestingModule } from '@nestjs/testing';
import { PatientService } from './patient.service';
import { PatientRepository } from '../repository/patient.repository';
import { PatientUploadRequest } from '../controller/request/patientUpload.request';
import { DataSource } from 'typeorm';

let patientService: PatientService;
let patientRepository: PatientRepository;

beforeEach(async () => {
  const mockDataSource = {
    createEntityManager: jest.fn(),
    createQueryRunner: jest.fn().mockReturnValue({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    }),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      PatientService,
      { provide: DataSource, useValue: mockDataSource },
      {
        provide: PatientRepository,
        useValue: {
          findAllOrderById: jest.fn(),
          findExistingPatients: jest.fn(),
          findPatientsWithEmptyChart: jest.fn(),
          updatePatientsWithEmptyChart: jest
            .fn()
            .mockResolvedValue((qr, patients) => {
              return [
                {
                  raw: {
                    affectedRows: patients.length,
                  },
                },
              ];
            }),
          insertOrUpdatePatients: jest
            .fn()
            .mockImplementation((qr, patients) => {
              return [
                {
                  raw: {
                    affectedRows: patients.length,
                  },
                },
              ];
            }),
        },
      },
    ],
  }).compile();

  patientService = module.get<PatientService>(PatientService);
  patientRepository = module.get<PatientRepository>(PatientRepository);
});

describe('excel파일 데이터 중복 제거 테스트', () => {
  const createPatientDTO = (data: Partial<PatientUploadRequest>) =>
    Object.assign(new PatientUploadRequest(), data);

  beforeEach(() => {
    (patientRepository.findExistingPatients as jest.Mock).mockResolvedValue([]);
    (
      patientRepository.findPatientsWithEmptyChart as jest.Mock
    ).mockResolvedValue([]);
  });

  it('(이름, 번호, 차트번호)가 모두 일치하는 데이터는 제외', async () => {
    //given
    const duplicateData = {
      name: 'John Doe',
      phone: '123-4567',
      chart_number: '001',
    };
    const mockData: PatientUploadRequest[] = [
      createPatientDTO(duplicateData),
      createPatientDTO(duplicateData),
      createPatientDTO(duplicateData),
    ];

    //when
    const result = await patientService.upload(mockData);

    //then
    expect(result.success).toBe(1);
  });

  it('(이름, 번호, 차트번호) - (이름, 번호, undefined)인 데이터는 별개의 데이터', async () => {
    //given
    const mockData: PatientUploadRequest[] = [
      createPatientDTO({
        name: 'John Doe',
        phone: '123-4567',
        chart_number: '001',
      }),
      createPatientDTO({
        name: 'Jane Doe',
        phone: '987-6543',
        chart_number: '002',
      }),
      createPatientDTO({
        name: 'John Doe',
        phone: '123-4567',
        chart_number: undefined,
      }),
    ];

    //when
    const result = await patientService.upload(mockData);

    //then
    expect(result.success).toBe(3);
  });

  it('중복 데이터가 없다면 제외하지 않는다.', async () => {
    //given
    const mockData: PatientUploadRequest[] = [
      createPatientDTO({
        name: 'John Doe',
        phone: '123-4567',
        chart_number: '001',
      }),
      createPatientDTO({
        name: 'Jane Doe',
        phone: '987-6543',
        chart_number: '002',
      }),
      createPatientDTO({
        name: 'John Doe',
        phone: '123-4567',
        chart_number: '003',
      }),
    ];

    //when
    const result = await patientService.upload(mockData);

    //then
    expect(result.success).toBe(3);
  });

  it('빈 배열 데이터의 경우 0 반환', async () => {
    //given
    const emptyArray = [];

    // when
    const result = await patientService.upload(emptyArray);

    //then
    expect(result.success).toBe(0);
  });
});

describe('UK 기반 데이터 검증 테스트', () => {
  it('DB에 uk 중복 데이터, (이름, 번호)가 중복이면서 차트번호가 empty인 데이터가 있을 때 uk 중복 데이터 update', async () => {});
  it('DB에 (이름, 번호)가 중복이면서 차트번호가 empty인 데이터만 있을 때 해당 데이터 update', async () => {});
  it('DB에 uk 중복 혹은 (이름, 번호)가 중복이면서 차트번호가 empty인 데이터 모두 없을 때는 insert', async () => {});
});
