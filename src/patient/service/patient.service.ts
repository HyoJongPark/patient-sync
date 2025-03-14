import { Injectable } from '@nestjs/common';
import { Patient } from '../domain/patient.entity';
import { PatientExcelRequest } from '../controller/request/patient.request';
import { PatientRepository } from '../repository/patient.repository';
import { PatientExcelResponse } from '../controller/response/patient.response';

@Injectable()
export class PatientService {
  constructor(private readonly patientRepository: PatientRepository) {}

  async upload(dto: PatientExcelRequest[]): Promise<PatientExcelResponse> {
    const patients: Patient[] = [];
    const uniqueMap = new Map<string, Patient>();

    for (const data of dto) {
      // excel 파일 내 중복 데이터 제거
      const key = `${data.name}-${data.phone}-${data.chart_number || 'empty'}`;
      if (uniqueMap.has(key)) {
        continue;
      }

      //transform to entity
      const patient = data.toEntity();
      patients.push(patient);
      uniqueMap.set(key, patient);
    }

    const insertedResults = await this.patientRepository.bulkInsertOrUpdate(
      patients,
      uniqueMap,
    );
    let count = 0;
    for (const result of insertedResults) {
      count += result.identifiers.length;
    }
    return new PatientExcelResponse(count);
  }
}
