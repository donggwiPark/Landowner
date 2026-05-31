import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, ArrowUpDown, Download, Info, AlertTriangle, RefreshCw } from 'lucide-react';

interface SpreadsheetTableProps {
  columns: string[];
  rows: Record<string, any>[];
  onEditRow: (rowIndex: number) => void;
  onDeleteRow: (rowIndex: number) => void;
  onAddRow: () => void;
  isSyncing: boolean;
  onSync: () => void;
  isDirty: boolean;
  hasGoogleAccess: boolean;
  searchTerm?: string;
  onSearchTermChange?: (val: string) => void;
  onCellEdit?: (rowIndex: number, column: string, value: any) => void;
}

type SortConfig = { key: string; direction: 'ascending' | 'descending' } | null;

export default function SpreadsheetTable({
  columns,
  rows,
  onEditRow,
  onDeleteRow,
  onAddRow,
  isSyncing,
  onSync,
  isDirty,
  hasGoogleAccess,
  searchTerm,
  onSearchTermChange
}: SpreadsheetTableProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const activeSearchTerm = searchTerm !== undefined ? searchTerm : localSearchTerm;

  const handleSearchChange = (val: string) => {
    if (onSearchTermChange) {
      onSearchTermChange(val);
    } else {
      setLocalSearchTerm(val);
    }
  };

  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);

  // Sorting handler
  const handleSort = (columnKey: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === columnKey && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key: columnKey, direction });
  };

  // Filter rows based on search term
  const filteredRows = React.useMemo(() => {
    let processedRows = rows.map((row, index) => ({ ...row, _originalIndex: index }));

    if (activeSearchTerm.trim() !== '') {
      const lower = activeSearchTerm.toLowerCase();
      processedRows = processedRows.filter(row => {
        return columns.some(col => {
          const value = String(row[col] ?? '').toLowerCase();
          return value.includes(lower);
        });
      });
    }

    // Apply sorting
    if (sortConfig !== null) {
      processedRows.sort((a, b) => {
        const valA = String(a[sortConfig.key] ?? '');
        const valB = String(b[sortConfig.key] ?? '');
        
        // Try numerical comparison first
        const numA = Number(valA.replace(/[^0-9.-]/g, ''));
        const numB = Number(valB.replace(/[^0-9.-]/g, ''));
        if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
          return sortConfig.direction === 'ascending' ? numA - numB : numB - numA;
        }

        // Fallback to string localeCompare
        return sortConfig.direction === 'ascending'
          ? valA.localeCompare(valB, 'ko-KR')
          : valB.localeCompare(valA, 'ko-KR');
      });
    }

    return processedRows;
  }, [rows, columns, activeSearchTerm, sortConfig]);

  // Export to simple CSV as physical backup
  const handleExportCSV = () => {
    if (rows.length === 0) return;
    const csvContent = "\uFEFF" + [
      columns.join(","),
      ...rows.map(row => columns.map(col => `"${String(row[col] ?? '').replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `soon_doong_owner_record_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const confirmDelete = (index: number) => {
    setRowToDelete(index);
  };

  const handleConfirmedDelete = () => {
    if (rowToDelete !== null) {
      onDeleteRow(rowToDelete);
      setRowToDelete(null);
    }
  };

  return (
    <div id="spreadsheet-table-container" className="space-y-4 text-left animate-fade-in">
      
      {/* UX Guide Panel to instruct users */}
      <div className="bg-blue-50/45 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-pulse" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-blue-900 leading-relaxed">
            💡 수정하고자 하는 행을 클릭하여 세로형 팝업 창 안에서 편리하게 항목별로 수정 및 입력할 수 있습니다.
          </p>
        </div>
      </div>

      {/* Table search & action bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        
        {/* Dynamic search input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="table-search-input"
            type="text"
            value={activeSearchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="소유자명, 지목, 면적, 주소 등으로 검색..."
            className="w-full text-sm pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 shadow-xs transition placeholder:text-gray-400"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 py-2.5 rounded-xl font-bold active:scale-95 transition text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="현재 테이블의 모든 행을 안전한 CSV 파일로 백업합니다"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>엑셀 다운로드</span>
          </button>

          <button
            id="btn-add-row"
            onClick={onAddRow}
            className="bg-blue-650 hover:bg-blue-700 text-blue-600 bg-blue-50/80 border border-blue-200/80 px-3.5 py-2.5 rounded-xl font-bold active:scale-95 transition text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="새로운 데이터 레코드를 가장 마지막에 추가합니다"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>신규 행 등록</span>
          </button>
        </div>
      </div>

      {/* Table Frame */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        {columns.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400 space-y-2">
            <p>연동된 구글 스프레드시트에 유효한 열 헤더가 존재하지 않거나 로딩 중입니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto min-w-full">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-slate-50">
                <tr>
                  {columns.map((col) => {
                    const showOnMobile = ['조합설립동의자', '대표자선임', '성명', '생년월일'].includes(col.trim());
                    return (
                      <th
                        key={col}
                        onClick={() => handleSort(col)}
                        className={`px-1.5 md:px-6 py-2.5 md:py-4 text-[11px] md:text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none transition whitespace-nowrap min-w-[65px] md:min-w-[150px] ${
                          showOnMobile ? '' : 'hidden md:table-cell'
                        }`}
                      >
                        <div className="flex items-center gap-0.5 md:gap-1">
                          <span>{col}</span>
                          <ArrowUpDown className="w-2.5 h-2.5 md:w-3 md:h-3 text-gray-400 shrink-0" />
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-1.5 md:px-6 py-2.5 md:py-4 text-[11px] md:text-xs font-semibold text-gray-600 text-right w-12 md:w-28 select-none whitespace-nowrap bg-slate-50">
                    행 관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-sm text-gray-400">
                      검색어 "{activeSearchTerm}"에 일치하는 데이터가 존재하지 않습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const originalIndex = row._originalIndex;
                    return (
                      <tr 
                        key={originalIndex}
                        onClick={() => onEditRow(originalIndex)}
                        className="hover:bg-blue-50/30 group transition duration-150 cursor-pointer"
                        title="클릭하여 상세 수정하기"
                      >
                        {columns.map((col) => {
                          const isIdCol = col.toLowerCase().includes('id') || col.includes('번호') || col.includes('학번');
                          const cellVal = String(row[col] ?? '');
                          const showOnMobile = ['조합설립동의자', '대표자선임', '성명', '생년월일'].includes(col.trim());

                          return (
                            <td 
                              key={col} 
                              className={`px-1.5 md:px-6 py-1.5 md:py-3.5 text-[11px] md:text-xs text-gray-700 whitespace-nowrap transition duration-75 relative ${
                                showOnMobile ? '' : 'hidden md:table-cell'
                              } ${
                                isIdCol ? 'font-mono text-gray-900 font-medium bg-slate-50/10' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 min-h-[22px]">
                                <span className={
                                  cellVal === '품절' || cellVal === '결석' || cellVal === '미동의' 
                                    ? 'bg-red-50 text-red-700 px-1 py-0.5 rounded-md font-semibold text-[10px] md:text-xs border border-red-100' 
                                    : cellVal === '동의' || cellVal === '찬성' || cellVal === '완료' 
                                    ? 'bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded-md font-semibold text-[10px] md:text-xs border border-emerald-100' 
                                    : ''
                                }>
                                  {cellVal || <span className="text-gray-300">-</span>}
                                </span>
                                
                                {/* Fine pencil icon on cell hover indicating editability */}
                                <span className="opacity-0 group-hover:opacity-60 transition-opacity duration-150 text-blue-600 shrink-0">
                                  <Edit2 className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                </span>
                              </div>
                            </td>
                          );
                        })}

                        {/* Actions */}
                        <td className="px-1.5 md:px-6 py-1.5 md:py-3.5 text-right whitespace-nowrap bg-white/40" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onEditRow(originalIndex)}
                              className="p-1 text-slate-550 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="상세 수정"
                            >
                              <Edit2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            </button>
                            <button
                              onClick={() => confirmDelete(originalIndex)}
                              className="p-1 text-slate-350 hover:text-red-650 hover:bg-red-50 rounded-lg transition"
                              title="삭제하기"
                            >
                              <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Explicit Custom Row Deletion Confirmation Dialog per Guidelines */}
      {rowToDelete !== null && (
        <div id="delete-confirmation-overlay" className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fade-in" onClick={() => setRowToDelete(null)}>
          <div id="delete-confirmation-dialog" className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full border border-gray-100 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-base font-display">데이터 영구 삭제 확인</h4>
            </div>
            
            <p className="text-sm text-gray-600 leading-relaxed">
              선택한 {rowToDelete + 1}번째 소유명부 행 데이터를 완전히 삭제하시겠습니까?<br />
              <strong className="text-red-750">이 작업은 취소할 수 없으며</strong>, 구글 스프레드시트 탭 파일에도 즉시 지워집니다.
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setRowToDelete(null)}
                className="flex-1 text-xs font-semibold border border-gray-200 text-gray-600 py-2.5 rounded-xl hover:bg-gray-50 active:scale-95 transition cursor-pointer"
              >
                취소 (유지)
              </button>
              <button
                onClick={handleConfirmedDelete}
                className="flex-1 text-xs font-bold bg-red-600 text-white py-2.5 rounded-xl hover:bg-red-700 active:scale-95 transition cursor-pointer"
              >
                예, 삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
