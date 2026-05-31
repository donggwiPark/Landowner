/**
 * Types and Interfaces for Kakao & Google Sheets Editor Application
 */

export interface KakaoUserProfile {
  nickname: string;
  profileImage: string;
  email: string;
  isSimulated: boolean;
  loggedInAt: string;
}

export interface SpreadsheetInfo {
  id: string;
  title: string;
  selectedSheet: string;
  columns: string[];
  rows: Record<string, any>[]; // Each row represented as key-value pairs mapping column names to cell content
  originalRawRows: any[][];   // Grid storage: rows of cells exactly from Google Sheets
}

export interface SheetTemplate {
  name: string;
  description: string;
  columns: string[];
  defaultRows: Record<string, any>[];
  spreadsheetIdPlaceholder: string;
}
