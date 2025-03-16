import { Injectable } from '@nestjs/common';
import { Patient } from '../domain/patient.entity';
import { PatientUploadRequest } from '../controller/request/patientUpload.request';
import { PatientRepository } from '../repository/patient.repository';
import { PatientUploadResponse } from '../controller/response/patientUpload.response';
import { PatientSearchResponse } from '../controller/response/patientSearch.response';
import { Page } from 'src/utils/page.response';
import { PageRequest } from 'src/utils/page.request';

@Injectable()
export class PatientService {
  constructor(private readonly patientRepository: PatientRepository) {}

  async getPatients(param: PageRequest) {
    const result = await this.patientRepository.findAllOrderById(
      param.getLimit(),
      param.getOffset(),
    );

    return new Page<PatientSearchResponse>(
      param.getLimit(),
      param.getPageNo(),
      result.map((r) => new PatientSearchResponse(r)),
    );
  }

  async upload(dto: PatientUploadRequest[]): Promise<PatientUploadResponse> {
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
      count += result.raw['affectedRows'];
    }
    return new PatientUploadResponse(count);
  }
}
