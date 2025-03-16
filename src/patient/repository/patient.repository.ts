import { Injectable } from '@nestjs/common';
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

  /**
   * 환자 데이터를 ID 기준으로 오름차순 정렬하여 조회하는 메서드
   */
  async findAllOrderById(limit: number, offset: number) {
    return this.createQueryBuilder('patient')
      .orderBy('id', 'ASC')
      .limit(limit)
      .offset(offset)
      .getMany();
  }

  /**
   * (이름, 전화번호, 차트번호) 조합이 이미 존재하는 환자를 조회
   */
  async findExistingPatients(
    queryRunner: QueryRunner,
    patients: Patient[],
  ): Promise<Patient[]> {
    const patientData = patients
      .map(
        (p) =>
          `('${p.name}', '${p.phone}', '${p.chart_number ?? EMPTY_CHART_NUMBER}')`,
      )
      .join(', ');

    return queryRunner.manager
      .createQueryBuilder()
      .select(['id', 'name', 'phone', 'chart_number'])
      .from(Patient, 'patient')
      .where(
        `(patient.name, patient.phone, patient.chart_number) IN (${patientData})`,
      )
      .getRawMany<Patient>();
  }

  /**
   * 차트번호가 없는 동일한 (이름, 전화번호) 데이터를 조회
   */
  async findPatientsWithEmptyChart(
    queryRunner: QueryRunner,
    patients: Patient[],
  ): Promise<Patient[]> {
    const patientData = patients
      .map((p) => `('${p.name}', '${p.phone}')`)
      .join(', ');

    return queryRunner.manager
      .createQueryBuilder()
      .select(['id', 'name', 'phone'])
      .from(Patient, 'patient')
      .where('patient.chart_number = :empty', { empty: EMPTY_CHART_NUMBER })
      .andWhere(`(patient.name, patient.phone) IN (${patientData})`)
      .getRawMany<Patient>();
  }

  /**
   * 신규 환자 데이터를 삽입하거나 기존 데이터를 업데이트
   */
  async insertOrUpdatePatients(
    queryRunner: QueryRunner,
    patients: Patient[],
  ): Promise<InsertResult[]> {
    const insertedResults: Promise<InsertResult>[] = [];

    for (let i = 0; i < patients.length; i += 5000) {
      const batch = patients.slice(i, i + 5000);

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

  async updatePatientsWithEmptyChart(
    queryRunner: QueryRunner,
    patientsToUpdate: Patient[],
    patientsWithEmptyChart: Map<string, number>,
  ): Promise<UpdateResult[]> {
    const updateQueries: Promise<UpdateResult>[] = [];

    for (const patient of patientsToUpdate) {
      const key = `${patient.name}-${patient.phone}`;

      updateQueries.push(
        queryRunner.manager
          .createQueryBuilder()
          .update(Patient)
          .set(patient)
          .where('id = :id', { id: patientsWithEmptyChart.get(key) })
          .execute(),
      );
      patientsWithEmptyChart.delete(key);
    }

    return Promise.all(updateQueries);
  }
}
