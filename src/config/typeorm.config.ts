import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: 'localhost',
  port: 3307,
  username: 'user',
  password: 'password',
  database: 'patient_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true,
  // logging: true, // SQL 로그 출력
};

export const typeOrmTestConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: 'localhost',
  port: 3308,
  username: 'user',
  password: 'password',
  database: 'test_patient_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true,
};
