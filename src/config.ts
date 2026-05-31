/**
 * 📊 구글 스프레드시트 연동용 기본 구성 설정
 * 
 * [설정 방법]
 * 1. 아래 DEFAULT_SPREADSHEET_ID 에 연동하고자 하는 구글 스프레드시트 ID를 입력해주세요.
 *    - 구글 스프레드시트의 URL 주소에서 /d/ 와 /edit 사이의 긴 문자열이 고유 ID입니다.
 *    - 예시 URL: https://docs.google.com/spreadsheets/d/1Lre0TNJL_abcdef12345_XYZ/edit#gid=0
 *      => 고유 ID: 1Lre0TNJL_abcdef12345_XYZ
 * 
 * 2. DEFAULT_SHEET_NAME 에 데이터가 담긴 탭 이름(기본값: Sheet1, or 시트1 등)을 입력해주세요.
 */

// ⚠️ 여기에 특정 구글 스프레드시트 ID를 넣어두면, 최초 설정 없이 즉시 대시보드가 로드됩니다.
export const DEFAULT_SPREADSHEET_ID = '1IbU-GuRa9lP0FR5fPDiOvufQxrGngRsQNbhzekLq8eM'; 

// ⚠️ 연동하고자 하는 기본 시트(탭) 이름을 지정합니다. (예: 'Sheet1', '명부', '성도명부' 등)
export const DEFAULT_SHEET_NAME = '순둥이랑 클로드 합작';
