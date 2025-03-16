export class Page<T> {
  limit: number;
  currentPage: number;
  totalCount: number;
  items: T[];

  constructor(limit: number, pageNo: number, items: T[]) {
    this.limit = limit;
    this.currentPage = pageNo;
    this.totalCount = items.length;
    this.items = items;
  }
}
