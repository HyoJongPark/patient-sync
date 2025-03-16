import { Test, TestingModule } from '@nestjs/testing';
import { PatientService } from './patient.service';
import { PatientRepository } from '../repository/patient.repository';
import { PatientUploadRequest } from '../controller/request/patientUpload.request';

describe('PatientService', () => {
  let patientService: PatientService;
  let patientRepository: PatientRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientService,
        {
          provide: PatientRepository,
          useValue: {
            bulkInsertOrUpdate: jest.fn(),
          },
        },
      ],
    }).compile();

    patientService = module.get<PatientService>(PatientService);
    patientRepository = module.get<PatientRepository>(PatientRepository);
  });

  it('should be defined', () => {
    expect(patientService).toBeDefined();
  });

  describe('(이름, 번호, 차트번호)를 기준으로 데이터 중복 제거', () => {
    const createPatientDTO = (data: Partial<PatientUploadRequest>) =>
      Object.assign(new PatientUploadRequest(), data);

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

      (patientRepository.bulkInsertOrUpdate as jest.Mock).mockResolvedValue([
        { raw: { affectedRows: 1 } },
      ]);

      //when
      const result = await patientService.upload(mockData);

      //then
      expect(result.successCount).toBe(1);
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

      (patientRepository.bulkInsertOrUpdate as jest.Mock).mockResolvedValue([
        { raw: { affectedRows: mockData.length } },
      ]);

      //when
      const result = await patientService.upload(mockData);

      //then
      expect(result.successCount).toBe(3);
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

      (patientRepository.bulkInsertOrUpdate as jest.Mock).mockResolvedValue([
        { raw: { affectedRows: mockData.length } },
      ]);

      //when
      const result = await patientService.upload(mockData);

      //then
      expect(result.successCount).toBe(3);
    });

    it('빈 배열 데이터의 경우 0 반환', async () => {
      //given
      const emptyArray = [];
      (patientRepository.bulkInsertOrUpdate as jest.Mock).mockResolvedValue([
        { raw: { affectedRows: emptyArray.length } },
      ]);

      // when
      const result = await patientService.upload(emptyArray);

      //then
      expect(result.successCount).toBe(0);
    });
  });
});
