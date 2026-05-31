import React from 'react';
import { 
  TrendingUp, 
  Layers, 
  FileSpreadsheet, 
  Activity,
  Award,
  Users,
  Percent,
  CheckCircle2,
  Calendar,
  Layers3
} from 'lucide-react';

interface SpreadsheetSummaryProps {
  columns: string[];
  rows: Record<string, any>[];
  isGoogleConnected: boolean;
  spreadsheetId: string;
  sheetName: string;
  onFilterClick?: (val: string) => void;
}

// Helper to reliably parse numeric fields disregarding commas and spaces
const parseNumber = (val: any): number => {
  if (val === undefined || val === null) return 0;
  const str = String(val).replace(/,/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

export default function SpreadsheetSummary({
  columns,
  rows,
  isGoogleConnected,
  spreadsheetId,
  sheetName,
  onFilterClick
}: SpreadsheetSummaryProps) {

  // 1. Scan and detect meaningful column semantic names dynamically
  const areaCol = React.useMemo(() => {
    return columns.find(c => c.includes('면적') || c.includes('㎡') || c.toLowerCase().includes('area'));
  }, [columns]);

  const agreeCol = React.useMemo(() => {
    // 1. Explicitly look for '조합설립동의' or '조합설립동의자'
    const targetMatch = columns.find(c => c.includes('조합설립동의') || c === '조합설립동의자');
    if (targetMatch) return targetMatch;

    // 2. Col E (index 4) fallback checks if it contains '동의'
    if (columns[4] && (columns[4].includes('동의') || columns[4].includes('동의자'))) {
      return columns[4];
    }

    // 3. General fallbacks
    return columns.find(c => c.includes('동의') || c.includes('합의') || c.includes('찬성') || c.includes('여부'));
  }, [columns]);

  const ownerCol = React.useMemo(() => {
    return columns.find(c => c.includes('소유자') || c.includes('권리자') || c.includes('이름') || c.toLowerCase().includes('owner'));
  }, [columns]);

  const landTypeCol = React.useMemo(() => {
    return columns.find(c => c.includes('지목') || c.includes('구분') || c.toLowerCase().includes('type'));
  }, [columns]);

  // 2. Compute Statistics dynamically
  const totalArea = React.useMemo(() => {
    if (!areaCol) return 0;
    return rows.reduce((sum, r) => sum + parseNumber(r[areaCol]), 0);
  }, [rows, areaCol]);

  const averageArea = React.useMemo(() => {
    if (rows.length === 0 || !areaCol) return 0;
    return totalArea / rows.length;
  }, [rows, totalArea, areaCol]);

  const agreeStats = React.useMemo(() => {
    if (!agreeCol) return null;
    const agreeRows = rows.filter(r => {
      const val = String(r[agreeCol] || '').trim();
      if (!val) return false;
      const lower = val.toLowerCase();
      
      // If it contains negative values
      if (lower === '미동의' || lower === '반대' || lower === '보류' || lower === '부족' || lower === 'n' || lower === 'no' || lower === 'x' || lower === '미제출') {
        return false;
      }
      
      // All other non-empty custom entries or positive markers are counted as consensus
      return lower === '동의' || lower === '동의완료' || lower === '찬성' || lower === '합의완료' || lower === 'y' || lower === 'o' || lower === 'yes' || lower === '완료' || lower === '동의자' || lower === '제출';
    });
    const count = agreeRows.length;
    const percent = rows.length > 0 ? Math.round((count / rows.length) * 100) : 0;
    return { count, percent };
  }, [rows, agreeCol]);

  const uniqueOwnerCount = React.useMemo(() => {
    if (!ownerCol) return rows.length;
    const owners = rows.map(r => String(r[ownerCol] || '').trim()).filter(Boolean);
    return new Set(owners).size;
  }, [rows, ownerCol]);

  // Group total area dynamically by category (e.g. 지목)
  const areaByGroup = React.useMemo(() => {
    if (!landTypeCol || !areaCol) return [];
    const groupMap: Record<string, number> = {};
    rows.forEach(r => {
      const groupVal = String(r[landTypeCol] || '기타/미지정').trim();
      const areaVal = parseNumber(r[areaCol]);
      groupMap[groupVal] = (groupMap[groupVal] || 0) + areaVal;
    });
    return Object.entries(groupMap).map(([group, area]) => ({
      group,
      area: Math.round(area * 100) / 100,
      percent: totalArea > 0 ? Math.round((area / totalArea) * 100) : 0
    })).sort((a, b) => b.area - a.area);
  }, [rows, landTypeCol, areaCol, totalArea]);

  // Custom Category Widget detector for high cardinality columns
  const categoryWidgets = React.useMemo(() => {
    if (rows.length === 0) return [];
    const widgets: Array<{ columnName: string; distributions: Array<{ label: string; count: number; percent: number }> }> = [];

    columns.forEach(col => {
      const isIdLike = col.toLowerCase().includes('id') || col.includes('번호') || col.includes('등록') || col.includes('일자') || col.includes('연락처') || col.includes('이름');
      if (isIdLike) return;

      const values = rows.map(r => String(r[col] ?? '').trim()).filter(Boolean);
      const uniqueValues = Array.from(new Set(values));

      if (uniqueValues.length >= 2 && uniqueValues.length <= 6) {
        const countsMap: Record<string, number> = {};
        values.forEach(v => {
          countsMap[v] = (countsMap[v] || 0) + 1;
        });

        const distributions = Object.entries(countsMap).map(([label, count]) => ({
          label,
          count,
          percent: Math.round((count / rows.length) * 100)
        })).sort((a, b) => b.count - a.count);

        widgets.push({
          columnName: col,
          distributions
        });
      }
    });

    return widgets;
  }, [rows, columns]);

  return (
    <div id="spreadsheet-summary-card" className="space-y-6 animate-fade-in text-left">
      
      {/* 1. Core KPIs Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* KPI Card 1: Records & Owners */}
        <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight font-display">
              토지소유자 목록 현황
            </span>
            <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-slate-900 font-display">{rows.length}</span>
              <span className="text-xs font-semibold text-gray-500">개 필지</span>
            </div>
            <div className="mt-2 text-xxs text-gray-400 font-medium">
              {ownerCol ? (
                <span>실제 소유자 총 {uniqueOwnerCount}인 단독/공동 지분 관리 중</span>
              ) : (
                <span>실시간 명부 탭 단독 연동 완료</span>
              )}
            </div>
          </div>
        </div>

        {/* KPI Card 2: Area Summary */}
        <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight font-display">
              구역 내 토지 면적 요약
            </span>
            <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-slate-900 font-display">
                {areaCol ? totalArea.toLocaleString('ko-KR') : '0'}
              </span>
              <span className="text-xs font-semibold text-gray-500">㎡</span>
            </div>
            <div className="mt-2 text-xxs text-gray-400 font-medium flex items-center justify-between">
              {areaCol ? (
                <>
                  <span>평균 면적: {Math.round(averageArea).toLocaleString('ko-KR')} ㎡</span>
                  <span className="text-emerald-600 font-bold">인식됨 (OK)</span>
                </>
              ) : (
                <span>스프레드시트에 면적 관련 열이 부재합니다.</span>
              )}
            </div>
          </div>
        </div>

        {/* KPI Card 3: Consent Ratio */}
        <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight font-display">
              조합 설립 동의율 지표
            </span>
            <div className={`p-2 rounded-xl ${agreeStats && agreeStats.percent >= 75 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-slate-900 font-display">
                {agreeStats ? `${agreeStats.percent}%` : 'N/A'}
              </span>
              <span className="text-xs font-semibold text-gray-500">
                {agreeStats ? `(${agreeStats.count}/${rows.length}필지)` : '미감지'}
              </span>
            </div>
            {agreeStats ? (
              <>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      agreeStats.percent >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${agreeStats.percent}%` }} 
                  />
                </div>
                <div className="mt-2.5 text-[10px] text-gray-400 font-medium flex items-center justify-between">
                  <span>기준 열: <strong className="text-gray-600">{agreeCol}</strong></span>
                  <span className="text-[9px] bg-slate-50 border border-slate-200/60 px-1 py-0.5 rounded-sm">Column E 감지</span>
                </div>
              </>
            ) : (
              <div className="mt-2 text-xxs text-gray-400 font-medium">
                조합설립동의자 열 감지 대기 중
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 2. Detailed Grid Summary Block */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Side: Distributions bar list */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 font-display">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>주요 속성 항목별 비율 분포 및 필터</span>
            </h3>
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-gray-550 uppercase tracking-widest font-bold">
              속성 요약
            </span>
          </div>

          {categoryWidgets.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-1.5 border border-dashed border-gray-100 rounded-xl">
              <Award className="w-8 h-8 text-gray-200 mx-auto" />
              <p className="text-xs font-semibold">자동 요약 대상이 부족합니다</p>
              <p className="text-[10px] text-gray-400">명부 안에 중복 범위가 2~6개 이내인 상태 값이 아직 존재하지 않습니다.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {categoryWidgets.map(widget => (
                <div key={widget.columnName} className="border-b border-slate-50 last:border-b-0 pb-4 last:pb-0 space-y-2.5">
                  <span className="text-xs font-extrabold text-blue-700 bg-blue-50/70 px-2.5 py-1 rounded-lg">
                    {widget.columnName} 비율 분포
                  </span>
                  
                  <div className="space-y-2 mt-2">
                    {widget.distributions.map(item => {
                      const isRefused = item.label === '미동의' || item.label === '반대' || item.label === '보류' || item.label === '부족';
                      const isAgreed = item.label === '동의완료' || item.label === '동의' || item.label === '찬성' || item.label === '충분' || item.label === '협의완료';
                      
                      const barColorClass = isRefused 
                        ? 'bg-rose-500' 
                        : isAgreed 
                        ? 'bg-emerald-500' 
                        : 'bg-blue-500';

                      const barBgClass = isRefused
                        ? 'bg-rose-50'
                        : isAgreed
                        ? 'bg-emerald-50'
                        : 'bg-blue-50';

                      return (
                        <button
                          key={item.label}
                          onClick={() => onFilterClick && onFilterClick(item.label)}
                          className="w-full text-left space-y-1 block p-2 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100 group cursor-pointer"
                          title={`"${item.label}" 필터값으로 에디터 테이블 조회하기`}
                        >
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="text-gray-700 group-hover:text-blue-600 transition flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${barColorClass}`} />
                              <strong className="font-semibold text-gray-800">{item.label}</strong>
                              <span className="text-gray-400 text-[10px]">({item.count}개 필지)</span>
                            </span>
                            <span className="text-gray-900 font-bold group-hover:text-blue-700 transition">{item.percent}%</span>
                          </div>
                          <div className="w-full bg-slate-100/60 h-2 rounded-full overflow-hidden mt-1.5">
                            <div 
                              className={`${barColorClass} h-full rounded-full transition-all duration-300`} 
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Land Type groups area occupation details */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 font-display">
              <Layers3 className="w-4 h-4 text-emerald-600" />
              <span>지목 및 소유구분별 총 점유면적 요약</span>
            </h3>
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-gray-550 font-mono">
              면적 통계
            </span>
          </div>

          {areaCol && landTypeCol && areaByGroup.length > 0 ? (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                현재 명부 탭 분석 결과, 전체 필적 {totalArea.toLocaleString('ko-KR')} ㎡ 중 각 지목 및 구역 속성에 해당하는 비중 순위 요약 리포트입니다. (클릭 시 필터가 바로 적용됩니다.)
              </p>
              
              <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto pr-1">
                {areaByGroup.map((item, idx) => (
                  <button
                    key={item.group}
                    onClick={() => onFilterClick && onFilterClick(item.group)}
                    className="w-full py-3 flex items-center justify-between text-left hover:bg-slate-50 px-2 rounded-xl transition cursor-pointer group"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xxs font-mono text-gray-400 bg-slate-100 px-1.5 py-0.5 rounded-sm">0{idx + 1}</span>
                        <span className="text-xs font-bold text-gray-800 group-hover:text-blue-600 transition">{item.group}</span>
                      </div>
                      <div className="w-4/5 bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full" 
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-gray-900">
                        {item.area.toLocaleString('ko-KR')} ㎡
                      </div>
                      <div className="text-xs text-gray-400">
                        전체 대비 {item.percent}%
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-gray-650 leading-relaxed shadow-xxs">
                💡 <strong>팁:</strong> 각 항목을 명부 편집창으로 들아가서 지목이나 속성 값을 수정할 때 마다 면적 가중치와 인적 합계가 완전 실시간으로 재합산됩니다.
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400 space-y-1.5 border border-dashed border-gray-100 rounded-xl">
              <Award className="w-8 h-8 text-gray-200 mx-auto" />
              <p className="text-xs font-semibold">면적 그룹 통계가 비어있습니다</p>
              <p className="text-xs text-gray-500">
                스프레드시트에 "지목" 혹은 "지분/소유구분" 및 "면적" 명칭을 지닌 유효한 수치 데이터 열이 있을 시 실시간으로 동작합니다.
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
