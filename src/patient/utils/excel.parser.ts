import * as xlsx from 'xlsx';

export class ExcelFileParser<T> {
  constructor(private fieldMap: { [key: string]: keyof T }) {}

  parse(buffer: Buffer): T[] {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    return xlsx.utils.sheet_to_json<T>(sheet, {
      header: Object.values(this.fieldMap).map(String),
    });
  }
}
