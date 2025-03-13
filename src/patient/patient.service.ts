import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as xlsx from 'xlsx';
import { Patient } from './patient.entity';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { PatientDTO } from './patient.dto';
import { ExcelFileParser } from './utils/excel.parser';

const fieldMap: { [key: string]: keyof PatientDTO } = {
  차트번호: 'chart_number',
  이름: 'name',
  전화번호: 'phone',
  주민등록번호: 'ssn',
  주소: 'address',
  메모: 'memo',
};

@Injectable()
export class PatientService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async upload(buffer: Buffer) {
    const patientDtos = new ExcelFileParser<PatientDTO>(fieldMap).parse(buffer);

    const patients: Patient[] = [];
    for (const row of patientDtos) {
      const patient = new Patient();
      Object.assign(patient, row);

      if (!this.isValidDataFormat(patient)) {
        continue;
      }

      // translate
      patient.phone = patient.phone.replace(/-/g, '');
      patient.ssn = this.maskSSN(patient.ssn);

      patients.push(patient);
    }

    await this.bulkInsertOrUpdate(patients);

    return patients.length;
  }

  async bulkInsertOrUpdate(
    patients: Patient[],
    batchSize = 5000,
  ): Promise<void> {
    if (patients.length === 0) return;

    const queryRunner = this.entityManager.connection.createQueryRunner();
    await queryRunner.connect();
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
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        '내부 서버에서 문제가 발생했습니다.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  maskSSN(ssn: string): string {
    if (/^\d{6}-\d{7}$/.test(ssn)) {
      return `${ssn.substring(0, 8)}******`;
    }
    if (/^\d{6}$/.test(ssn)) {
      return `${ssn}-0******`;
    }
    return ssn;
  }

  isValidDataFormat(patient: Patient) {
    if (!patient.name || patient.name.length < 1 || patient.name.length > 16) {
      return false;
    }

    if (!/^\d{11}$/.test(patient.phone)) {
      return false;
    }

    if (
      !/^\d{6}$/.test(patient.ssn) && // 990101
      !/^\d{6}-\d{7}$/.test(patient.ssn) // 720226-3701592
    ) {
      return false;
    }

    return true;
  }
}
