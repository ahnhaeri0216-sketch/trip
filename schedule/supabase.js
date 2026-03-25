// Supabase 클라이언트 초기화 코드
// index.html에서 Supabase JS SDK CDN 로드 이후에 포함됩니다.

const SUPABASE_URL = 'https://fxxvgatkilmfwsvnxwlq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4eHZnYXRraWxtZndzdm54d2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MTMyODksImV4cCI6MjA4OTk4OTI4OX0.VsG6Fj4bPiRHiMdfvDt09PKiY9N6bOJRRDN5fHicTyg';

// 전역 Supabase 클라이언트 객체
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 현재 로그인한 유저 상태 변수
window.currentUser = null;

// 인증 상태 변화 감지 리스너
window.supabaseClient.auth.onAuthStateChange((event, session) => {
  console.log('🔗 Supabase Auth Event:', event, session);
  if (session?.user) {
    window.currentUser = session.user;
  } else {
    window.currentUser = null;
  }
  // 전역 함수(app.js 등) 호출하여 UI 업데이트
  if (typeof updateAuthUI === 'function') {
    updateAuthUI();
  }
});
