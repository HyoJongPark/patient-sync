import { Injectable } from '@nestjs/common';
import { Patient } from './patient.entity';
import { PatientDTO } from './patient.dto';
import { PatientRepository } from './patient.repository';

@Injectable()
export class PatientService {
  constructor(private readonly patientRepository: PatientRepository) {}

  async upload(dto: PatientDTO[]) {
    const patients: Patient[] = [];
    const uniqueMap = new Map<string, Patient>();

    for (const data of dto) {
      // excel 파일 내 중복 데이터 제거
      const key = `${data.name}-${data.phone}-${data.chart_number || ''}`;
      if (uniqueMap.has(key)) {
        continue;
      }

      //transform to entity
      const patient = data.toEntity(data);
      patients.push(patient);
      uniqueMap.set(key, patient);
    }

    await this.patientRepository.bulkInsertOrUpdate(patients, uniqueMap);

    return patients.length;
  }
}
