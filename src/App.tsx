import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  HelpCircle, 
  Sparkles, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight,
  Plus, 
  LogOut,
  Sliders,
  Grid,
  Lock,
  ChevronRight,
  Layers,
  Key,
  Shield,
  FileText,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { KakaoUserProfile, SpreadsheetInfo } from './types';
import { TEMPLATES } from './templates';
import KakaoLoginBtn from './components/KakaoLoginBtn';
import SpreadsheetTable from './components/SpreadsheetTable';
import SpreadsheetSummary from './components/SpreadsheetSummary';
import RowEditModal from './components/RowEditModal';
import { DEFAULT_SPREADSHEET_ID, DEFAULT_SHEET_NAME } from './config';
import { AnimatePresence } from 'motion/react';

// Help extract spreadsheet raw ID if user pasted raw URL
const extractSpreadsheetId = (input: string): string => {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
};

export default function App() {
  // 1. Auth States (null represents not logged in)
  const [kakaoUser, setKakaoUser] = useState<KakaoUserProfile | null>(null);
  
  // 2. Active Tab States (summary, editor)
  const [activeTab, setActiveTab] = useState<'summary' | 'editor'>('summary');
  const [showGoogleConfig, setShowGoogleConfig] = useState<boolean>(false);

  // 3. Spreadsheet Connection States (pointing to the user's explicit sheet ID)
  const [spreadsheetId, setSpreadsheetId] = useState<string>(DEFAULT_SPREADSHEET_ID);
  const [sheetName, setSheetName] = useState<string>(DEFAULT_SHEET_NAME);
  const [sheetsList, setSheetsList] = useState<{title: string; sheetId: number}[]>([]);
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);

  const [serverAuthMethod, setServerAuthMethod] = useState<string>('none');
  const [isServerConfigured, setIsServerConfigured] = useState<boolean>(false);
  const [serviceAccountEmail, setServiceAccountEmail] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Check if server-side auto Google credentials are configured
  useEffect(() => {
    const checkServerConfig = async () => {
      try {
        const res = await fetch('/api/sheets/config');
        if (res.ok) {
          const data = await res.json();
          setServerAuthMethod(data.method);
          setIsServerConfigured(data.isConfigured);
          setServiceAccountEmail(data.serviceAccountEmail || '');
          if (data.spreadsheetId) {
            setSpreadsheetId(data.spreadsheetId);
          }
        }
      } catch (e) {
        console.error('Failed to fetch server sheets config:', e);
      }
    };
    checkServerConfig();
  }, []);

  // 4. Spreadsheets Grid Logic State (initialized with first template landowner details for pristine fallback preview)
  const [columns, setColumns] = useState<string[]>(TEMPLATES[0].columns);
  const [rows, setRows] = useState<Record<string, any>[]>(TEMPLATES[0].defaultRows);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // 5. Toast alerts
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 6. Modal Row States (Add / Edit)
  const [isRowModalOpen, setIsRowModalOpen] = useState<boolean>(false);
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null); // null if Adding row

  // 7. Lifted search bar term to allow cross-tab search filtering
  const [tableSearchTerm, setTableSearchTerm] = useState<string>('');

  // Handle Toast timers
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Google Sheets Core Fetch Integration (dynamic lookup based on environment config)
  const handleLoadFromGoogle = async (sheetNameInput?: string) => {
    const cleanName = (sheetNameInput || sheetName || 'Sheet1').trim();
    setSheetName(cleanName);

    setIsSyncing(true);
    setLoadError(null);
    try {
      const cleanedId = extractSpreadsheetId(spreadsheetId);
      const loadUrl = `/api/sheets/load?spreadsheetId=${cleanedId}&sheetName=${encodeURIComponent(cleanName)}`;
      
      const response = await fetch(loadUrl);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `서버 연동을 통한 명부 조회 실패: HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.values || data.values.length === 0) {
        throw new Error('스프레드시트가 비어있거나 올바른 시트명을 감지할 수 없습니다. 시트 설정을 확인해주세요.');
      }

      const rawRows = data.values as any[][];
      const headerCols = rawRows[0];
      const itemRows = rawRows.slice(1).map((rowArr) => {
        const rowObj: Record<string, any> = {};
        headerCols.forEach((col: string, colIdx: number) => {
          rowObj[col] = rowArr[colIdx] !== undefined ? String(rowArr[colIdx]) : '';
        });
        return rowObj;
      });

      if (data.resolvedSheetName) {
        setSheetName(data.resolvedSheetName);
      }

      setColumns(headerCols);
      setRows(itemRows);
      setIsGoogleConnected(true);
      setIsDirty(false);
      setLoadError(null);
      showToast('success', `[서버 자동 연동] 데이터를 성공적으로 동기화했습니다! (${data.resolvedSheetName || cleanName})`);
      
      if (data.sheets && data.sheets.length > 0) {
        setSheetsList(data.sheets);
      } else {
        setSheetsList([
          { title: cleanName, sheetId: 1 }
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setIsGoogleConnected(false);
      
      const cleanErrMsg = err.message || '';
      if (cleanErrMsg.includes('GOOGLE_SERVICE_ACCOUNT_JSON') || cleanErrMsg.includes('자격 증명') || cleanErrMsg.includes('401')) {
        setLoadError('서버 구글 서비스 계정이 설정되어 있지 않아 오프라인 모드(견본 보기)로 실행 중입니다.');
        showToast('error', '구글 실시간 연동이 구성되지 않았습니다. 내장 견본 데이터를 로드하여 오프라인 모드로 안전하게 조회를 지원합니다.');
      } else {
        setLoadError(err.message || '데이터 로딩 중 에러가 발생했습니다.');
        showToast('error', err.message || '데이터 로딩 중 에러가 발생했습니다.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Switch between 하부 sheets (tabs)
  const handleSwitchTab = async (targetTabName: string) => {
    setSheetName(targetTabName);
    await handleLoadFromGoogle(targetTabName);
  };

  // Automate Sheet loading upon Kakao Login success
  useEffect(() => {
    if (kakaoUser) {
      handleLoadFromGoogle();
    }
  }, [kakaoUser]);

  // Handle Kakao Redirect Callback extraction on Mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('kakao_success');
    const name = params.get('nickname');
    const img = params.get('profile_image');
    const email = params.get('email');
    const error = params.get('kakao_error');

    if (success === 'true' && name) {
      const loadedUser: KakaoUserProfile = {
        nickname: decodeURIComponent(name),
        profileImage: img ? decodeURIComponent(img) : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
        email: email ? decodeURIComponent(email) : '',
        isSimulated: false,
        loggedInAt: new Date().toLocaleString('ko-KR')
      };
      setKakaoUser(loadedUser);
      showToast('success', `${loadedUser.nickname}님, 카카오 계정으로 안전하게 로그인되었습니다.`);
      
      // Clean up URL parameters to keep address bar fresh
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      showToast('error', `카카오 인증 실패: ${decodeURIComponent(error)}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
  };

  // Kakao login/logout hooks
  const handleKakaoLogin = (profile: KakaoUserProfile) => {
    setKakaoUser(profile);
    showToast('success', `${profile.nickname}님, 로그인 성공!`);
  };

  const handleKakaoLogout = () => {
    if (kakaoUser) {
      showToast('success', '계정 연동 세션이 안전하게 종료되었습니다.');
    }
    setKakaoUser(null);
    setIsGoogleConnected(false);
  };

  // Google Sheets Core Save Integration [Overwrites rows directly]
  const saveRowsToGoogle = async (latestRows: Record<string, any>[], isSilent: boolean = false) => {
    if (!isGoogleConnected) {
      if (!isSilent) {
        showToast('error', '현재 로컬 플레이그라운드 모드입니다. 구글 시트 연결 후 갱신이 이루어져야 합니다.');
      }
      return;
    }

    if (!isSilent) {
      const confirmed = window.confirm(
        `구글 스프레드시트의 데이터를 원클릭 편집기의 수정 상세본으로 '덮어쓰기' 하시겠습니까?\n이 작업은 구글 시트의 [${sheetName}] 탭 기존 데이터를 라이브로 즉시 최신화합니다.`
      );
      if (!confirmed) return;
    }

    setIsSyncing(true);
    try {
      const cleanId = extractSpreadsheetId(spreadsheetId);
      const cleanName = sheetName.trim() || 'Sheet1';

      // Transform columns and row objects back to array of arrays
      const gridValues: any[][] = [];
      gridValues.push(columns); // Headers first

      latestRows.forEach(row => {
        const rowArr = columns.map(col => row[col] ?? '');
        gridValues.push(rowArr);
      });

      const payload: Record<string, any> = {
        values: gridValues,
        spreadsheetId: cleanId,
        sheetName: cleanName
      };

      const response = await fetch('/api/sheets/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `서버 저장 실패: HTTP ${response.status}`);
      }

      setIsDirty(false);
      showToast('success', isSilent 
        ? `[실시간 자동 반영] 구글 스프레드시트에 즉시 반영 완료! (${cleanName})`
        : `[서버 자동 연동] 구글 스프레드시트 갱신 반영 완료! (${cleanName})`
      );
    } catch (err: any) {
      console.error(err);
      showToast('error', `구글 시트 즉시 반영 실패: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncToGoogle = async () => {
    await saveRowsToGoogle(rows, false);
  };

  // Add / Edit Row operations
  const handleOpenAddRow = () => {
    setEditingRowIdx(null);
    setIsRowModalOpen(true);
  };

  const handleOpenEditRow = (index: number) => {
    setEditingRowIdx(index);
    setIsRowModalOpen(true);
  };

  const handleSaveRowData = (formData: Record<string, any>) => {
    const updatedRows = [...rows];
    if (editingRowIdx !== null) {
      // Edit Mode
      updatedRows[editingRowIdx] = formData;
      showToast('success', `${editingRowIdx + 1}번째 행 데이터가 수정되었습니다.`);
    } else {
      // Add Mode
      updatedRows.push(formData);
      showToast('success', '새로운 데이터 행이 추가되었습니다.');
    }
    setRows(updatedRows);
    setIsDirty(true);
    setIsRowModalOpen(false);

    // Live continuous sync
    if (isGoogleConnected) {
      saveRowsToGoogle(updatedRows, true);
    }
  };

  const handleDeleteRow = (index: number) => {
    const updatedRows = [...rows];
    updatedRows.splice(index, 1);
    setRows(updatedRows);
    setIsDirty(true);
    showToast('success', `${index + 1}번째 행 인스턴스가 삭제되었습니다.`);

    // Live continuous sync
    if (isGoogleConnected) {
      saveRowsToGoogle(updatedRows, true);
    }
  };

  const handleUpdateCell = (rowIndex: number, columnName: string, value: any) => {
    const updatedRows = [...rows];
    updatedRows[rowIndex] = { ...updatedRows[rowIndex], [columnName]: value };
    setRows(updatedRows);
    setIsDirty(true);
    
    // Live continuous sync
    if (isGoogleConnected) {
      saveRowsToGoogle(updatedRows, true);
    }
  };

  // 1. LOGIN PRE-VIEW (로그인 페이지)
  // If user is null, they should stay here without bypass to other tabs
  if (!kakaoUser) {
    return (
      <div id="login-screen-wrapper" className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between font-sans selection:bg-blue-500/10">
        
        {/* Toast alerts inside login view */}
        {toast && (
          <div 
            id="login-toast" 
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4.5 py-3.5 rounded-xl shadow-lg border text-xs max-w-sm font-medium animate-fade-in ${
              toast.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Decorative Grid Top */}
        <div className="absolute top-0 inset-x-0 h-80 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />

        <div className="flex-1 flex items-center justify-center p-4 z-10">
          <div id="login-container-card" className="w-full max-w-lg bg-white border border-gray-200 shadow-xl rounded-3xl overflow-hidden p-8 space-y-8 animate-fade-in text-center relative">
            
            {/* Visual Indicator */}
            <div className="mx-auto bg-blue-600 text-white w-14 h-14 rounded-2xl shadow-xl shadow-blue-500/10 flex items-center justify-center mb-2">
              <FileSpreadsheet className="w-7 h-7" />
            </div>

            <div className="space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-600 bg-blue-50 px-3.5 py-1 rounded-full inline-block">
                토지등소유자 명부 관리시스템
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">
                금강·경원 일원 토지등소유자 명부 관리
              </h1>
            </div>

            {/* Core Action: Kakao Login Button Wrapper */}
            <div className="space-y-4 pt-4 flex flex-col items-center justify-center">
              <div className="flex flex-col items-center justify-center font-semibold scale-110 py-2 w-full">
                <KakaoLoginBtn 
                  user={kakaoUser} 
                  onLogin={handleKakaoLogin} 
                  onLogout={handleKakaoLogout} 
                />
              </div>
            </div>

          </div>
        </div>

        {/* Footer Area */}
        <footer className="py-6 border-t border-gray-150 text-center bg-white">
          <p className="text-xs text-gray-500 font-mono">
            © 2026 SoonDoong Company
          </p>
        </footer>

      </div>
    );
  }

  // 2 & 3. MAIN DASHBOARD WORKSPACE (로그인 성공 후 진입 가능)
  return (
    <div id="app-root-container" className="min-h-screen bg-[#F8FAFC] font-sans text-gray-800 antialiased selection:bg-blue-500/10 flex flex-col">
      
      {/* Dynamic Toast Alerts */}
      {toast && (
        <div 
          id="global-toast-card" 
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4.5 py-3.5 rounded-xl shadow-lg border text-xs max-w-sm font-medium animate-fade-in ${
            toast.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Modern High-End Top Section */}
      <header id="app-main-header" className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs px-4 md:px-8 py-2 md:py-3 flex flex-row items-center justify-between gap-2 md:gap-4">
        
        {/* Brand Logo & Context */}
        <div id="brand-logo-panel" className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className="bg-blue-600 text-white p-1.5 md:p-2.5 rounded-lg md:rounded-xl shadow-md shrink-0">
            <FileSpreadsheet className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div className="text-left min-w-0">
            <h1 className="font-bold text-xs sm:text-sm md:text-base text-gray-900 tracking-tight font-display truncate">
              금강·경원 일원 토지등소유자 명부 관리
            </h1>
          </div>
        </div>

        {/* Authenticate panel */}
        <div id="authenticate-header-panel" className="flex items-center gap-2 shrink-0">
          <KakaoLoginBtn 
            user={kakaoUser} 
            onLogin={handleKakaoLogin} 
            onLogout={handleKakaoLogout} 
          />
        </div>
      </header>

      {/* Body content with full width Workspace Grid to optimize data density */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-8 flex flex-col gap-6">

        {/* WORKSPACE PANEL */}
        <section id="workspace-panel" className="w-full space-y-6">
          
          {/* Main Navigation tabs (Summary first, then Editor) */}
          <div className="border-b border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex gap-4">
              
              {/* Tab 2. Summary (구글 스프레드시트 요약 먼저) */}
              <button
                id="nav-tab-summary"
                onClick={() => setActiveTab('summary')}
                className={`py-3.5 border-b-2 text-sm sm:text-base font-extrabold tracking-wide transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'summary'
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Grid className="w-4.5 h-4.5" />
                <span>요약</span>
              </button>

              {/* Tab 3. Data Edit UI (데이터 편집) */}
              <button
                id="nav-tab-editor"
                onClick={() => setActiveTab('editor')}
                className={`py-3.5 border-b-2 text-sm sm:text-base font-extrabold tracking-wide transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'editor'
                    ? 'border-b-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <FileText className="w-4.5 h-4.5" />
                <span>명부 관리</span>
              </button>

            </div>

            <div className="flex items-center gap-2 mb-2 md:mb-0">
              <button
                id="btn-toggle-google-config"
                onClick={() => setShowGoogleConfig(!showGoogleConfig)}
                className={`font-semibold text-xs border px-3 py-1.5 rounded-xl flex items-center gap-1.5 active:scale-95 transition cursor-pointer ${
                  showGoogleConfig 
                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
                title="구글 스프레드시트 연동 정보를 기입하거나 관리자 설정을 엽니다."
              >
                <Sliders className="w-3 h-3" />
                <span>데이터 원본 설정</span>
              </button>

              <button
                id="btn-google-sheets-load-nav"
                onClick={() => handleLoadFromGoogle()}
                disabled={isSyncing}
                className="font-semibold text-xs bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
                title="구글 실시간 명부 데이터와 동기화합니다"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>실시간 동기화</span>
              </button>
            </div>
          </div>

          {/* Active Content View Registry */}

          {/* 구글 스프레드시트 연동 상태 튜닝 패널 */}
          {showGoogleConfig && (
            <div id="google-connection-helper-card" className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-6 text-left animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                    <Database className="w-4.5 h-4.5 text-blue-600 animate-pulse" />
                    <span>구글 스프레드시트 연동 설정 및 자격 증명 관리</span>
                  </h4>
                  <p className="text-sm text-gray-600">
                    등록하신 구글 스프레드시트 ID와 탭 이름을 자유롭게 변경하여 실시간으로 연동하고 오류를 테스트할 수 있습니다.
                  </p>
                </div>
                
                {loadError && loadError.includes('403') && (
                  <span className="text-xs font-bold bg-red-50 text-red-700 border border-red-100 px-3 py-1 rounded-full animate-pulse shrink-0">
                    ⚠️ 403 권한 조치 필요
                  </span>
                )}
              </div>

              {/* Dynamic Settings Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">
                    구글 스프레드시트 ID (Spreadsheet ID)
                  </label>
                  <input
                    type="text"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    placeholder="예시: 1IbU-GuRa9lP0FR5fPDiOvufQxrGngRsQNbhzekLq8eM"
                    className="w-full px-4.5 py-2.5 text-xs bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <p className="text-xs text-gray-500">
                    스프레드시트 인터넷 주소창의 <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">/d/</code> 와 <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">/edit</code> 사이에 위치한 고유 문자열입니다.
                  </p>
                </div>

                <div className="space-y-1.5 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">
                      연동 대상 시트명 (Tab Name)
                    </label>
                    <input
                      type="text"
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                      placeholder="예시: Sheet1 또는 명부"
                      className="w-full px-4.5 py-2.5 text-xs bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  
                  <button
                    onClick={() => handleLoadFromGoogle()}
                    disabled={isSyncing}
                    className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer shadow-sm shadow-blue-500/10"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>구글 스프레드시트 연동 테스트 & 데이터 동기화</span>
                  </button>
                </div>
              </div>

              {/* 403 Forbidden Error Solution Box */}
              {loadError && (
                <div className="bg-rose-50/30 border border-rose-200/60 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-left">
                      <h5 className="font-bold text-xs text-rose-900">
                        데이터 로딩 중 연동 에러가 감지되었습니다
                      </h5>
                      <p className="text-[11px] text-rose-800 leading-relaxed font-mono">
                        {loadError}
                      </p>
                    </div>
                  </div>

                  {loadError.includes('403') && (
                    <div className="space-y-4">
                      {/* 구글 API 미사용/비활성화 에러인 경우 특별 가이드라인 노출 */}
                      {(loadError.includes('Sheets API') || loadError.includes('disabled') || loadError.includes('overview')) ? (
                        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4.5 space-y-3.5 shadow-xs animate-fade-in text-left">
                          <div className="space-y-1">
                            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-md uppercase tracking-wider inline-block">
                              🚨 Google Sheets API 비활성화됨
                            </span>
                            <h6 className="font-bold text-xs text-amber-900 mt-1">
                              구글 클라우드 프로젝트에서 Google Sheets API 사용 설정이 필요합니다.
                            </h6>
                            <p className="text-[11px] text-amber-800 leading-relaxed">
                              현재 서비스 계정이 속한 구글 클라우드 콘솔 프로젝트에서 <strong>Google Sheets API</strong> 서비스가 완전히 켜져 있지 않습니다. 아래 링크를 통해 1-클릭으로 바로 활성화하실 수 있습니다!
                            </p>
                          </div>

                          <div className="pt-1">
                            <a
                              href={
                                loadError.match(/(https:\/\/console\.[a-zA-Z0-9.\/?=-]+)/)?.[0] ||
                                "https://console.cloud.google.com/apis/library/sheets.googleapis.com"
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer shadow-md transition-all active:scale-95"
                            >
                              <span>Google Sheets API 활성화 페이지 바로가기</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>

                          <div className="text-[10px] text-amber-700/80">
                            * 링크 이동 후 사용중인 구글 계정으로 로그인한 뒤, 화면 중앙의 <strong className="text-amber-900 font-semibold">[사용 설정] (Enable)</strong> 버튼을 클릭하고 1~2분 후 재동기화해 주세요.
                          </div>
                        </div>
                      ) : null}

                      <div className="bg-white border border-rose-100 rounded-xl p-4.5 space-y-4 shadow-xs animate-fade-in text-left">
                        <div className="space-y-1">
                          <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider inline-block">
                            실시간 403 권한 해결 조치법
                          </span>
                          <h6 className="font-bold text-xs text-slate-800 mt-1">
                            구글 스프레드시트를 상기 서비스 계정에 공유해주세요.
                          </h6>
                          <p className="text-[11px] text-gray-500 leading-relaxed">
                            현재 지정된 스프레드시트 문서는 비공개 상태이므로, 구글 서버 API가 소유주 허가 없이 접근할 수 없습니다. 아래 이메일을 문서 편집자로 등록해주시면 즉시 해결됩니다.
                          </p>
                        </div>

                      {/* Service account Copy Section */}
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="space-y-0.5 text-left">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono block">
                            공유 대상 서비스 계정 이메일 (Service Account Email)
                          </span>
                          <p className="text-xs font-semibold text-gray-800 font-mono select-all break-all">
                            {serviceAccountEmail || '(서버에 서비스 계정이 설정되지 않았습니다 — GOOGLE_SERVICE_ACCOUNT_JSON 환경변수를 확인하세요)'}
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(serviceAccountEmail || '');
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className={`text-xs py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap shrink-0 border ${
                            copied
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>복사 완료!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-gray-500" />
                              <span>이메일 복사하기</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Step by step */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1">
                          <div className="text-blue-600 font-extrabold text-[11px]">01단계</div>
                          <p className="text-[10px] text-gray-600 leading-relaxed">
                            연동할 <strong className="text-gray-900">구글 스프레드시트</strong>를 브라우저에서 엽니다.
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1">
                          <div className="text-indigo-600 font-extrabold text-[11px]">02단계</div>
                          <p className="text-[10px] text-gray-600 leading-relaxed">
                            우측 상단 <span className="font-semibold text-gray-900 bg-gray-100 px-1 py-0.5 rounded">공유 (Share)</span> 버튼을 눌러 위의 복사한 이메일을 추가하고, 권한을 <strong className="text-gray-900">편집자 (Editor)</strong>로 부여합니다.
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1">
                          <div className="text-emerald-600 font-extrabold text-[11px]">03단계</div>
                          <p className="text-[10px] text-gray-600 leading-relaxed">
                            저장 완료 후 위의 <strong className="text-gray-900">공유 설정 완료 및 재동기화</strong> 버튼이나 <strong className="text-gray-900">연동 테스트</strong> 버튼을 누르면 연동이 즉시 복구됩니다!
                          </p>
                        </div>
                      </div>

                      {/* Google console warning / API enabled warning */}
                      <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3 flex items-start gap-2 text-[10px] text-amber-850 leading-relaxed">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>
                          <strong>도움말:</strong> 만약 위 작업을 완료했음에도 계속해서 403 에러가 지속된다면, 구글 클라우드 콘솔에서 <strong>Google Sheets API</strong> 서비스가 사용 설정(Enabled)되어 있는지 확인해 주시기 바랍니다.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                  {loadError.includes('404') && (
                    <div className="bg-white border border-rose-100 rounded-xl p-4.5 space-y-4 shadow-xs animate-fade-in text-left">
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider inline-block">
                          실시간 404 설정 해결 조치법
                        </span>
                        <h6 className="font-bold text-xs text-slate-800 mt-1">
                          스프레드시트 ID 또는 시트(탭) 이름을 확인해 주세요.
                        </h6>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                          구글 서버가 지정된 ID로 스프레드시트를 찾을 수 없거나, 해당 스프레드시트 안에 해당 명칭의 탭(시트)이 존재하지 않습니다.
                        </p>
                      </div>

                      {/* Step by step */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1">
                          <div className="text-blue-600 font-extrabold text-[11px]">01. 스프레드시트 ID 검증</div>
                          <p className="text-[10px] text-gray-600 leading-relaxed text-slate-500">
                            주소창의 <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-xs">/d/</code> 와 <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-xs">/edit</code> 사이 문자열이 <strong className="text-gray-900 font-mono break-all">{spreadsheetId}</strong>와 정확히 일치하는지 확인하십시오. 공백이 숨어있을 수도 있습니다.
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1">
                          <div className="text-indigo-600 font-extrabold text-[11px]">02. 탭(시트) 이름 검증</div>
                          <p className="text-[10px] text-gray-600 leading-relaxed text-slate-500">
                            하단 탭 이름이 정확히 <strong className="text-gray-900 font-mono">"{sheetName}"</strong>와 일치하는지 확인해주십시오. 영어 대소문자나 뒤쪽에 보이지 않는 공백이 있을 수 있습니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Screen 2. Summary Dashboard */}
          {activeTab === 'summary' && (
            <div id="content-summary" className="space-y-6">
              <div className="text-left space-y-1.5">
                <h3 className="font-extrabold text-xl sm:text-2xl text-slate-900 font-display flex items-center gap-2">
                  <Grid className="w-6 h-6 text-indigo-600 animate-pulse" />
                  <span>데이터 요약</span>
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  불러온 명부 데이터셋의 비율 분포와 면적 집계 등 핵심 지표 통계를 실시간으로 일목요연하게 제공합니다.
                </p>
              </div>

              <SpreadsheetSummary
                columns={columns}
                rows={rows}
                isGoogleConnected={isGoogleConnected}
                spreadsheetId={spreadsheetId}
                sheetName={sheetName}
                onFilterClick={(val) => {
                  setTableSearchTerm(val);
                  setActiveTab('editor');
                  showToast('success', `"${val}" 필터 조건이 실시간 명부 테이블에 필터링되었습니다.`);
                }}
              />
            </div>
          )}

          {/* Screen 3. Data Editing Dashboard */}
          {activeTab === 'editor' && (
            <div id="content-dashboard" className="space-y-6">
              
              {/* Workspace Header information */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="text-left">
                  <h3 className="font-extrabold text-xl sm:text-2xl text-gray-900 font-display flex items-center gap-1.5">
                    {isGoogleConnected ? (
                      <>
                        <Layers className="w-5 h-5 text-green-600 animate-pulse" />
                        <span>토지소유자 목록 및 명부 관리</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        <span>토지소유자 명부 플레이그라운드</span>
                      </>
                    )}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-2xl mt-1">
                    현재 로컬 보드에 담긴 레코드는 총 <strong>{rows.length}개</strong>입니다. 리스트에서 수정하고 싶으신 행 데이터를 클릭하여 자유롭게 세로 가로 정보를 편집할 수 있습니다.
                  </p>
                </div>
              </div>

              {/* Main Table component */}
              <SpreadsheetTable
                columns={columns}
                rows={rows}
                onEditRow={handleOpenEditRow}
                onDeleteRow={handleDeleteRow}
                onAddRow={handleOpenAddRow}
                isSyncing={isSyncing}
                onSync={handleSyncToGoogle}
                isDirty={isDirty}
                hasGoogleAccess={isGoogleConnected}
                searchTerm={tableSearchTerm}
                onSearchTermChange={setTableSearchTerm}
                onCellEdit={handleUpdateCell}
              />
            </div>
          )}



        </section>

      </main>

      {/* Row Edit/Add Form Modal */}
      <AnimatePresence>
        {isRowModalOpen && (
          <RowEditModal
            isOpen={isRowModalOpen}
            columns={columns}
            initialValues={editingRowIdx !== null ? rows[editingRowIdx] : null}
            onClose={() => setIsRowModalOpen(false)}
            onSave={handleSaveRowData}
          />
        )}
      </AnimatePresence>

      <footer className="mt-auto py-6 bg-white border-t border-gray-150 text-center">
        <p className="text-xs text-gray-500 font-mono">
          © 2026 SoonDoong Company
        </p>
      </footer>
    </div>
  );
}
