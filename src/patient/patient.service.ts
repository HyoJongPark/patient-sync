import { Injectable } from '@nestjs/common';
import { Patient } from './patient.entity';
import { PatientExcelRequest } from './patient.request';
import { PatientRepository } from './patient.repository';
import { PatientExcelResponse } from './patient.response';

@Injectable()
export class PatientService {
  constructor(private readonly patientRepository: PatientRepository) {}

  async upload(dto: PatientExcelRequest[]): Promise<PatientExcelResponse> {
    const patients: Patient[] = [];
    const uniqueMap = new Map<string, Patient>();

    for (const data of dto) {
      // excel 파일 내 중복 데이터 제거
      const key = `${data.name}-${data.phone}-${data.chart_number || ''}`;
      if (uniqueMap.has(key)) {
        continue;
      }

      //transform to entity
      const patient = data.toEntity();
      patients.push(patient);
      uniqueMap.set(key, patient);
    }

    const result = await this.patientRepository.bulkInsertOrUpdate(
      patients,
      uniqueMap,
    );

    let count = 0;
    for (const r of result) {
      count += r.identifiers.length;
    }
    return new PatientExcelResponse(count);
  }
}
