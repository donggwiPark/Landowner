import React, { useState, useEffect } from 'react';
import { KakaoUserProfile } from '../types';
import { LogIn, LogOut, ShieldAlert, CheckCircle2, User } from 'lucide-react';

interface KakaoLoginBtnProps {
  user: KakaoUserProfile | null;
  onLogin: (profile: KakaoUserProfile) => void;
  onLogout: () => void;
}

export default function KakaoLoginBtn({ user, onLogin, onLogout }: KakaoLoginBtnProps) {
  const [isRealConfigured, setIsRealConfigured] = useState<boolean>(false);
  const [showSandboxModal, setShowSandboxModal] = useState<boolean>(false);
  const [simulatedName, setSimulatedName] = useState<string>('어피치');
  const [simulatedEmail, setSimulatedEmail] = useState<string>('apeach@kakao.com');
  const [simulatedProfile, setSimulatedProfile] = useState<string>('https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Checks server config
  useEffect(() => {
    async function checkConfig() {
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const config = await response.json();
          setIsRealConfigured(config.useRealKakao);
        }
      } catch (err) {
        console.warn('Failed to verify Kakao server config, fallback to Sandbox:', err);
      }
    }
    checkConfig();
  }, []);

  // Listen for success or failure message from popup window
  useEffect(() => {
    const handleKakaoMessage = (event: MessageEvent) => {
      const origin = event.origin;
      // Safeguard check for safety
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }

      if (event.data?.type === 'KAKAO_AUTH_SUCCESS') {
        const { nickname, profileImage, email } = event.data;
        const profile: KakaoUserProfile = {
          nickname: decodeURIComponent(nickname || 'Kakao User'),
          profileImage: profileImage ? decodeURIComponent(profileImage) : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
          email: email ? decodeURIComponent(email) : '',
          isSimulated: false,
          loggedInAt: new Date().toLocaleString('ko-KR')
        };
        onLogin(profile);
      } else if (event.data?.type === 'KAKAO_AUTH_FAILURE') {
        const errorMsg = event.data.error;
        alert(`카카오 로그인에 실패하였습니다: ${decodeURIComponent(errorMsg || '알 수 없는 오류')}`);
      }
    };

    window.addEventListener('message', handleKakaoMessage);
    return () => window.removeEventListener('message', handleKakaoMessage);
  }, [onLogin]);

  const handleKakaoLoginClick = async () => {
    if (isRealConfigured) {
      setIsLoading(true);
      try {
        const res = await fetch('/api/auth/kakao/url');
        if (res.ok) {
          const { url } = await res.json();
          
          // Open in a popup window to bypass iframe restriction (X-Frame-Options: SAMEORIGIN)
          const width = 600;
          const height = 700;
          const left = window.screen.width / 2 - width / 2;
          const top = window.screen.height / 2 - height / 2;
          
          const popup = window.open(
            url,
            'kakao_oauth',
            `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no,location=yes,resizable=yes`
          );
          
          if (!popup) {
            alert('팝업 차단이 작동 중입니다. 카카오 로그인을 승인하려면 브라우저의 팝업 차단을 해제해 주세요.');
          }
        } else {
          throw new Error('서버로부터 카카오 로그인 url을 받아오는 데 실패했습니다.');
        }
      } catch (err: any) {
        alert(`실제 카카오 로그인 실패: ${err.message || err}\n샌드박스 가상 인증 모드로 실행합니다.`);
        setShowSandboxModal(true);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Show custom beautiful Sandbox authentication popup
      setShowSandboxModal(true);
    }
  };

  const handleSandboxLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sandboxUser: KakaoUserProfile = {
      nickname: simulatedName.trim() || '카카오 사용자',
      email: simulatedEmail.trim() || 'user@kakao.com',
      profileImage: simulatedProfile,
      isSimulated: true,
      loggedInAt: new Date().toLocaleString('ko-KR')
    };
    onLogin(sandboxUser);
    setShowSandboxModal(false);
  };

  const selectPredefinedSandboxUser = (name: string, email: string, img: string) => {
    setSimulatedName(name);
    setSimulatedEmail(email);
    setSimulatedProfile(img);
  };

  return (
    <div id="kakao-login-container" className="flex items-center gap-3">
      {user ? (
        <div id="kakao-logged-in-box" className="flex items-center gap-3 bg-transparent border-0 p-0 pr-0 sm:bg-gray-50 sm:border sm:border-gray-200 sm:rounded-xl sm:p-2.5 sm:pr-4 animate-fade-in">
          <img
            id="kakao-user-avatar"
            src={user.profileImage}
            alt={user.nickname}
            title={`${user.nickname} (클릭 시 로그아웃)`}
            onClick={onLogout}
            className="w-10 h-10 rounded-full border-2 border-amber-300 object-cover cursor-pointer hover:scale-105 active:scale-95 duration-150 transition-transform"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // fallback if profile image fails
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';
            }}
          />
          <div id="kakao-user-metadata" className="text-left hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-gray-800 font-display">{user.nickname}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                user.isSimulated 
                  ? 'bg-amber-100 text-amber-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {user.isSimulated ? '샌드박스' : 'K-OAuth'}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-mono">{user.email || '이메일 없음'}</p>
          </div>
          <button
            id="kakao-logout-btn"
            onClick={onLogout}
            title="로그아웃"
            className="ml-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-150 hidden sm:block"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div id="kakao-login-action-box" className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
          <button
            id="kakao-login-btn-interactive"
            onClick={handleKakaoLoginClick}
            disabled={isLoading}
            className="btn-kakao font-sans font-bold text-sm px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow active:scale-95 transition-transform"
          >
            <LogIn className="w-4 h-4 text-kakao-dark" />
            <span className="text-kakao-dark font-medium">카카오 계정으로 로그인</span>
          </button>

          {!isRealConfigured && (
            <div id="kakao-simulated-indicator" className="flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-200/50 px-3 py-1.5 rounded-lg text-xs">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>샌드박스 모드 작동 중 (.env 미설정)</span>
            </div>
          )}
        </div>
      )}

      {/* Sandbox Login Modal Mocking Kakao Authorization */}
      {showSandboxModal && (
        <div id="sandbox-modal-backdrop" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div id="sandbox-modal-card" className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-gray-100">
            {/* Header: Mimicking Kakao OAuth */}
            <div className="bg-[#FEE500] p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-[#191919] text-[#FEE500] p-1.5 rounded-xl font-black text-xs font-mono">
                  talk
                </div>
                <h3 className="font-bold text-lg text-gray-900 font-display">Kakao 로그인 동의</h3>
              </div>
              <button 
                onClick={() => setShowSandboxModal(false)}
                className="text-gray-700 hover:text-gray-950 hover:bg-yellow-400 p-1.5 rounded-full text-sm font-semibold transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                현재 `.env` 파일에 발급 받은 `KAKAO_CLIENT_ID` (REST API 키)가 감지되지 않아 <strong>샌드박스(시뮬레이션) 연동 모드</strong>로 시작합니다. 아래에서 가상의 카카오 대표 캐릭터나 커스텀 데이터를 선택하여 즉시 로그인할 수 있습니다.
              </p>

              {/* Character Presets */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-700 mb-2">대표 프로필 빠른 선택</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => selectPredefinedSandboxUser('어피치 (Apeach)', 'apeach@kakao.com', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150')}
                    className={`p-2 border rounded-xl flex flex-col items-center gap-1 transition text-xs ${
                      simulatedName.includes('어피치') ? 'border-amber-400 bg-amber-50/50 text-amber-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150" className="w-8 h-8 rounded-full object-cover" />
                    <span>어피치</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => selectPredefinedSandboxUser('라이언 (Ryan)', 'ryan@kakao.com', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150')}
                    className={`p-2 border rounded-xl flex flex-col items-center gap-1 transition text-xs ${
                      simulatedName.includes('라이언') ? 'border-amber-400 bg-amber-50/50 text-amber-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150" className="w-8 h-8 rounded-full object-cover" />
                    <span>라이언</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => selectPredefinedSandboxUser('네오 (Neo)', 'neo@kakao.com', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150')}
                    className={`p-2 border rounded-xl flex flex-col items-center gap-1 transition text-xs ${
                      simulatedName.includes('네오') ? 'border-amber-400 bg-amber-50/50 text-amber-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150" className="w-8 h-8 rounded-full object-cover" />
                    <span>네오</span>
                  </button>
                </div>
              </div>

              {/* Input Form */}
              <form onSubmit={handleSandboxLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">닉네임</label>
                  <input
                    type="text"
                    required
                    value={simulatedName}
                    onChange={(e) => setSimulatedName(e.target.value)}
                    className="w-full text-sm px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-400 bg-gray-50/30"
                    placeholder="이름 입력"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">이메일 주소</label>
                  <input
                    type="email"
                    required
                    value={simulatedEmail}
                    onChange={(e) => setSimulatedEmail(e.target.value)}
                    className="w-full text-sm px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-400 bg-gray-50/30"
                    placeholder="example@kakao.com"
                  />
                </div>

                <div className="bg-gray-50 p-3.5 rounded-xl space-y-2 border border-gray-100">
                  <div className="flex items-start gap-2.5">
                    <input type="checkbox" defaultChecked disabled className="mt-1 rounded border-gray-300 text-amber-500 focus:ring-amber-400" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">[필수] 프로필 정보 제공 동의</p>
                      <p className="text-[11px] text-gray-400">닉네임, 프로필 사진조회 권한을 부여합니다.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <input type="checkbox" defaultChecked disabled className="mt-1 rounded border-gray-300 text-amber-500 focus:ring-amber-400" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">[필수] 카카오 계정 이메일 연동</p>
                      <p className="text-[11px] text-gray-400">가입된 이메일 계정 연동 권한을 부여합니다.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSandboxModal(false)}
                    className="flex-1 text-sm font-medium border border-gray-200 text-gray-600 py-2.5 rounded-xl hover:bg-gray-50 active:scale-95 transition"
                  >
                    아니오
                  </button>
                  <button
                    type="submit"
                    className="flex-1 text-sm font-bold bg-[#FEE500] text-gray-900 py-2.5 rounded-xl hover:bg-[#FBE100] active:scale-95 transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-gray-950" />
                    동의하고 시작하기
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
