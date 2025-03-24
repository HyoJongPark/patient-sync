## 1. 프로젝트 개요

이 프로젝트는 **엑셀 파일에 포함된 환자 데이터를 읽어 MySQL 데이터베이스에 저장**하는 백엔드 애플리케이션입니다.

### 주요 기능

- 환자 데이터 업로드 API: 엑셀 파일을 업로드하여 데이터를 저장
- 환자 목록 조회 API: 저장된 데이터를 페이징하여 조회
- 중복 데이터 처리 및 업데이트: 이름, 전화번호, 차트번호를 기준으로 중복 데이터를 식별하고 업데이트 수행
- 대량 데이터 처리 최적화: 5만 건 이상의 데이터를 빠르게 처리하기 위한 Bulk Update

### 기술 스택

- 프레임워크: NestJS
- 언어: TypeScript
- 데이터베이스: MySQL
- ORM: TypeORM
- 배포 환경: Docker (MySQL 포함)
- 테스트 프레임워크: Jest

---

## 2. 설치 및 실행 방법

### 1) 필수 설치 항목

- Node.js (v18 이상 권장)
- Docker & Docker Compose

### 2) 프로젝트 클론 및 환경 변수 설정

```sh
git clone https://github.com/hyojongpark/patient-sync.git
cd patient-sync
```

### 3) 프로젝트 실행 (Docker 활용)

```sh
npm install  # 패키지 설치
docker compose -f docker-compose.yml up -d  # 운영환경 용 MySQL 실행

# 애플리케이션 실행 - localhost:3000
npm run start:dev #npm run start
```

### 4) 테스트 실행

```sh
docker compose -f docker-compose.test.yml up -d  # 운영환경 용 MySQL 실행
npm run test  # 단위 테스트 실행
```

---

## 3. API 문서

> 서버 실행 상태에서는 `localhost:3000/api-docs`로 접속해 Swagger API Docs를 확인 가능합니다.

### 1) 환자 데이터 업로드 API

**[POST] /patient/upload**
<br/>

- 요청 (multipart/form-data)

| 필드 | 타입 | 설명                       |
| ---- | ---- | -------------------------- |
| file | 파일 | 업로드할 엑셀 파일 (.xlsx) |

### 응답 (성공 시)

```json
{
  "success": 10,
  "failed": 10,
  "total": 10,
  "message": "string"
}
```

---

### 2) 환자 목록 조회 API

**[GET] /patient**
<br/>

- 요청 파라미터 (Query String)

| 필드 | 타입 | 설명                     |
| ---- | ---- | ------------------------ |
| page | int  | 페이지 번호 (기본값: 1)  |
| size | int  | 페이지 크기 (기본값: 10) |

### 응답 (성공 시)

```json
{
  "limit": 10,
  "currentPage": 10,
  "totalCount": 9,
  "items": [
    {
      "name": "홍길동",
      "phone": "01000000000",
      "ssn": "980000-0******",
      "chart_number": "000000",
      "address": "서울시 서초구",
      "memo": "특이사항"
    }
  ]
}
```

---

## 4. 데이터베이스 스키마

### `patients` 테이블 구조

| 필드명       | 타입      | 설명                       |
| ------------ | --------- | -------------------------- |
| id           | INT (PK)  | 환자 고유 ID               |
| chart_number | VARCHAR   | 차트번호 (NULL 가능)       |
| name         | VARCHAR   | 환자 이름                  |
| phone        | VARCHAR   | 전화번호 (하이픈 제거)     |
| ssn          | VARCHAR   | 주민등록번호 (마스킹 적용) |
| address      | TEXT      | 주소 (선택)                |
| memo         | TEXT      | 메모 (선택)                |
| created_at   | TIMESTAMP | 생성 날짜                  |
| updated_at   | TIMESTAMP | 업데이트 날짜              |

- (name, phone, chart_number)를 uk로 가지는 단일 테이블 구조입니다.
  - **UK (Unique Key)**: `(name, phone, chart_number)`
- 단일 스키마 설계 이유
  - 조회 성능을 우선적으로 고려하여 설계되었습니다.
  - 15초 이내의 삽입 및 조회 성능을 달성하기 위해 Join 연산 없이 데이터 삽입/조회가 가능하도록 단일 테이블 구조가 적합하다고 생각했고, 선택했습니다.
  - `(이름, 전화번호)` 데이터가 중복 저장되어 메모리를 낭비할 수 있고, 동일 환자의 정보가 여러번 저장되어 삽입 이상이 발생할 수 있는 구조지만, \
    **`(이름, 전화번호, 차트번호)`를 기준으로 환자를 구분한다**는 요구사항에 따라 일반적인 환경과 달리 `서로 다른 (이름, 전화번호, 차트번호)`를 가지는 데이터는 모두 별개의 환자이며, 위의 문제가 발생하지 않는다고 판단했습니다.

---

## 5. 기능 설명

### Bulk Update 적용

- 5만 개의 데이터를 효율적으로 저장하기 위해 단일 SQL이 아닌 **Bulk Insert**를 활용하며, 이를 5000개 단위로 나누어 삽입했습니다.
- 중복 데이터가 있는 경우 **ON DUPLICATE KEY UPDATE**를 사용하여 필요한 데이터만 업데이트했습니다.
- 특수조건을 만족하기 위해 2번의 조회 쿼리, 2번의 삽입 쿼리가 실행되므로 **트랜잭션을 활용하여** 전체 프로세스를 하나의 단위로 묶고, 실패 시 롤백하여 데이터 정합성을 유지했습니다.
- 과정에서 **Promise.all을 활용한 비동기 처리**로 쿼리가 병렬적으로 DB에 전달될 수 있도록 구현했습니다.

### 특수 처리

- **이미 “이름, 전화번호, 차트번호 없음” 으로 등록된 환자가 있을 때, 동일한 이름과 전화번호를 가진 새 데이터에 차트번호가 포함되어 있으면 기존 환자의 차트번호를 업데이트해야 합니다.**라는 요구사항을 위해 다음과 같이 구현했습니다.
  1. (이름, 전화번호, 차트번호)가 일치하는 데이터를 조회, (이름, 전화번호, null)인 데이터를 조회
  2. (이름, 전화번호, 차트번호)가 일치하는 데이터가 DB에 없으면서, (이름, 전화번호, null)인 데이터가 존재하면 해당 데이터 갱신

---

### 요구사항

- xlsx 타입 데이터를 추출 가능해야한다.

  - [x] 차트번호, 주소, 메모는 `nullable`
  - [x] .xlsx 타입 이외의 파일은 예외발생

- 입력받은 데이터의 변환 및 검증

  - [x] 이름은 최소 1글자에서 최대 16자
  - [x] 전화번호는 한국 전화번호 형식을 지원
    - ex> 010-xxxx-xxxx, (지역번호) 055-xxx-xxxx
  - [x] 전화번호는 하이픈 포함/미포함 양식 모두 지원
  - [x] 전화번호는 하이픈을 제외하고 숫자로 변환
  - [x] 주민등록번호는 하이픈 포함 양식만을 지원
  - [x] 유효한 주민등록 포멧이 아닌경우 제외
    - 날짜 포맷
  - [x] 주민등록번호는 뒷자리 첫째숫자만 표기하도록 변환
    - ex> [990101-1234567] -> [990101-1*]
  - [x] 주민등록번호의 앞자리만 존재 시 0\*의 형태로 변환
    - ex> [990101] -> [990101-0*]

- 데이터는 적절한 스키마 형태로 적재 가능해야한다.

  - [x] 5만개의 데이터를 15초 이내에 처리 가능해야함
  - [x] `이름 + 전화번호 + 차트번호`를 기준으로 환자를 구분
    - 서로다른 데이터: ["김철수, 010-0000-0000, 차트번호 없음", "김철수, 010-0000-0000, 1234"]
  - [x] `이름, 전화번호, 차트번호 없음`으로 등록된 환자가 존재 시 동일한 `이름/전화번호`를 가진 새 데이터에 차트번호가 존재하면 기존 데이터를 갱신

- 2개의 API를 구현해야한다.
  - [x] 1. 엑셀 파일 등록 API
    - 요청: 엑셀 파일
    - 응답: 처리 결과 (성공/실패, 처리된 데이터 수 등)
  - [x] 2. 환자 목록 조회 API
    - 요청: 페이징 파라미터 (페이지 번호, 페이지 크기)
    - 응답: 환자 목록 데이터 (페이징 처리)
