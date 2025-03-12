import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: 'localhost',
  port: 3308,
  username: 'user',
  password: 'password',
  database: 'patient_db',
  entities: [__dirname + '/../**/entity/*.entity{.ts,.js}'],
  synchronize: true,
};
