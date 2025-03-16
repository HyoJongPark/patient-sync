import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  DataSource,
  InsertResult,
  QueryRunner,
  Repository,
  UpdateResult,
} from 'typeorm';
import { Patient } from '../domain/patient.entity';

const EMPTY_CHART_NUMBER = 'empty';

@Injectable()
export class PatientRepository extends Repository<Patient> {
  constructor(private readonly datasource: DataSource) {
    super(Patient, datasource.createEntityManager());
  }

  async findAllOrderById(limit: number, offset: number) {
    return this.createQueryBuilder('patient')
      .orderBy('id', 'ASC')
      .limit(limit)
      .offset(offset)
      .getMany();
  }

  /**
   * 환자 데이터를 일괄 처리하는 메서드
   */
  async bulkUpsertPatients(
    patients: Patient[],
    uniqueMap: Map<string, Patient>,
    batchSize = 5000,
  ): Promise<InsertResult[]> {
    if (patients.length === 0) return [];

    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const duplicatePatients = await this.findExistingPatients(
        queryRunner,
        patients,
      );
      const duplicatePatientsWithEmptyChart =
        await this.findPatientsWithEmptyChart(queryRunner, patients);

      await this.updateEmptyChartNumbers(
        queryRunner,
        uniqueMap,
        duplicatePatients,
        duplicatePatientsWithEmptyChart,
      );

      const affectedRows = await this.insertOrUpdatePatients(
        queryRunner,
        patients,
        batchSize,
      );
      await queryRunner.commitTransaction();

      return affectedRows;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error(err);
      throw new InternalServerErrorException('환자 정보 일괄 처리 실패');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * (이름, 전화번호, 차트번호) 조합이 이미 존재하는 환자 조회
   */
  private async findExistingPatients(
    queryRunner: QueryRunner,
    patients: Patient[],
  ): Promise<Set<string>> {
    const patientData = patients
      .map(
        (p) =>
          `('${p.name}', '${p.phone}', '${p.chart_number ?? EMPTY_CHART_NUMBER}')`,
      )
      .join(', ');

    const result = await queryRunner.manager
      .createQueryBuilder()
      .select(['id', 'name', 'phone', 'chart_number'])
      .from(Patient, 'patient')
      .where(
        `(patient.name, patient.phone, patient.chart_number) IN (${patientData})`,
      )
      .getRawMany<Patient>();

    return new Set(
      result.map(
        (p) => `${p.name}-${p.phone}-${p.chart_number ?? EMPTY_CHART_NUMBER}`,
      ),
    );
  }

  /**
   * 차트번호가 없는 동일한 (이름, 전화번호) 데이터를 조회
   */
  private async findPatientsWithEmptyChart(
    queryRunner: QueryRunner,
    patients: Patient[],
  ): Promise<Map<string, number>> {
    const patientData = patients
      .map((p) => `('${p.name}', '${p.phone}')`)
      .join(', ');

    const result = await queryRunner.manager
      .createQueryBuilder()
      .select(['id', 'name', 'phone'])
      .from(Patient, 'patient')
      .where('patient.chart_number = :empty', { empty: EMPTY_CHART_NUMBER })
      .andWhere(`(patient.name, patient.phone) IN (${patientData})`)
      .getRawMany<Patient>();

    return new Map(result.map((p) => [`${p.name}-${p.phone}`, p.id]));
  }

  /**
   * 차트번호가 없는 기존 데이터를 업데이트하여 새로운 데이터와 병합
   */
  private async updateEmptyChartNumbers(
    queryRunner: QueryRunner,
    uniquePatients: Map<string, Patient>,
    existingPatientsSet: Set<string>,
    patientsWithEmptyChart: Map<string, number>,
  ): Promise<void> {
    const updateQueries: Promise<UpdateResult>[] = [];

    for (const [key, patient] of Array.from(uniquePatients.entries())) {
      const patientKey = `${patient.name}-${patient.phone}`;

      if (
        !existingPatientsSet.has(key) &&
        patientsWithEmptyChart.has(patientKey)
      ) {
        updateQueries.push(
          queryRunner.manager
            .createQueryBuilder()
            .update(Patient)
            .set(patient)
            .where('id = :id', { id: patientsWithEmptyChart.get(patientKey) })
            .execute(),
        );

        patientsWithEmptyChart.delete(patientKey);
      }
    }

    await Promise.all(updateQueries);
  }

  /**
   * 환자 데이터 일괄 삽입 또는 업데이트
   */
  private async insertOrUpdatePatients(
    queryRunner: QueryRunner,
    patients: Patient[],
    batchSize: number,
  ): Promise<InsertResult[]> {
    const insertedResults: Promise<InsertResult>[] = [];

    for (let i = 0; i < patients.length; i += batchSize) {
      const batch = patients.slice(i, i + batchSize);

      const result = queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(Patient)
        .values(batch)
        .orUpdate(['ssn', 'address', 'memo'], ['chart_number', 'name', 'phone'])
        .updateEntity(false)
        .execute();

      insertedResults.push(result);
    }

    return await Promise.all(insertedResults);
  }
}
