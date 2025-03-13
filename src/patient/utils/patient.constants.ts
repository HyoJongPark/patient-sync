import { PatientDTO } from '../patient.dto';

export const fieldMap: { [key: string]: keyof PatientDTO } = {
  차트번호: 'chart_number',
  이름: 'name',
  전화번호: 'phone',
  주민등록번호: 'ssn',
  주소: 'address',
  메모: 'memo',
};
