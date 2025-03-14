import { Patient } from './patient.entity';

describe('주민등록 번호 마스킹 테스트', () => {
  it('앞 자리만 존재할 경우 xxxxxx-0*같은 형태로 마스킹', () => {
    //given - when
    const ssn = '910101';
    const patient = Patient.of(
      '001',
      'John Doe',
      '010-1234-5678',
      ssn,
      'Some Address',
      'Some Memo',
    );

    //then
    expect(patient.ssn).toBe(ssn + '-0******');
  });

  it('모든 주민번호 입력 시 뒷 7자리 마스킹', () => {
    //given - when
    const ssn = '910101-1000000';
    const patient = Patient.of(
      '001',
      'John Doe',
      '010-1234-5678',
      ssn,
      'Some Address',
      'Some Memo',
    );

    //then
    expect(patient.ssn).toBe(ssn.substring(0, 8) + '******');
  });
});

describe('휴대폰번호 하이픈 제거 테스트', () => {
  it('하이픈 존재하는 번호 입력 시 하이픈 제거 후 반환', () => {
    const patient = Patient.of(
      '001',
      'John Doe',
      '010-1234-5678',
      '910101-1234567',
      'Some Address',
      'Some Memo',
    );
    expect(patient.phone).toBe('01012345678');
  });

  it('이미 하이픈 제거된 번호 입력 시 동일 데이터 반환', () => {
    const patient = Patient.of(
      '001',
      'John Doe',
      '01012345678',
      '910101-1234567',
      'Some Address',
      'Some Memo',
    );
    expect(patient.phone).toBe('01012345678');
  });
});
