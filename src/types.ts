export interface TableData {
  id: string;
  tableName: string;
  headers: string[];
  rows: string[][];
  pageNumber: number;
}

export interface FileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'rendering' | 'processing' | 'completed' | 'failed';
  progress: number; // 0 to 100
  totalPages: number;
  currentPage: number;
  error?: string;
  tables: TableData[];
}

export interface OCRResponse {
  tables: {
    tableName: string;
    headers: string[];
    rows: string[][];
  }[];
  fullText?: string;
}
