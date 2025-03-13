import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Patient } from './patient.entity';

@Injectable()
export class PatientRepository {
  private patientRepository: Repository<Patient>;

  constructor(private readonly datasource: DataSource) {
    this.patientRepository = this.datasource.getRepository(Patient);
  }

  async bulkInsertOrUpdate(
    patients: Patient[],
    batchSize = 5000,
  ): Promise<void> {
    if (patients.length === 0) return;

    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const batchPromises: Promise<any>[] = [];

      for (let i = 0; i < patients.length; i += batchSize) {
        const batch = patients.slice(i, i + batchSize);

        const insertPromise = queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into(Patient)
          .values(batch)
          .orUpdate(
            ['ssn', 'address', 'memo'],
            ['name', 'phone', 'chart_number'],
          )
          .execute();

        batchPromises.push(insertPromise);
      }

      await Promise.all(batchPromises);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();

      throw new InternalServerErrorException(
        '내부 서버에서 문제가 발생했습니다.',
      );
    } finally {
      await queryRunner.release();
    }
  }
}
