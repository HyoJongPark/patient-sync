import { Patient } from 'src/patient/domain/patient.entity';

export class PatientSearchResponse {
  name: string;

  phone: string;

  ssn: string;

  chart_number?: string;

  address?: string;

  memo?: string;

  constructor(patient: Patient) {
    this.name = patient.name;
    this.phone = patient.phone;
    this.ssn = patient.ssn;
    this.chart_number = patient.chart_number;
    this.address = patient.address;
    this.memo = patient.memo;
  }
}
