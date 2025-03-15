import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  DataSource,
  InsertResult,
  QueryRunner,
  Repository,
  UpdateResult,
} from 'typeorm';
import { Patient } from '../domain/patient.entity';

@Injectable()
export class PatientRepository extends Repository<Patient> {
  constructor(private readonly datasource: DataSource) {
    super(Patient, datasource.createEntityManager());
  }

  /**
   * 엑셀 데이터 삽입 함수.
   * 트랜잭션 관리를 통해 중간 과정에서 실패 시 rollback 처리될 수 있도록 하나의 함수에서 전체 과정 핸들링
   */
  async bulkInsertOrUpdate(
    patients: Patient[],
    deduplicatedPatients: Map<string, Patient>,
    batchSize = 5000,
  ): Promise<InsertResult[]> {
    if (patients.length === 0) return [];

    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { existingPatients, existingPatientsWithNullChartNum } =
        await this.getExistingPatients(queryRunner, patients);

      await this.updateNullChartNumbers(
        queryRunner,
        deduplicatedPatients,
        existingPatients,
        existingPatientsWithNullChartNum,
      );

      const insertedResults = await this.batchInsertOrUpdate(
        queryRunner,
        patients,
        batchSize,
      );
      await queryRunner.commitTransaction();

      return insertedResults;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error(err);
      throw new InternalServerErrorException('환자 정보 일괄 처리 실패');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 특수 처리를 위한 데이터 조회
   */
  private async getExistingPatients(
    queryRunner: QueryRunner,
    patients: Patient[],
  ): Promise<{
    existingPatients: Set<string>;
    existingPatientsWithNullChartNum: Map<string, number>;
  }> {
    const existingPatients = await queryRunner.manager
      .createQueryBuilder()
      .select(['id', 'name', 'phone', 'chart_number'])
      .from(Patient, 'patient')
      .where(
        `(patient.name, patient.phone, patient.chart_number) IN (${patients
          .map(
            (p) =>
              `('${p.name}', '${p.phone}', '${p.chart_number ?? 'empty'}')`,
          )
          .join(', ')})`,
      )
      .getMany();

    const patientsWithNullChartData = await queryRunner.manager
      .createQueryBuilder()
      .select(['id', 'name', 'phone'])
      .from(Patient, 'patient')
      .where(`patient.chart_number = 'empty'`)
      .andWhere(
        `(patient.name, patient.phone) IN (${patients
          .map((p) => `('${p.name}', '${p.phone}')`)
          .join(', ')})`,
      )
      .getMany();

    return {
      existingPatients: new Set(
        existingPatients.map(
          (p) => `${p.name}-${p.phone}-${p.chart_number ?? 'empty'}`,
        ),
      ),
      existingPatientsWithNullChartNum: new Map(
        patientsWithNullChartData.map((p) => [`${p.name}-${p.phone}`, p.id]),
      ),
    };
  }

  /**
   * 특수 처리 진행 부분
   * (name, phone, char_number)가 동일한 값이 DB에 없으면서, (name, phone, null) 인 데이터가 존재하면
   * 현재 데이터를 (name, phone, null)인 데이터에 update 후 (name, phone, null)은 자료구조에서 제거
   */
  private async updateNullChartNumbers(
    queryRunner: QueryRunner,
    deduplicatedPatients: Map<string, Patient>,
    existingPatientsSet: Set<string>,
    patientsWithNullChart: Map<string, number>,
  ): Promise<void> {
    const updateQueries: Promise<UpdateResult>[] = [];

    for (const [key, patient] of Array.from(deduplicatedPatients.entries())) {
      if (
        !existingPatientsSet.has(key) &&
        patientsWithNullChart.has(`${patient.name}-${patient.phone}`)
      ) {
        updateQueries.push(
          queryRunner.manager
            .createQueryBuilder()
            .update(Patient)
            .set(patient)
            .where('id = :id', {
              id: patientsWithNullChart.get(`${patient.name}-${patient.phone}`),
            })
            .execute(),
        );

        patientsWithNullChart.delete(`${patient.name}-${patient.phone}`);
      }
    }

    await Promise.all(updateQueries);
  }

  //bulk insert
  private async batchInsertOrUpdate(
    queryRunner: QueryRunner,
    patients: Patient[],
    batchSize: number,
  ): Promise<InsertResult[]> {
    const insertedResults: Promise<InsertResult>[] = [];

    for (let i = 0; i < patients.length; i += batchSize) {
      const batch = patients.slice(i, i + batchSize);

      const insertResult = queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(Patient)
        .values(batch)
        .orUpdate(['ssn', 'address', 'memo'], ['chart_number', 'name', 'phone'])
        .updateEntity(false)
        .execute();

      insertedResults.push(insertResult);
    }
    return await Promise.all(insertedResults);
  }
}
