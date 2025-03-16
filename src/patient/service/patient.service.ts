import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Patient } from '../domain/patient.entity';
import { PatientUploadRequest } from '../controller/request/patientUpload.request';
import { PatientRepository } from '../repository/patient.repository';
import { PatientUploadResponse } from '../controller/response/patientUpload.response';
import { PatientSearchResponse } from '../controller/response/patientSearch.response';
import { PageResponse } from '../../utils/page.response';
import { PageRequest } from '../../utils/page.request';
import { DataSource, QueryRunner } from 'typeorm';

@Injectable()
export class PatientService {
  constructor(
    private readonly patientRepository: PatientRepository,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 환자 목록을 페이징하여 조회
   */
  async getPatients(param: PageRequest) {
    const result = await this.patientRepository.findAllOrderById(
      param.getLimit(),
      param.getOffset(),
    );

    return new PageResponse<PatientSearchResponse>(
      param.getLimit(),
      param.getPageNo(),
      result.map((r) => new PatientSearchResponse(r)),
    );
  }

  /**
   * 엑셀을 통해 환자 데이터를 업로드
   */
  async upload(dto: PatientUploadRequest[]) {
    const patients = this.removeDuplicatePatients(dto);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 기존 데이터 조회 및 변환 (Set, Map 생성)
      const { existingPatients, existingPatientsWithEmptyChart } =
        await this.prepareUpdateData(queryRunner, patients);

      // 기존 환자 정보 중 chart_number == 'empty'인 데이터 업데이트
      const updateResult = await this.updatePatientsWithEmptyChart(
        queryRunner,
        patients,
        existingPatients,
        existingPatientsWithEmptyChart,
      );

      // 새로운 데이터 삽입 또는 업데이트
      const insertedResults =
        await this.patientRepository.insertOrUpdatePatients(
          queryRunner,
          patients,
        );

      const count = insertedResults.reduce(
        (sum, result) => (sum + result.raw['affectedRows']) as number,
        0,
      );
      await queryRunner.commitTransaction();
      return new PatientUploadResponse(count);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error(err);
      throw new InternalServerErrorException('환자 정보 일괄 처리 실패');
    } finally {
      await queryRunner.release();
    }
  }

  private removeDuplicatePatients(dto: PatientUploadRequest[]): Patient[] {
    const uniquePatients = new Map<string, Patient>();

    for (const data of dto) {
      const key = `${data.name}-${data.phone}-${data.chart_number || 'empty'}`;
      if (uniquePatients.has(key)) continue;

      uniquePatients.set(key, data.toEntity());
    }

    return Array.from(uniquePatients.values());
  }

  private async prepareUpdateData(
    queryRunner: QueryRunner,
    patients: Patient[],
  ) {
    const existingPatients = await this.patientRepository.findExistingPatients(
      queryRunner,
      patients,
    );
    const patientsWithEmptyChart =
      await this.patientRepository.findPatientsWithEmptyChart(
        queryRunner,
        patients,
      );

    return {
      existingPatients: new Set(
        existingPatients.map(
          (p) => `${p.name}-${p.phone}-${p.chart_number ?? 'empty'}`,
        ),
      ),
      existingPatientsWithEmptyChart: new Map(
        patientsWithEmptyChart.map((p) => [`${p.name}-${p.phone}`, p.id]),
      ),
    };
  }

  private async updatePatientsWithEmptyChart(
    queryRunner: QueryRunner,
    patients: Patient[],
    existingPatients: Set<string>,
    existingPatientsWithEmptyChart: Map<string, number>,
  ) {
    const patientsToUpdate = patients.filter(
      (p) =>
        !existingPatients.has(
          `${p.name}-${p.phone}-${p.chart_number ?? 'empty'}`,
        ) && existingPatientsWithEmptyChart.has(`${p.name}-${p.phone}`),
    );

    return this.patientRepository.updatePatientsWithEmptyChart(
      queryRunner,
      patientsToUpdate,
      existingPatientsWithEmptyChart,
    );
  }
}
