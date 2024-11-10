export interface SheetData {
  [key: string]: string | number;
}

export interface DocumentContent {
  [sheetName: string]: SheetData[];
}

export interface DocumentReaderResult {
  content: string;
  metadata?: {
    sheetCount?: number;
    rowCount?: number;
    format?: string;
  };
} 