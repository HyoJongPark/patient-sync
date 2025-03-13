import { Injectable } from '@nestjs/common';
import { Patient } from './patient.entity';
import { PatientDTO } from './patient.dto';
import { ExcelFileParser } from './utils/excel.parser';
import { ValidationError, validate } from 'class-validator';
import { PatientRepository } from './patient.repository';

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
  constructor(private readonly patientRepository: PatientRepository) {}

  async upload(buffer: Buffer) {
    const patientJson = new ExcelFileParser<PatientDTO>(fieldMap).parse(buffer);

    const patients: Patient[] = [];
    for (const row of patientJson) {
      //validate
      const dto = Object.assign(new PatientDTO(), row);
      const errors: ValidationError[] = await validate(dto);
      if (errors.length > 0) {
        console.warn(`유효하지 않은 데이터: ${JSON.stringify(errors)}`);
        continue;
      }

      //transform to entity
      const patient = dto.toEntity(dto);
      patients.push(patient);
    }

    await this.patientRepository.bulkInsertOrUpdate(patients);

    return patients.length;
  }
}
