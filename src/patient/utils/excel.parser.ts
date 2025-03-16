import * as xlsx from 'xlsx';
import { ValidationError, validate } from 'class-validator';

export class ExcelFileParser<T extends object> {
  constructor(
    private readonly fieldMap: { [key: string]: keyof T },
    private readonly dtoClass: new () => T,
  ) {}

  async parse(buffer: Buffer): Promise<{ count: number; dto: T[] }> {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const jsonData = xlsx.utils.sheet_to_json<T>(sheet, {
      header: Object.values(this.fieldMap).map(String),
    });
    console.log(jsonData[0]);
    const validatedData: (T | null)[] = await Promise.all(
      jsonData.map(async (data) => {
        const dto = Object.assign(new this.dtoClass(), data);

        const errors: ValidationError[] = await validate(dto);
        if (errors.length > 0) {
          // console.warn(`유효하지 않은 데이터: ${JSON.stringify(errors)}`);
          return null;
        }

        return dto;
      }),
    );
    return {
      count: validatedData.length - 1,
      dto: validatedData.filter((item): item is T => item !== null),
    };
  }
}
