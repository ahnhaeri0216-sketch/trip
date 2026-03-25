/* ══════════════════════════════════════
   TripAI — Schedule Planner
   Google Maps + Gemini AI 기반
══════════════════════════════════════ */

/* ── Category metadata ── */
const CAT_COLOR = {
  '관광': 'var(--cat-sight)',
  '맛집': 'var(--cat-food)',
  '카페': 'var(--cat-cafe)',
  '쇼핑': 'var(--cat-shop)',
  '휴식': 'var(--cat-rest)',
};
const CAT_TEXT = { '관광':'#fff','맛집':'#fff','카페':'#333','쇼핑':'#fff','휴식':'#333' };
const CAT_EMOJI = { '관광':'🏛️','맛집':'🍽️','카페':'☕','쇼핑':'🛍️','휴식':'🌿' };

/* ── Time slots ── */
const TIMES = [];
for (let h = 8; h <= 21; h++) {
  TIMES.push(`${String(h).padStart(2,'0')}:00`);
  TIMES.push(`${String(h).padStart(2,'0')}:30`);
}
TIMES.push('22:00');

/* ── State ── */
const st = {
  dest:       '',
  destPlaceId:'',
  destLatLng: null,    // { lat, lng }
  theme:      '',
  dayCount:   3,
  mapsApiKey: 'AIzaSyDWvBKutIbpFhSykrmD5w3870p_Ix_hdVw',
  geminiApiKey: 'serverless', // Vercel 서버리스 함수 사용 (프론트엔드 키 불필요)
  activeCats: new Set(['관광','맛집','카페','쇼핑','휴식']),
  schedule:   {},      // { day: { slotTime: placeObj } }
  places:     [],      // AI 추천 place blocks
  userPlaces: [],      // 사용자가 직접 추가한 blocks
  pendingOpt: [],
  googleMap:  null,    // Google Maps instance
  mapMarkers: [],      // active markers on map
  mapPolyline:null,
  mapInfoWindows: [],
  autocomplete: null,
  mapsLoaded: false,
  previewMarkers:  [], // AI 미리보기 마커
  previewPolyline: null,
};

/* ── Utils ── */
let _tt;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(_tt); _tt = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ══ Auth ══ */
function openLoginModal() {
  document.getElementById('login-modal').classList.add('open');
}
function closeLoginModal() {
  document.getElementById('login-modal').classList.remove('open');
}
async function signInWithGoogle() {
  try {
    const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });
    if (error) throw error;
  } catch (err) {
    console.error('Google 로그인 에러:', err);
    toast('로그인 중 오류가 발생했습니다.');
  }
}
async function signInWithKakao() {
  try {
    const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });
    if (error) throw error;
  } catch (err) {
    console.error('Kakao 로그인 에러:', err);
    toast('카카오 로그인 중 오류가 발생했습니다.');
  }
}
async function signOut() {
  try {
    const { error } = await window.supabaseClient.auth.signOut();
    if (error) throw error;
    toast('로그아웃 되었습니다.');
    // 현재 화면이 프로젝트 목록이면 새로고침
    if (document.getElementById('projects-screen').style.display !== 'none') {
      await loadProjects();
    }
  } catch (err) {
    console.error('로그아웃 에러:', err);
  }
}

// supabase.js에서 상태 변경 시 호출되는 UI 업데이트 함수
window.updateAuthUI = function() {
  const user = window.currentUser;
  
  // Projects 화면과 Main 화면의 Auth UI 영역 동시 업데이트
  const authUIs = document.querySelectorAll('.auth-ui');
  
  authUIs.forEach(el => {
    if (user) {
      const avatar = user.user_metadata?.avatar_url || '';
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      el.innerHTML = `
        <div class="user-profile" style="display:flex;align-items:center;gap:8px;">
          ${avatar ? `<img src="${avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">` : `<div style="width:28px;height:28px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold">${name[0]}</div>`}
          <span style="font-size:14px;font-weight:600">${name}</span>
          <button class="btn-ghost" style="padding:4px 8px;font-size:12px;" onclick="signOut()">로그아웃</button>
        </div>
      `;
    } else {
      el.innerHTML = `<button class="btn-ghost auth-login-btn" onclick="openLoginModal()">로그인</button>`;
    }
  });

  // 로그인 모달 닫기
  if (user) {
    closeLoginModal();
    // 로컬 데이터를 클라우드로 자동 마이그레이션 (백그라운드)
    migrateLocalProjectsToCloud();
  }
};

/* ══ API Key Modals ══ */
function openMapsKeyModal() {
  document.getElementById('maps-modal').classList.add('open');
  document.getElementById('maps-key-input').value = st.mapsApiKey;
}
function closeMapsKeyModal() { document.getElementById('maps-modal').classList.remove('open'); }
function saveMapsKey() {
  const v = document.getElementById('maps-key-input').value.trim();
  if (!v) { toast('Google Maps API Key를 입력하세요'); return; }
  st.mapsApiKey = v;
  localStorage.setItem('tripai_maps_key', v);
  closeMapsKeyModal();
  updateKeyStatuses();
  toast('✅ Maps API Key 저장됨');
  // load Google Maps API
  loadGoogleMapsAPI();
}
function openGeminiKeyModal() {
  document.getElementById('gemini-modal').classList.add('open');
  document.getElementById('gemini-key-input').value = st.geminiApiKey;
}
function closeGeminiKeyModal() { document.getElementById('gemini-modal').classList.remove('open'); }
function saveGeminiKey() {
  const v = document.getElementById('gemini-key-input').value.trim();
  if (!v) { toast('Gemini API Key를 입력하세요'); return; }
  st.geminiApiKey = v;
  localStorage.setItem('tripai_key', v);
  closeGeminiKeyModal();
  updateKeyStatuses();
  toast('✅ Gemini Key 저장됨');
}

function updateKeyStatuses() {
  const mapsEl   = document.getElementById('maps-key-status');
  const geminiEl = document.getElementById('gemini-key-status');
  if (mapsEl)   { mapsEl.style.color   = st.mapsApiKey    ? 'var(--mint)' : 'var(--dim)'; }
  if (geminiEl) { geminiEl.style.color = st.geminiApiKey  ? 'var(--mint)' : 'var(--dim)'; }
}

/* ══ Google Maps API 동적 로드 ══ */
function loadGoogleMapsAPI() {
  if (!st.mapsApiKey || st.mapsLoaded) return;
  if (document.getElementById('gmaps-script')) return;

  const script = document.createElement('script');
  script.id = 'gmaps-script';
  // v=weekly로 신규 Places API (New) 사용
  script.src = `https://maps.googleapis.com/maps/api/js?key=${st.mapsApiKey}&libraries=places,marker&v=weekly&callback=onGoogleMapsLoaded&loading=async`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

window.onGoogleMapsLoaded = function() {
  st.mapsLoaded = true;
  toast('🗺️ Google Maps 로드 완료');

  // 새 PlaceAutocompleteElement (Places API New) 사용
  try {
    const destSection = document.getElementById('dest-input').parentElement;
    const oldInput    = document.getElementById('dest-input');

    // PlaceAutocompleteElement 생성
    const placeAuto = new google.maps.places.PlaceAutocompleteElement({
      types: ['(cities)'],
    });
    placeAuto.id            = 'place-autocomplete-el';
    placeAuto.style.width   = '100%';
    placeAuto.style.display = 'block';

    // 기존 input 숨기고 새 요소 삽입
    oldInput.style.display = 'none';
    destSection.insertBefore(placeAuto, oldInput);

    // 장소 선택 이벤트
    placeAuto.addEventListener('gmp-placeselect', async ({ place }) => {
      try {
        await place.fetchFields({ fields: ['location', 'displayName', 'formattedAddress', 'id'] });
        st.dest       = place.displayName?.text || '';
        st.destCity   = place.displayName?.text || ''; // 도시명만 별도 저장
        st.destPlaceId= place.id || '';
        st.destLatLng = {
          lat: place.location.lat(),
          lng: place.location.lng(),
        };
        const badge = document.getElementById('place-info-badge');
        if (badge) {
          badge.style.display = 'flex';
          badge.textContent   = `📍 ${place.formattedAddress || st.dest}`;
        }
      } catch(e) { console.warn('place fetchFields failed', e); }
    });

    st.autocompleteEl = placeAuto;
  } catch(e) {
    // 폴백: 기존 input 복원
    console.warn('PlaceAutocompleteElement init failed, showing plain input', e);
    const oldInput = document.getElementById('dest-input');
    if (oldInput) oldInput.style.display = '';
  }

  // ── 호텔 PlaceAutocompleteElement (Step 4)
  try {
    const hotelWrap = document.getElementById('hotel-input-wrap');
    const oldHotel  = document.getElementById('hotel-input');
    if (hotelWrap && oldHotel) {
      const hotelAuto = new google.maps.places.PlaceAutocompleteElement({
        types: ['lodging', 'establishment'],
      });
      hotelAuto.id            = 'hotel-autocomplete-el';
      hotelAuto.style.width   = '100%';
      hotelAuto.style.display = 'block';
      oldHotel.style.display  = 'none';
      hotelWrap.insertBefore(hotelAuto, oldHotel);

      // 타이핑 값을 plain input에 미러링 (shadow DOM input은 직접 못 읽으므로)
      // MutationObserver로 shadow root의 input을 감시
      const mirrorTyping = () => {
        const shadowInput = hotelAuto.shadowRoot?.querySelector('input');
        if (shadowInput) {
          shadowInput.addEventListener('input', () => {
            oldHotel.value = shadowInput.value;
          });
        } else {
          // shadow root가 아직 없으면 잠시 후 재시도
          setTimeout(mirrorTyping, 200);
        }
      };
      setTimeout(mirrorTyping, 300);

      // Places 선택 시 정확한 정보 저장
      hotelAuto.addEventListener('gmp-placeselect', async ({ place }) => {
        try {
          await place.fetchFields({ fields: ['location', 'displayName', 'formattedAddress'] });
          st.hotel        = place.displayName?.text || '';
          st.hotelAddress = place.formattedAddress || '';
          st.hotelLatLng  = { lat: place.location.lat(), lng: place.location.lng() };
          oldHotel.value  = st.hotel; // plain input도 동기화
          const badge = document.getElementById('hotel-badge');
          if (badge) { badge.style.display = 'flex'; badge.textContent = `📍 ${st.hotelAddress}`; }
        } catch(e) { console.warn('hotel place fetch failed', e); }
      });
    }
  } catch(e) {
    console.warn('Hotel autocomplete init failed', e);
    const oldHotel = document.getElementById('hotel-input');
    if (oldHotel) oldHotel.style.display = '';
  }

  // Maps 로드 완료 → 지도 즉시 초기화
  if (document.getElementById('main-screen')?.classList.contains('visible')) {
    renderGoogleMap();
    // 이미 Gemini 장소가 있으면 즉시 Geocoding
    if (st.places.length > 0) geocodeAllPlaces();
  }
};


/* ══ Setup ══ */
function pickTheme(chip) {
  document.querySelectorAll('.theme-chip').forEach(c => c.classList.remove('on'));
  chip.classList.add('on');
  st.theme = chip.dataset.v;
  const custom = document.getElementById('custom-theme');
  if (st.theme === 'custom') custom.classList.add('visible');
  else custom.classList.remove('visible');
}

/* ══ Multi-step setup ══ */
let _currentStep = 1;
const TOTAL_STEPS = 5;
st.airport = ''; // 선택한 공항
st.hotel   = ''; // 숙소

function _gotoStep(n) {
  document.getElementById(`step-${_currentStep}`)?.classList.remove('active');
  _currentStep = n;
  document.getElementById(`step-${n}`)?.classList.add('active');
  document.getElementById('setup-step-indicator').textContent = `${n} / ${TOTAL_STEPS}`;
  document.getElementById('setup-progress-bar').style.width = `${(n / TOTAL_STEPS) * 100}%`;
}

function stepNext(from) {
  if (from === 1) {
    // 목적지 확인
    const dest = st.dest || st.autocompleteEl?.value?.trim() || document.getElementById('dest-input').value.trim();
    if (!dest) { toast('여행지를 입력해주세요'); return; }
    if (!st.dest) st.dest = dest;
    _populateAirportChips();   // 2단계 공항 칩 생성
    _gotoStep(2);
  } else if (from === 2) {
    // 공항: 선택 or 직접 입력 (선택사항이므로 바로 통과)
    const custom = document.getElementById('airport-custom').value.trim();
    if (custom && !st.airport) st.airport = custom;
    _gotoStep(3);
  } else if (from === 3) {
    const dep = document.getElementById('dep-date').value;
    const ret = document.getElementById('ret-date').value;
    if (!dep || !ret) { toast('여행 날짜를 선택해주세요'); return; }
    const nights = Math.round((new Date(ret) - new Date(dep)) / 86400000);
    if (nights < 1) { toast('귀국일이 출발일보다 빨라요'); return; }
    _gotoStep(4);
  } else if (from === 4) {
    // autocomplete element → st.hotel (gmp-placeselect로 이미 설정됨) → autocomplete 직접값 → plain input 순서로 fallback
    const hotelAuto = document.getElementById('hotel-autocomplete-el');
    const hotelPlain = document.getElementById('hotel-input');
    const hotelVal = st.hotel
      || hotelAuto?.value?.trim()
      || hotelPlain?.value?.trim()
      || '';
    if (hotelVal) st.hotel = hotelVal;
    _gotoStep(5);
  }
}

function stepBack(from) {
  _gotoStep(from - 1);
}

/* 목적지 기반 근처 공항 칩 생성 */
async function _populateAirportChips() {
  const container = document.getElementById('airport-chips');
  container.innerHTML = '<div class="airport-chip-loading">✈️ 주변 공항을 검색 중...</div>';

  // 하드코딩 DB (한국 출발 주요 노선)
  const AIRPORT_DB = {
    '도쿄': [{ iata:'NRT', name:'나리타 국제공항', sub:'도쿄 나리타' }, { iata:'HND', name:'하네다 국제공항', sub:'도쿄 하네다' }],
    '오사카': [{ iata:'KIX', name:'간사이 국제공항', sub:'오사카 간사이' }],
    '파리': [{ iata:'CDG', name:'샤를 드 골 공항', sub:'파리 CDG' }, { iata:'ORY', name:'오를리 공항', sub:'파리 오를리' }],
    '런던': [{ iata:'LHR', name:'히스로 공항', sub:'런던 히스로' }, { iata:'LGW', name:'개트윅 공항', sub:'런던 개트윅' }],
    '바르셀로나': [{ iata:'BCN', name:'엘프라트 공항', sub:'바르셀로나' }],
    '뉴욕': [{ iata:'JFK', name:'존 F. 케네디 공항', sub:'뉴욕 JFK' }, { iata:'EWR', name:'뉴어크 공항', sub:'뉴욕 인근' }],
    '방콕': [{ iata:'BKK', name:'수완나품 공항', sub:'방콕 수완나품' }, { iata:'DMK', name:'돈므앙 공항', sub:'방콕 돈므앙' }],
    '싱가포르': [{ iata:'SIN', name:'창이 공항', sub:'싱가포르 창이' }],
    '홍콩': [{ iata:'HKG', name:'첵랍콕 공항', sub:'홍콩 국제공항' }],
    '마드리드': [{ iata:'MAD', name:'아돌포 수아레스 공항', sub:'마드리드 바라하스' }],
    '로마': [{ iata:'FCO', name:'피우미치노 공항', sub:'로마 피우미치노' }],
    '베이징': [{ iata:'PEK', name:'수도 국제공항', sub:'베이징 PEK' }],
    '상하이': [{ iata:'PVG', name:'푸동 국제공항', sub:'상하이 푸동' }],
    '시드니': [{ iata:'SYD', name:'킹스포드 스미스 공항', sub:'시드니' }],
    '두바이': [{ iata:'DXB', name:'두바이 국제공항', sub:'두바이 DXB' }],
  };

  const destKey = Object.keys(AIRPORT_DB).find(k => (st.dest || '').includes(k));
  const airports = destKey ? AIRPORT_DB[destKey] : [];

  if (!airports.length) {
    container.innerHTML = `<div class="airport-chip-loading">주변 공항을 찾지 못했어요.<br>아래에 직접 입력해주세요.</div>`;
    return;
  }

  container.innerHTML = airports.map((a, i) => `
    <div class="airport-chip${i === 0 ? ' on' : ''}" onclick="pickAirport(this,'${a.iata}')" data-iata="${a.iata}">
      <div class="airport-chip-iata">${a.iata}</div>
      <div class="airport-chip-info">
        <div class="airport-chip-name">${a.name}</div>
        <div class="airport-chip-sub">${a.sub}</div>
      </div>
    </div>`).join('');

  if (airports.length) st.airport = airports[0].iata;
}

function pickAirport(el, iata) {
  document.querySelectorAll('.airport-chip').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  st.airport = iata;
  document.getElementById('airport-custom').value = '';
}

function onDateChange() {
  const dep = document.getElementById('dep-date').value;
  const ret = document.getElementById('ret-date').value;
  if (!dep || !ret) return;
  const nights = Math.round((new Date(ret) - new Date(dep)) / 86400000);
  if (nights < 1) { toast('귀국일이 출발일보다 빨라요'); return; }
  document.getElementById('date-nights').textContent = nights;
  const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  document.getElementById('date-summary').textContent = `${fmt(dep)} 출발 → ${fmt(ret)} 귀국 · ${nights}박 ${nights + 1}일`;
}

async function startPlanning() {
  try {
    const dest = st.dest
      || st.autocompleteEl?.value?.trim()
      || document.getElementById('dest-input').value.trim();
    if (!dest) { toast('여행지를 입력해주세요'); return; }
    if (!st.dest) st.dest = dest;

    // theme: pickTheme이 없을 경우 .on 칩에서 직접 읽기
    if (!st.theme) {
      const onChip = document.querySelector('.theme-chip.on');
      if (onChip) st.theme = onChip.dataset.v;
    }
    if (!st.theme) { toast('여행 스타일을 선택해주세요'); return; }
    if (st.theme === 'custom') {
      const cv = document.getElementById('custom-theme').value.trim();
      if (!cv) { toast('테마를 직접 입력해주세요'); return; }
      st.theme = cv;
    }

    const dep = document.getElementById('dep-date').value;
    const ret = document.getElementById('ret-date').value;
    if (!dep || !ret) { toast('여행 날짜를 선택해주세요'); return; }
    const nights = Math.round((new Date(ret) - new Date(dep)) / 86400000);
    if (nights < 1) { toast('귀국일이 출발일보다 빨라요'); return; }

    st.dest     = dest;
    st.dayCount = nights;

    // 호텔 최종 확인 (stepNext(4)에서 못 잡은 경우 방어)
    if (!st.hotel) {
      const ha = document.getElementById('hotel-autocomplete-el');
      const hi = document.getElementById('hotel-input');
      st.hotel = ha?.value?.trim() || hi?.value?.trim() || '';
    }

    const depTime = document.getElementById('dep-time')?.value || '';
    const retTime = document.getElementById('ret-time')?.value || '';

    localStorage.setItem('tripai_schedule', JSON.stringify({
      dest: st.dest, theme: st.theme, days: st.dayCount,
      activities: [...st.activeCats],
    }));
    localStorage.setItem('tripai_flight', JSON.stringify({
      dest: st.dest, depDate: dep, retDate: ret, nights: st.dayCount,
      depTime, retTime, airport: st.airport, hotel: st.hotel, weather: 'mild',
    }));

    st.schedule = {};
    for (let d = 1; d <= st.dayCount; d++) st.schedule[d] = {};
    st.places    = [];
    st.userPlaces = st.userPlaces.filter(p => p._fixed);

    applyDefaultBlocks({ depTime, retTime });

    if (st.mapsLoaded && !st.destLatLng) {
      await new Promise(resolve => {
        new google.maps.Geocoder().geocode({ address: dest }, (results, status) => {
          if (status === 'OK' && results[0]) {
            st.destLatLng = {
              lat: results[0].geometry.location.lat(),
              lng: results[0].geometry.location.lng(),
            };
          }
          resolve();
        });
      });
    }

    buildMainScreen();
    renderBlocks(); // 공항·호텔 userPlaces 즉시 표시
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('main-screen').classList.add('visible');
    history.pushState({ screen: 'main' }, '');

    await fetchGeminiPlaces();
    saveCurrentProject(); // 완료 시 자동 저장
  } catch(err) {
    console.error('[startPlanning]', err);
    toast(`⚠️ 오류: ${err.message}`);
  }
}


/* ══ 기본 포함 블록 자동 배치 ══ */
function applyDefaultBlocks({ depTime = '', retTime = '' } = {}) {
  const N = st.dayCount;
  if (N < 1) return;

  const snapTime = t => {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    const snapped = m < 30 ? `${String(h).padStart(2,'0')}:00` : `${String(h).padStart(2,'0')}:30`;
    return TIMES.includes(snapped) ? snapped : null;
  };
  const clamp = t => (t && TIMES.includes(t)) ? t : null;

  const addToSchedule = (slot, d, obj) => {
    if (!slot || st.schedule[d]?.[slot]) return;
    st.schedule[d][slot] = obj;
  };

  /* ── 공항 블록 ── */
  if (st.airport) {
    const airportName = st.airport;
    const airportBase = {
      cat: '관광', emoji: '✈️', meta: '공항', dur: 1,
      lat: null, lng: null, _fixed: true, _type: 'airport',
    };

    const depBlock = { ...airportBase, id: 'airport-dep', name: `${airportName} 출발` };
    const retBlock = { ...airportBase, id: 'airport-ret', name: `${airportName} 도착`, emoji: '🛬' };

    addToSchedule(clamp(snapTime(depTime)) || '08:00', 1, depBlock);
    addToSchedule(clamp(snapTime(retTime)) || '20:00', N, retBlock);

    // 왼쪽 패널에 공항 사용자 블록 추가
    const airportUserBlock = {
      ...airportBase,
      id: 'airport-user',
      name: `${airportName} 공항`,
      meta: '공항',
      rating: null,
    };
    if (!st.userPlaces.find(p => p.id === 'airport-user')) {
      st.userPlaces.unshift(airportUserBlock);
    }

    // Google Maps가 로드됐으면 공항 좌표 Geocoding
    if (st.mapsLoaded && window.google?.maps) {
      new google.maps.Geocoder().geocode(
        { address: `${airportName} airport` },
        (results, status) => {
          if (status === 'OK' && results[0]) {
            const loc = results[0].geometry.location;
            airportUserBlock.lat = loc.lat();
            airportUserBlock.lng = loc.lng();
            depBlock.lat = loc.lat(); depBlock.lng = loc.lng();
            retBlock.lat = loc.lat(); retBlock.lng = loc.lng();
          }
        }
      );
    }
  }

  /* ── 호텔 블록 ── */
  if (st.hotel) {
    const lat = st.hotelLatLng?.lat || null;
    const lng = st.hotelLatLng?.lng || null;
    const hotelBase = {
      cat: '휴식', emoji: '🏨', meta: '숙소', dur: 1,
      lat, lng, _fixed: true, _type: 'hotel',
    };

    addToSchedule('15:00', 1, { ...hotelBase, id: 'hotel-checkin', name: `${st.hotel} 체크인` });
    for (let d = 2; d < N; d++) {
      addToSchedule('09:00', d, { ...hotelBase, id: `hotel-base-${d}`, name: st.hotel });
    }
    if (N > 1) {
      addToSchedule('11:00', N, { ...hotelBase, id: 'hotel-checkout', name: `${st.hotel} 체크아웃` });
    }

    // 왼쪽 패널에 호텔 사용자 블록 추가
    const hotelUserBlock = {
      ...hotelBase,
      id: 'hotel-user',
      name: st.hotel,
      meta: st.hotelAddress || '숙소',
      rating: null,
    };
    if (!st.userPlaces.find(p => p.id === 'hotel-user')) {
      st.userPlaces.unshift(hotelUserBlock);
    }

    // 호텔 좌표가 없으면 Geocoding으로 확보
    if (!lat && st.mapsLoaded && window.google?.maps) {
      new google.maps.Geocoder().geocode(
        { address: st.hotel },
        (results, status) => {
          if (status === 'OK' && results[0]) {
            const loc = results[0].geometry.location;
            hotelUserBlock.lat = loc.lat();
            hotelUserBlock.lng = loc.lng();
            // schedule 블록들에도 좌표 주입
            for (let d = 1; d <= N; d++) {
              Object.values(st.schedule[d] || {}).forEach(b => {
                if (b._type === 'hotel') { b.lat = loc.lat(); b.lng = loc.lng(); }
              });
            }
          }
        }
      );
    }
  }
}

/* 숙소 건너뛰기 */
function skipHotel() {
  st.hotel = '';
  st.hotelLatLng = null;
  const badge = document.getElementById('hotel-badge');
  if (badge) badge.style.display = 'none';
  _gotoStep(5);
}


function goSetup() {
  document.getElementById('setup-screen').style.display = '';
  document.getElementById('main-screen').classList.remove('visible');
  history.pushState({ screen: 'setup' }, '');
}

/* ══ Build main screen ══ */
function buildMainScreen() {
  document.getElementById('topbar-dest').textContent  = `✈ ${st.dest}`;
  document.getElementById('topbar-theme').textContent = `${st.theme} 테마`;
  renderMultiTimeline();
  initMapPanel();
  initDivider();
  // 톱바에 프로젝트 목록 버튼 삽입
  let backBtn = document.getElementById('topbar-projects-btn');
  if (!backBtn) {
    backBtn = document.createElement('button');
    backBtn.id = 'topbar-projects-btn';
    backBtn.className = 'topbar-projects-btn';
    backBtn.textContent = '← 목록';
    backBtn.onclick = goProjects;
    document.querySelector('.topbar')?.prepend(backBtn);
  }
  // 플로팅 AI 버튼 삽입 (타임라인 패널 우측 하단)
  let fab = document.getElementById('ai-fab');
  if (!fab) {
    fab = document.createElement('button');
    fab.id = 'ai-fab';
    fab.className = 'ai-fab';
    fab.innerHTML = '<div class="ai-dot"></div> 🧠 AI 최적화';
    fab.onclick = openAIPanel;
    document.getElementById('panels').appendChild(fab);
  }
}

/* ══ Gemini: 장소 추천 ══ */
async function fetchGeminiPlaces(retry = 0) {
  showBlocksLoading(true);

  // Gemini API는 서버리스 함수(/api/gemini)를 통해 호출하므로 프론트엔드 키 체크 불필요

  const categories = [...st.activeCats];
  const hotelContext = st.hotel ? `The traveler is staying at "${st.hotel}". Please try to recommend places that are reasonably accessible from this location, or consider it as a starting point.` : '';

  const prompt = `
You are a travel planning assistant. Recommend real, existing, famous places in ${st.dest} for a "${st.theme}" trip.
${hotelContext}
Return ONLY a JSON object, no other text.

For each place, provide:
- cat: one of [${categories.join(', ')}]
- name: official English name of the place (exactly as it appears on Google Maps)
- nameKo: Korean name of the place
- geocodeQuery: the best English search string to find this place on Google Maps (e.g. "Dotonbori Osaka" or "Osaka Castle")
- meta: short Korean description under 15 characters
- dur: recommended visit duration in hours (0.5 to 3)
- emoji: appropriate emoji

Return exactly ${categories.length * 3} places, ${3} per category.

{"places":[{"cat":"관광","name":"","nameKo":"","geocodeQuery":"","meta":"","dur":1.5,"emoji":""}]}
`;

  try {
    const res = await fetch(
      `/api/gemini`,
      { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ model: 'gemini-1.5-flash', contents:[{ parts:[{ text: prompt }] }] }) }
    );

    // 429 Too Many Requests → Maps 폴백 또는 재시도
    if (res.status === 429) {
      if (st.mapsLoaded && st.mapsApiKey) {
        showBlocksLoading(true, '⏳ Gemini 한도 초과 → Google Maps로 전환 중...');
        showBlocksLoading(false);
        return loadFallbackPlaces();
      }
      if (retry < 2) {
        const wait = (retry + 1) * 30;
        showBlocksLoading(true, `⏳ Gemini 호출 한도 초과 — ${wait}초 후 재시도...`);
        await new Promise(r => setTimeout(r, wait * 1000));
        return fetchGeminiPlaces(retry + 1);
      }
      renderBlocksEmpty('Gemini 한도 초과. 잠시 후 ↻ 버튼으로 재시도해주세요.');
      return;
    }

    const data = await res.json();
    const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const json = JSON.parse(raw.replace(/```json|```/g,'').trim());

    if (json.places && json.places.length > 0) {
      st.places = json.places.map((p, i) => ({
        id: `g${i}`,
        cat: p.cat,
        emoji: p.emoji || CAT_EMOJI[p.cat] || '📍',
        name: p.nameKo || p.name,
        nameEn: p.name,
        geocodeQuery: p.geocodeQuery || `${p.name} ${st.dest}`,
        meta: p.meta || '',
        dur: p.dur || 1,
        lat: null, lng: null, placeId: null, rating: null, photoUrl: null,
      }));
      renderBlocks();
      toast(`✨ ${st.dest} 장소 ${st.places.length}개 추천받았어요`);

      // 즉시 모든 장소 Geocoding (백그라운드)
      if (st.mapsApiKey && st.mapsLoaded) geocodeAllPlaces();
    } else {
      // Gemini 응답이 비어있으면 Maps 폴백
      if (st.mapsLoaded && st.mapsApiKey) return loadFallbackPlaces();
      renderBlocksEmpty(`${st.dest} 장소를 찾지 못했어요. 다시 시도해보세요.`);
    }
  } catch(e) {
    console.error('Gemini fetch error', e);
    // 오류 시 Maps 폴백
    if (st.mapsLoaded && st.mapsApiKey) return loadFallbackPlaces();
    renderBlocksEmpty('AI 추천 실패. ↻ 버튼으로 다시 시도해보세요.');

  } finally {
    showBlocksLoading(false);
  }
}

/* 모든 추천 장소를 백그라운드에서 즉시 Geocoding */
async function geocodeAllPlaces() {
  for (const place of st.places) {
    if (!place.lat || !place.lng) {
      await geocodePlace(place);
    }
  }
  toast('📍 지도 위치 준비 완료');
}



/* Places API (New)로 장소 데이터 보강 (위경도, 사진, 평점) */
async function enrichPlacesWithGoogleData() {
  if (!window.google?.maps?.places?.Place) return;

  for (const place of st.places) {
    try {
      const { places } = await google.maps.places.Place.searchByText({
        textQuery: `${place.nameEn || place.name} ${st.dest}`,
        fields: ['location', 'id', 'rating', 'photos', 'formattedAddress'],
        maxResultCount: 1,
      });
      if (places?.length > 0) {
        const r = places[0];
        place.lat     = r.location?.lat() ?? null;
        place.lng     = r.location?.lng() ?? null;
        place.placeId = r.id || null;
        place.rating  = r.rating || null;
        place.address = r.formattedAddress || '';
        if (r.photos?.length > 0) {
          place.photoUrl = r.photos[0].getURI({ maxWidth: 120, maxHeight: 80 });
        }
      }
    } catch(e) { console.warn('enrichPlaces error', place.name, e); }
  }
  renderBlocks();
}

/* Google Maps Places API (New) - searchByText로 실제 장소 검색 */
async function loadFallbackPlaces() {
  if (!st.mapsLoaded || !window.google?.maps?.places?.Place) {
    renderBlocksEmpty('Google Maps가 아직 준비되지 않았어요. 잠시 후 ↻ 재시도해주세요.');
    return;
  }

  showBlocksLoading(true, '🗺️ Google Maps에서 장소를 검색 중...');

  const cityQuery = st.destCity || st.dest;

  // 카테고리별 검색어
  const catQueries = {
    '관광': `famous tourist landmarks in ${cityQuery}`,
    '맛집': `best local restaurants in ${cityQuery}`,
    '카페': `popular cafes in ${cityQuery}`,
    '쇼핑': `shopping street market in ${cityQuery}`,
    '휴식': `parks nature relaxation in ${cityQuery}`,
  };
  const catEmoji = { '관광':'🏛️', '맛집':'🍽️', '카페':'☕', '쇼핑':'🛍️', '휴식':'🌿' };

  st.places = [];
  let idx = 0;

  for (const cat of [...st.activeCats]) {
    if (!catQueries[cat]) continue;
    try {
      const { places } = await google.maps.places.Place.searchByText({
        textQuery: catQueries[cat],
        fields: ['displayName', 'location', 'id', 'rating', 'types'],
        maxResultCount: 4,
        ...(st.destLatLng ? {
          locationBias: { center: st.destLatLng, radius: 30000 },
        } : {}),
      });

      (places || []).forEach(r => {
        // 목적지에서 너무 멀면 제외
        if (st.destLatLng && r.location) {
          const dist = distanceKm(
            r.location.lat(), r.location.lng(),
            st.destLatLng.lat, st.destLatLng.lng
          );
          if (dist > 200) return;
        }

        // displayName이 string or LocalizedText 객체 둘 다 처리
        const rawName = r.displayName;
        const placeName = (typeof rawName === 'string' ? rawName : rawName?.text) || `(${cat})`;

        st.places.push({
          id: `ms${idx++}`, cat,
          emoji: catEmoji[cat] || '📍',
          name: placeName,
          nameEn: placeName,
          geocodeQuery: `${placeName} ${cityQuery}`,
          meta: r.types?.[0]?.replace(/_/g,' ') || cat,
          dur: 1,
          rating: r.rating || null,
          lat: r.location?.lat() ?? null,
          lng: r.location?.lng() ?? null,
          placeId: r.id || null,
          photoUrl: null,
        });
      });
    } catch(e) {
      console.warn('Places searchByText 오류:', cat, e);
    }
  }

  showBlocksLoading(false);

  if (st.places.length > 0) {
    renderBlocks();
    toast(`📍 ${cityQuery} 장소 ${st.places.length}개를 찾았어요`);
    if (st.mapsApiKey && st.mapsLoaded) renderGoogleMap();
  } else {
    renderBlocksEmpty(`${cityQuery} 장소를 찾지 못했어요. ↻ 버튼으로 재시도해보세요.`);
  }
}

function _unusedLegacyFallback() {
  // 기본 장소 목록 (Gemini Key 없을 때)
  // 도시별 실제 랜드마크 DB (Gemini 실패 시 폴백)
  const CITY_DB = {
    '오사카': {
      '관광': [
        { name: 'Osaka Castle', nameKo: '오사카성', meta: '역사적 명소', dur: 2, emoji: '🏯', geocodeQuery: 'Osaka Castle Osaka Japan' },
        { name: 'Dotonbori', nameKo: '도톤보리', meta: '번화가·야경', dur: 2, emoji: '🌃', geocodeQuery: 'Dotonbori Osaka Japan' },
        { name: 'Shinsekai', nameKo: '신세카이', meta: '레트로 거리', dur: 1.5, emoji: '🗼', geocodeQuery: 'Shinsekai Osaka Japan' },
      ],
      '맛집': [
        { name: 'Kuromon Ichiba Market', nameKo: '구로몬 시장', meta: '현지 시장', dur: 1.5, emoji: '🦞', geocodeQuery: 'Kuromon Ichiba Market Osaka' },
        { name: 'Ichiran Ramen Dotonbori', nameKo: '이치란 라멘', meta: '라멘 명소', dur: 1, emoji: '🍜', geocodeQuery: 'Ichiran Ramen Dotonbori Osaka' },
        { name: 'Takoyaki Juhachiban', nameKo: '타코야키', meta: '오사카 명물', dur: 0.5, emoji: '🐙', geocodeQuery: 'Takoyaki Juhachiban Osaka' },
      ],
      '카페': [
        { name: '% Arabica Osaka', nameKo: '아라비카 카페', meta: '유명 카페', dur: 1, emoji: '☕', geocodeQuery: '% Arabica Osaka Japan' },
        { name: 'Fuglen Osaka', nameKo: '후글렌 오사카', meta: '스페셜티 카페', dur: 1, emoji: '🧋', geocodeQuery: 'Fuglen Osaka Japan' },
      ],
      '쇼핑': [
        { name: 'Shinsaibashi Shopping Street', nameKo: '신사이바시', meta: '쇼핑 거리', dur: 2, emoji: '🛍️', geocodeQuery: 'Shinsaibashi Osaka Japan' },
        { name: 'America-mura', nameKo: '아메리카무라', meta: '빈티지·패션', dur: 1.5, emoji: '👗', geocodeQuery: 'America-mura Osaka Japan' },
      ],
      '휴식': [
        { name: 'Osaka Castle Park', nameKo: '오사카성 공원', meta: '산책 명소', dur: 1.5, emoji: '🌸', geocodeQuery: 'Osaka Castle Park Japan' },
        { name: 'Namba Parks', nameKo: '난바 파크스', meta: '옥상 정원', dur: 1, emoji: '🌿', geocodeQuery: 'Namba Parks Osaka Japan' },
      ],
    },
    '도쿄': {
      '관광': [
        { name: 'Senso-ji Temple', nameKo: '센소지', meta: '도쿄 대표 사원', dur: 2, emoji: '⛩️', geocodeQuery: 'Senso-ji Temple Asakusa Tokyo' },
        { name: 'Shibuya Crossing', nameKo: '시부야 스크램블', meta: '세계적 교차로', dur: 1, emoji: '🌃', geocodeQuery: 'Shibuya Crossing Tokyo Japan' },
        { name: 'Shinjuku Gyoen', nameKo: '신주쿠 교엔', meta: '대형 공원', dur: 2, emoji: '🌸', geocodeQuery: 'Shinjuku Gyoen National Garden Tokyo' },
      ],
      '맛집': [
        { name: 'Tsukiji Outer Market', nameKo: '츠키지 시장', meta: '해산물 명소', dur: 2, emoji: '🍣', geocodeQuery: 'Tsukiji Outer Market Tokyo Japan' },
        { name: 'Ramen Street Tokyo Station', nameKo: '도쿄역 라멘 거리', meta: '라멘 성지', dur: 1, emoji: '🍜', geocodeQuery: 'Ramen Street Tokyo Station Japan' },
        { name: 'Harajuku Takeshita Street', nameKo: '하라주쿠', meta: '길거리 음식', dur: 1.5, emoji: '🍡', geocodeQuery: 'Takeshita Street Harajuku Tokyo' },
      ],
      '카페': [
        { name: 'Blue Bottle Coffee Shinjuku', nameKo: '블루보틀 신주쿠', meta: '스페셜티 커피', dur: 1, emoji: '☕', geocodeQuery: 'Blue Bottle Coffee Shinjuku Tokyo' },
        { name: 'Cafe de l\'Ambre Ginza', nameKo: '긴자 카페', meta: '올드 카페', dur: 1, emoji: '🧁', geocodeQuery: 'Cafe de Ambre Ginza Tokyo' },
      ],
      '쇼핑': [
        { name: 'Akihabara Electric Town', nameKo: '아키하바라', meta: '전자·오타쿠', dur: 2, emoji: '🎮', geocodeQuery: 'Akihabara Electric Town Tokyo' },
        { name: 'Omotesando Hills', nameKo: '오모테산도', meta: '명품 쇼핑', dur: 1.5, emoji: '🛍️', geocodeQuery: 'Omotesando Hills Tokyo Japan' },
      ],
      '휴식': [
        { name: 'Yoyogi Park', nameKo: '요요기 공원', meta: '도심 공원', dur: 1.5, emoji: '🌳', geocodeQuery: 'Yoyogi Park Tokyo Japan' },
        { name: 'Odaiba Seaside Park', nameKo: '오다이바 해변', meta: '해변 공원', dur: 2, emoji: '🌅', geocodeQuery: 'Odaiba Seaside Park Tokyo Japan' },
      ],
    },
    '서울': {
      '관광': [
        { name: 'Gyeongbokgung Palace', nameKo: '경복궁', meta: '조선 왕궁', dur: 2, emoji: '🏯', geocodeQuery: 'Gyeongbokgung Palace Seoul Korea' },
        { name: 'N Seoul Tower', nameKo: 'N서울타워', meta: '야경 명소', dur: 1.5, emoji: '🗼', geocodeQuery: 'N Seoul Tower Korea' },
        { name: 'Bukchon Hanok Village', nameKo: '북촌 한옥마을', meta: '전통 마을', dur: 2, emoji: '🏘️', geocodeQuery: 'Bukchon Hanok Village Seoul Korea' },
      ],
      '맛집': [
        { name: 'Gwangjang Market', nameKo: '광장시장', meta: '전통 시장', dur: 1.5, emoji: '🥘', geocodeQuery: 'Gwangjang Market Seoul Korea' },
        { name: 'Myeongdong Street Food', nameKo: '명동 길거리', meta: '길거리 음식', dur: 1, emoji: '🍢', geocodeQuery: 'Myeongdong Street Food Seoul Korea' },
        { name: 'Noryangjin Fish Market', nameKo: '노량진 수산시장', meta: '수산 시장', dur: 2, emoji: '🦐', geocodeQuery: 'Noryangjin Fish Market Seoul Korea' },
      ],
      '카페': [
        { name: 'Anthracite Hannam', nameKo: '앤트러사이트', meta: '인더스트리얼', dur: 1, emoji: '☕', geocodeQuery: 'Anthracite Coffee Hannam Seoul' },
        { name: 'Fritz Coffee Company', nameKo: '프리츠 커피', meta: '스페셜티', dur: 1, emoji: '🧁', geocodeQuery: 'Fritz Coffee Company Seoul Korea' },
      ],
      '쇼핑': [
        { name: 'Dongdaemun Design Plaza', nameKo: 'DDP 동대문', meta: '쇼핑·공연', dur: 2, emoji: '🌀', geocodeQuery: 'Dongdaemun Design Plaza Seoul Korea' },
        { name: 'Hongdae Street', nameKo: '홍대 거리', meta: '젊음의 거리', dur: 2, emoji: '🎨', geocodeQuery: 'Hongdae Hongik University Seoul Korea' },
      ],
      '휴식': [
        { name: 'Cheonggyecheon Stream', nameKo: '청계천', meta: '도심 산책로', dur: 1.5, emoji: '🌊', geocodeQuery: 'Cheonggyecheon Stream Seoul Korea' },
        { name: 'Namsan Park', nameKo: '남산공원', meta: '도심 숲', dur: 1.5, emoji: '🌲', geocodeQuery: 'Namsan Park Seoul Korea' },
      ],
    },
    '파리': {
      '관광': [
        { name: 'Eiffel Tower', nameKo: '에펠탑', meta: '파리 상징', dur: 2, emoji: '🗼', geocodeQuery: 'Eiffel Tower Paris France' },
        { name: 'Louvre Museum', nameKo: '루브르 박물관', meta: '세계 최대 박물관', dur: 3, emoji: '🎨', geocodeQuery: 'Louvre Museum Paris France' },
        { name: 'Sacre-Coeur Basilica', nameKo: '사크레쾨르', meta: '몽마르트 언덕', dur: 1.5, emoji: '⛪', geocodeQuery: 'Sacre Coeur Basilica Paris France' },
      ],
      '맛집': [
        { name: 'Le Marais', nameKo: '르 마레 지구', meta: '편집숍·맛집', dur: 2, emoji: '🥐', geocodeQuery: 'Le Marais district Paris France' },
        { name: 'Pierre Herme Paris', nameKo: '피에르 에르메', meta: '마카롱 명소', dur: 0.5, emoji: '🍰', geocodeQuery: 'Pierre Herme Paris France' },
        { name: 'Bouillon Chartier', nameKo: '부용 샤르티에', meta: '클래식 비스트로', dur: 1.5, emoji: '🍷', geocodeQuery: 'Bouillon Chartier Paris France' },
      ],
      '카페': [
        { name: 'Cafe de Flore', nameKo: '카페 드 플로르', meta: '파리 명 카페', dur: 1, emoji: '☕', geocodeQuery: 'Cafe de Flore Paris France' },
        { name: 'Angelina Paris', nameKo: '앙젤리나', meta: '핫초코 명소', dur: 1, emoji: '🧁', geocodeQuery: 'Angelina Paris Rivoli France' },
      ],
      '쇼핑': [
        { name: 'Galeries Lafayette', nameKo: '갤러리 라파예트', meta: '백화점', dur: 2, emoji: '🛍️', geocodeQuery: 'Galeries Lafayette Paris France' },
        { name: 'Avenue des Champs-Elysees', nameKo: '샹젤리제', meta: '명품 거리', dur: 1.5, emoji: '👜', geocodeQuery: 'Champs Elysees Paris France' },
      ],
      '휴식': [
        { name: 'Luxembourg Gardens', nameKo: '뤽상부르 공원', meta: '파리 정원', dur: 1.5, emoji: '🌺', geocodeQuery: 'Luxembourg Gardens Paris France' },
        { name: 'Tuileries Garden', nameKo: '튈르리 정원', meta: '도심 공원', dur: 1, emoji: '🌸', geocodeQuery: 'Tuileries Garden Paris France' },
      ],
    },
    '방콕': {
      '관광': [
        { name: 'Wat Phra Kaew', nameKo: '왓 프라깨우', meta: '에메랄드 사원', dur: 2, emoji: '⛩️', geocodeQuery: 'Wat Phra Kaew Bangkok Thailand' },
        { name: 'Wat Arun', nameKo: '왓 아룬', meta: '새벽 사원', dur: 1.5, emoji: '🌅', geocodeQuery: 'Wat Arun Bangkok Thailand' },
        { name: 'Grand Palace Bangkok', nameKo: '왕궁', meta: '태국 왕궁', dur: 2, emoji: '🏯', geocodeQuery: 'Grand Palace Bangkok Thailand' },
      ],
      '맛집': [
        { name: 'Chatuchak Weekend Market', nameKo: '짜뚜짝 시장', meta: '주말 시장', dur: 3, emoji: '🛒', geocodeQuery: 'Chatuchak Weekend Market Bangkok' },
        { name: 'Pad Thai Thip Samai', nameKo: '팟타이 팁사마이', meta: '팟타이 명소', dur: 1, emoji: '🍜', geocodeQuery: 'Thip Samai Pad Thai Bangkok' },
        { name: 'Chinatown Yaowarat', nameKo: '야오와랏 차이나타운', meta: '길거리 야시장', dur: 2, emoji: '🏮', geocodeQuery: 'Yaowarat Chinatown Bangkok Thailand' },
      ],
      '카페': [
        { name: 'Roots Coffee Roaster', nameKo: '루츠 커피', meta: '스페셜티', dur: 1, emoji: '☕', geocodeQuery: 'Roots Coffee Roaster Bangkok Thailand' },
        { name: 'Gallery Drip Coffee', nameKo: '갤러리 드립', meta: '분위기 카페', dur: 1, emoji: '🧁', geocodeQuery: 'Gallery Drip Coffee Bangkok Thailand' },
      ],
      '쇼핑': [
        { name: 'Siam Paragon', nameKo: '시암 파라곤', meta: '럭셔리 몰', dur: 2, emoji: '🛍️', geocodeQuery: 'Siam Paragon Bangkok Thailand' },
        { name: 'Asiatique The Riverfront', nameKo: '아시아티크', meta: '야시장', dur: 2, emoji: '🌙', geocodeQuery: 'Asiatique Riverfront Bangkok Thailand' },
      ],
      '휴식': [
        { name: 'Lumpini Park', nameKo: '룸피니 공원', meta: '도심 호수 공원', dur: 1.5, emoji: '🌿', geocodeQuery: 'Lumpini Park Bangkok Thailand' },
        { name: 'Iconsiam Rooftop', nameKo: '아이콘시암', meta: '강변 뷰', dur: 1, emoji: '🌊', geocodeQuery: 'ICONSIAM Bangkok Thailand' },
      ],
    },
  };

  // 도시명 매칭 (부분 일치)
  const destKey = Object.keys(CITY_DB).find(k =>
    st.dest.includes(k) || k.includes(st.dest.split(' ')[0])
  );
  const cityData = CITY_DB[destKey] || null;

  st.places = [];
  let idx = 0;

  if (cityData) {
    // 실제 도시 데이터 사용
    for (const [cat, items] of Object.entries(cityData)) {
      if (!st.activeCats.has(cat)) continue;
      items.forEach(item => {
        st.places.push({
          id: `fb${idx++}`, cat,
          emoji: item.emoji, name: item.nameKo, nameEn: item.name,
          geocodeQuery: item.geocodeQuery, meta: item.meta, dur: item.dur,
          lat: null, lng: null, placeId: null, rating: null, photoUrl: null,
        });
      });
    }
    toast(`📍 ${destKey} 기본 장소를 불러왔어요 (AI 추천은 ↻ 버튼으로)`);
  } else {
    // 알 수 없는 도시: 빈 상태로 안내
    renderBlocksEmpty(`${st.dest} 장소를 찾지 못했어요.\nGemini Key 등록 후 ↻ 버튼으로 AI 추천을 받아보세요.`);
    return;
  }

  renderBlocks();
  if (st.mapsApiKey && st.mapsLoaded) geocodeAllPlaces();
}


function showBlocksLoading(show, msg = 'AI가 장소를 추천 중...') {
  const el = document.getElementById('blocks-loading');
  if (!el) return;
  el.style.display = show ? 'flex' : 'none';
  const span = el.querySelector('span');
  if (span) span.textContent = msg;
}

function renderBlocksEmpty(msg = '장소를 불러오지 못했어요') {
  const list = document.getElementById('blocks-list');
  if (!list) return;
  list.innerHTML = `
    <div class="blocks-empty">
      <div style="font-size:28px">🏙️</div>
      <div>${msg}</div>
      <button class="refresh-places-btn" style="font-size:20px;margin-top:8px" onclick="refreshPlaces()">↻ 다시 시도</button>
    </div>`;
  // loading indicator 재추가
  const loadingEl = document.createElement('div');
  loadingEl.className = 'blocks-loading';
  loadingEl.id = 'blocks-loading';
  loadingEl.style.display = 'none';
  loadingEl.innerHTML = '<div class="spinner"></div><span>AI가 장소를 추천 중...</span>';
  list.prepend(loadingEl);
}

/* ══ 사용자 장소 검색 & 추가 ══ */
let _searchResults = [];

async function searchUserPlace() {
  const q = document.getElementById('user-search-input').value.trim();
  if (!q) return;

  const resultsEl = document.getElementById('user-search-results');
  resultsEl.style.display = 'block';
  resultsEl.innerHTML = '<div class="usr-loading">🔍 검색 중...</div>';

  if (st.mapsLoaded && window.google?.maps?.places?.Place) {
    try {
      const { places } = await google.maps.places.Place.searchByText({
        textQuery: `${q} ${st.dest}`,
        fields: ['displayName', 'location', 'id', 'rating', 'formattedAddress'],
        maxResultCount: 5,
        ...(st.destLatLng ? { locationBias: { center: st.destLatLng, radius: 50000 } } : {}),
      });
      _searchResults = (places || []).map(p => ({
        name: (typeof p.displayName === 'string' ? p.displayName : p.displayName?.text) || q,
        lat: p.location?.lat() ?? null,
        lng: p.location?.lng() ?? null,
        placeId: p.id || null,
        rating: p.rating || null,
        address: p.formattedAddress || '',
      }));
      if (_searchResults.length > 0) {
        resultsEl.innerHTML = _searchResults.map((r, i) => `
          <div class="usr-result-item" onclick="addUserPlaceFromSearch(${i})">
            <span class="usr-result-name">${r.name}</span>
            ${r.address ? `<span class="usr-result-addr">${r.address}</span>` : ''}
          </div>`).join('');
      } else {
        resultsEl.innerHTML = `<div class="usr-result-item" onclick="addUserPlaceManual('${q.replace(/'/g,"\\'")}')">➕ "${q}" 직접 추가</div>`;
      }
    } catch(e) {
      resultsEl.innerHTML = `<div class="usr-result-item" onclick="addUserPlaceManual('${q.replace(/'/g,"\\'")}')">➕ "${q}" 직접 추가</div>`;
    }
  } else {
    resultsEl.innerHTML = `<div class="usr-result-item" onclick="addUserPlaceManual('${q.replace(/'/g,"\\'")}')">➕ "${q}" 직접 추가</div>`;
  }
}

function addUserPlaceFromSearch(idx) {
  const r = _searchResults[idx];
  if (!r) return;
  _addUserPlace(r.name, r.lat, r.lng, r.placeId, r.rating, r.address);
}

function addUserPlaceManual(name) {
  _addUserPlace(name, null, null, null, null, '');
}

function _addUserPlace(name, lat, lng, placeId, rating, address) {
  st.userPlaces.push({
    id: `u${Date.now()}`,
    cat: '관광',
    emoji: '📍',
    name,
    nameEn: name,
    geocodeQuery: `${name} ${st.dest}`,
    meta: address || '',
    dur: 1,
    lat, lng, placeId, rating,
    photoUrl: null,
    isUserAdded: true,
  });
  clearUserSearchUI();
  renderBlocks();
  toast(`✅ ${name} 추가됨`);
}

function removeUserPlace(id) {
  st.userPlaces = st.userPlaces.filter(p => p.id !== id);
  renderBlocks();
}

function clearAllUserPlaces() {
  st.userPlaces = [];
  renderBlocks();
  toast('내 장소를 모두 삭제했어요');
}

function clearUserSearchUI() {
  const input = document.getElementById('user-search-input');
  const results = document.getElementById('user-search-results');
  if (input) input.value = '';
  if (results) { results.innerHTML = ''; results.style.display = 'none'; }
  _searchResults = [];
}

async function refreshPlaces() {
  st.places = [];
  renderBlocks();
  // Google Maps가 준비됐으면 우선 사용, 아니면 Gemini
  if (st.mapsLoaded && st.mapsApiKey) {
    await loadFallbackPlaces();
  } else {
    await fetchGeminiPlaces();
  }
}

/* ══ Render place blocks ══ */
function renderBlocks() {
  const list = document.getElementById('blocks-list');
  list.innerHTML = '';

  // Re-add loading indicator (hidden)
  const loadingEl = document.createElement('div');
  loadingEl.className = 'blocks-loading';
  loadingEl.id = 'blocks-loading';
  loadingEl.style.display = 'none';
  loadingEl.innerHTML = '<div class="spinner"></div><span>AI가 장소를 추천 중...</span>';
  list.appendChild(loadingEl);

  // ── 내 장소 섹션 (항상 최상단)
  if (st.userPlaces.length > 0) {
    // 헤더
    const header = document.createElement('div');
    header.className = 'user-places-header';
    header.innerHTML = `
      <span>📌 내 장소 <span class="user-places-count">${st.userPlaces.length}</span></span>
      <button class="user-places-clear" onclick="clearAllUserPlaces()">전체 삭제</button>`;
    list.appendChild(header);

    // 각 블록
    st.userPlaces.forEach(p => list.appendChild(makeBlockEl(p, true)));

    // 구분선
    const sep = document.createElement('div');
    sep.className = 'blocks-section-sep';
    sep.textContent = '✨ AI 추천';
    list.appendChild(sep);
  }

  // ── AI 추천 섹션
  const filtered = st.places.filter(p => st.activeCats.has(p.cat));
  if (!filtered.length && !st.userPlaces.length) {
    const empty = document.createElement('div');
    empty.className = 'blocks-empty';
    empty.innerHTML = '<div style="font-size:24px">🏙️</div><div>표시할 장소가 없어요</div>';
    list.appendChild(empty);
    return;
  }
  filtered.forEach(p => list.appendChild(makeBlockEl(p, false)));
}


function makeBlockEl(p, isUser) {
  const el = document.createElement('div');
  el.className = 'place-block' + (isUser ? ' user-block' : '');
  el.draggable = true;
  el.dataset.id = p.id;
  el.dataset.cat = p.cat;

  const color = isUser ? 'var(--mint)' : (CAT_COLOR[p.cat] || '#74b9ff');
  const ratingHtml = p.rating
    ? `<span style="margin-left:auto;font-size:10px;color:#ffeaa7;font-weight:700;">⭐ ${p.rating.toFixed(1)}</span>`
    : '';
  const removeBtn = isUser
    ? `<button class="user-block-remove" onclick="removeUserPlace('${p.id}')" title="삭제">×</button>`
    : '';

  el.innerHTML = `
    <div style="padding:11px 13px;display:flex;flex-direction:column;gap:4px;">
      <div style="font-size:9px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:${color};display:flex;align-items:center;gap:5px;">
        <span style="width:7px;height:7px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0;"></span>
        ${isUser ? '내 장소' : p.cat}${ratingHtml}${removeBtn}
      </div>
      <div style="font-size:13px;font-weight:700;color:#eef0f8;">${p.emoji || ''} ${p.name || '(이름없음)'}</div>
      <div style="font-size:10px;color:#8899b0;">${p.meta || ''}${p.meta && p.dur ? ' · ' : ''}${p.dur}h</div>
    </div>`;

  el.addEventListener('dragstart', e => {
    e.dataTransfer.setData('placeId', p.id);
    e.dataTransfer.effectAllowed = 'copy';
  });
  return el;
}

function filterCat(pill) {
  pill.classList.toggle('on');
  const cat = pill.dataset.cat;
  if (st.activeCats.has(cat)) st.activeCats.delete(cat);
  else st.activeCats.add(cat);
  renderBlocks();
}

/* ══ Multi-day timeline ══ */
function getDepDate() {
  try { return JSON.parse(localStorage.getItem('tripai_flight') || '{}').depDate || null; }
  catch { return null; }
}

function renderMultiTimeline() {
  const panel = document.getElementById('panel-multi');
  panel.innerHTML = '';
  const dep = getDepDate();

  const header = document.createElement('div');
  header.className = 'multi-header';
  const gutterHead = document.createElement('div');
  gutterHead.className = 'multi-gutter-head';
  header.appendChild(gutterHead);

  for (let d = 1; d <= st.dayCount; d++) {
    let dateStr = '';
    if (dep) {
      const dt = new Date(dep + 'T00:00:00');
      dt.setDate(dt.getDate() + d - 1);
      dateStr = dt.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
    }
    const dayItems = Object.values(st.schedule[d] || {});
    const dots = dayItems.slice(0,5).map(p => {
      const c = CAT_COLOR[p.cat] || 'var(--coral)';
      return `<span class="head-dot" style="background:${c}"></span>`;
    }).join('');
    const h = document.createElement('div');
    h.className = 'multi-day-head';
    h.id = `multi-head-${d}`;
    h.innerHTML = `
      <div class="mdh-top">
        <span class="mdh-num">${d}일차</span>
        <button class="mdh-clear" onclick="clearDay(${d})">초기화</button>
      </div>
      ${dateStr ? `<div class="mdh-date">${dateStr}</div>` : ''}
      <div class="mdh-dots" id="mdh-dots-${d}">${dots || '<span class="mdh-empty">비어있음</span>'}</div>`;
    header.appendChild(h);
  }
  // 헤더 + 바디를 하나의 가로스크롤 래퍼로
  const scrollWrap = document.createElement('div');
  scrollWrap.className = 'multi-scroll-outer';
  scrollWrap.appendChild(header);

  const body = document.createElement('div');
  body.className = 'multi-body';
  // 일차당 고정 너비 140px
  body.style.gridTemplateColumns = `44px repeat(${st.dayCount}, 140px)`;

  // Time gutter
  const gutter = document.createElement('div');
  gutter.className = 'multi-gutter';
  TIMES.forEach(t => {
    const el = document.createElement('div');
    el.className = 'multi-time-label';
    el.textContent = t;
    gutter.appendChild(el);
  });
  body.appendChild(gutter);

  // Day columns
  for (let d = 1; d <= st.dayCount; d++) {
    const col = document.createElement('div');
    col.className = 'multi-day-col';

    TIMES.forEach(time => {
      const drop = document.createElement('div');
      drop.className = 'slot-drop';
      drop.dataset.time = time;
      drop.dataset.day  = d;

      const placed = st.schedule[d][time];
      if (placed) renderSlotBlock(drop, placed, time, d);

      drop.addEventListener('dragover',  e => { e.preventDefault(); drop.classList.add('drag-over'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
      drop.addEventListener('drop', e => {
        e.preventDefault(); drop.classList.remove('drag-over');
        const pid      = e.dataTransfer.getData('placeId');
        const fromDay  = e.dataTransfer.getData('fromDay');
        const fromTime = e.dataTransfer.getData('fromTime');

        // 이미 동일 슬롯으로 드래그하면 무시
        if (fromDay && fromTime && Number(fromDay) === d && fromTime === time) return;

        const place = [...st.userPlaces, ...st.places].find(p => p.id === pid);
        if (!place) return;

        // 타임라인 안에서 이동: 출발 슬롯을 비운다
        if (fromDay && fromTime) {
          const fDay = Number(fromDay);
          // 동일 슬롯으로 목적지가 드래그된 경우 부수 스완
          const targetPlace = st.schedule[d][time];
          if (targetPlace && fDay === d) {
            // 같은 일차 내 시간대 스완
            st.schedule[fDay][fromTime] = targetPlace;
          } else if (targetPlace) {
            // 다른 일차인데 목적지에 분리돼 있으면 출발지로 이동
            st.schedule[fDay][fromTime] = targetPlace;
          } else {
            // 목적지 빈 슬롯: 출발지만 비운다
            delete st.schedule[fDay][fromTime];
          }
        }

        // 목적지에 배치
        st.schedule[d][time] = place;

        // 영향받는 일차 전체 리렌더
        const affectedDays = new Set([d]);
        if (fromDay) affectedDays.add(Number(fromDay));
        affectedDays.forEach(ad => {
          const dayDrops = document.querySelectorAll(`.slot-drop[data-day="${ad}"]`);
          dayDrops.forEach(dp => {
            const t = dp.dataset.time;
            dp.innerHTML = '';
            const placed = st.schedule[ad][t];
            if (placed) renderSlotBlock(dp, placed, t, ad);
          });
          refreshDayHead(ad);
        });

        // 드롭한 일차로 지도 자동 전환
        st._mapDay = d;
        updateMapDaySelectorUI();
        if (st.mapsLoaded) renderGoogleMap();
        toast(`✅ ${place.name} — ${d}일차 ${time}`);
      });
      col.appendChild(drop);
    });
    body.appendChild(col);
  }
  scrollWrap.appendChild(body);
  panel.appendChild(scrollWrap);
}

function refreshDayHead(d) {
  const el = document.getElementById(`mdh-dots-${d}`);
  if (!el) return;
  const items = Object.values(st.schedule[d] || {});
  if (!items.length) {
    el.innerHTML = '<span class="mdh-empty">비어있음</span>';
  } else {
    el.innerHTML = items.slice(0,5).map(p => {
      const c = CAT_COLOR[p.cat] || 'var(--coral)';
      return `<span class="head-dot" style="background:${c}"></span>`;
    }).join('') + `<span class="mdh-count">${items.length}개</span>`;
  }
}

function renderSlotBlock(drop, place, time, day) {
  drop.innerHTML = '';
  const daySchedule = Object.entries(st.schedule[day]).sort(([a],[b]) => a.localeCompare(b));
  const idx   = daySchedule.findIndex(([t]) => t === time) + 1;
  const color = CAT_COLOR[place.cat] || '#fff';
  const tc    = CAT_TEXT[place.cat]  || '#fff';
  const block = document.createElement('div');
  block.className = 'slot-block';
  block.style.background = `${color}22`;
  block.style.border     = `1px solid ${color}55`;
  block.draggable = true;
  block.dataset.fromDay  = day;
  block.dataset.fromTime = time;
  block.innerHTML = `
    <div class="slot-block-num" style="background:${color};color:${tc}">${idx}</div>
    <span style="font-size:13px">${place.emoji}</span>
    <span style="flex:1;font-size:11px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${place.name}</span>
    <button class="slot-block-remove" onclick="removeBlock(${day},'${time}')">×</button>`;

  // 타임라인 블록 드래그시작: 장소 ID + 출발지 day/time 전달
  block.addEventListener('dragstart', e => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('placeId',  place.id);
    e.dataTransfer.setData('fromDay',  String(day));
    e.dataTransfer.setData('fromTime', time);
    // 드래그 시상적 피드백
    setTimeout(() => block.style.opacity = '0.45', 0);
  });
  block.addEventListener('dragend', () => {
    block.style.opacity = '';
  });

  drop.appendChild(block);
}

function removeBlock(day, time) {
  delete st.schedule[day][time];
  const drops = document.querySelectorAll(`.slot-drop[data-day="${day}"]`);
  drops.forEach(drop => {
    const t = drop.dataset.time;
    drop.innerHTML = '';
    const placed = st.schedule[day][t];
    if (placed) renderSlotBlock(drop, placed, t, day);
  });
  refreshDayHead(day);
  if (st.mapsLoaded) renderGoogleMap();
  saveCurrentProject();
  toast('블록이 제거됐어요');
}

function clearDay(d) {
  st.schedule[d] = {};
  const drops = document.querySelectorAll(`.slot-drop[data-day="${d}"]`);
  drops.forEach(drop => { drop.innerHTML = ''; });
  refreshDayHead(d);
  if (st.mapsLoaded) renderGoogleMap();
  toast(`${d}일차 초기화됐어요`);
}

/* ══ Map Panel (상시 표시) ══ */
function initMapPanel() {
  if (!st.mapsApiKey) {
    document.getElementById('google-map').style.display  = 'none';
    document.getElementById('map-no-key').style.display  = 'flex';
  } else {
    document.getElementById('google-map').style.display = 'flex';
    document.getElementById('map-no-key').style.display = 'none';
  }
  buildMapDaySelector();
  if (st.mapsLoaded) renderGoogleMap();
}

/* 지도 패널 토글 (열기/닫기) */
function toggleMapPanel() {
  const mapPanel = document.getElementById('panel-map');
  const divider  = document.getElementById('panel-divider');
  const btn      = document.getElementById('map-toggle-btn');
  const hidden   = mapPanel.style.display === 'none';
  mapPanel.style.display  = hidden ? 'flex'  : 'none';
  divider.style.display   = hidden ? 'block' : 'none';
  btn.textContent         = hidden ? '🗺️ 지도 닫기' : '🗺️ 지도 열기';
  if (hidden && st.mapsLoaded) {
    setTimeout(() => renderGoogleMap(), 100);
  }
}

/* 드래그 분할선 */
function initDivider() {
  const divider    = document.getElementById('panel-divider');
  const multiPanel = document.getElementById('panel-multi');
  const leftPanel  = document.getElementById('panels');
  let dragging = false;

  divider.addEventListener('mousedown', (e) => {
    dragging = true;
    divider.classList.add('dragging');
    document.body.style.cursor    = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const panelsRect  = leftPanel.getBoundingClientRect();
    const panelLeft   = document.getElementById('panel-left');
    const leftWidth   = panelLeft.getBoundingClientRect().width + 6; // 6px divider
    const newMultiW   = e.clientX - panelsRect.left - leftWidth;
    const minW = 300;
    const maxW = panelsRect.width - leftWidth - 200 - 6; // 지도 최소 200px
    multiPanel.style.width = `${Math.max(minW, Math.min(maxW, newMultiW))}px`;
    // 지도 크기 변경 알림
    if (st.googleMap) google.maps.event.trigger(st.googleMap, 'resize');
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    divider.classList.remove('dragging');
    document.body.style.cursor    = '';
    document.body.style.userSelect = '';
  });
}


function buildMapDaySelector() {
  const wrap = document.getElementById('map-day-selector-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (let d = 1; d <= st.dayCount; d++) {
    const btn = document.createElement('button');
    btn.className = `map-day-btn${d === (st._mapDay || 1) ? ' active' : ''}`;
    btn.textContent = `${d}일`;
    btn.onclick = () => {
      st._mapDay = d;
      updateMapDaySelectorUI();
      renderGoogleMap();
    };
    wrap.appendChild(btn);
  }
  if (!st._mapDay) st._mapDay = 1;
}

/* 일차 선택 버튼 UI 동기화 */
function updateMapDaySelectorUI() {
  const wrap = document.getElementById('map-day-selector-wrap');
  if (!wrap) return;
  wrap.querySelectorAll('.map-day-btn').forEach((b, i) =>
    b.classList.toggle('active', i + 1 === st._mapDay)
  );
}

/* 두 점 사이 거리 (km) */
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/* Geocoding 캐시 */
const _geocodeCache = {};
async function geocodePlace(place) {
  if (place.lat && place.lng) return true;

  // geocodeQuery 없으면 (= 폴백 장소) Geocoding 건너뜀
  if (!place.geocodeQuery && !place.nameEn) return false;

  // 실제 검색어 = Gemini 제공 geocodeQuery 우선
  const query = place.geocodeQuery || `${place.nameEn} ${st.dest}`;

  if (_geocodeCache[query]) {
    place.lat = _geocodeCache[query].lat;
    place.lng = _geocodeCache[query].lng;
    return true;
  }
  return new Promise(resolve => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: query }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const lat = results[0].geometry.location.lat();
        const lng = results[0].geometry.location.lng();

        // 목적지 도시에서 200km 이상이면 잘못된 결과로 버림
        if (st.destLatLng) {
          const dist = distanceKm(lat, lng, st.destLatLng.lat, st.destLatLng.lng);
          if (dist > 200) {
            console.warn(`Geocoding 거리 초과(${dist.toFixed(0)}km): ${query}`);
            resolve(false);
            return;
          }
        }

        place.lat = lat;
        place.lng = lng;
        _geocodeCache[query] = { lat, lng };
        resolve(true);
      } else {
        console.warn('Geocoding 실패:', query, status);
        resolve(false);
      }
    });
  });
}

async function renderGoogleMap() {
  if (!window.google?.maps) return;

  const mapDiv   = document.getElementById('google-map');
  const day      = st._mapDay || 1;
  const dayItems = Object.entries(st.schedule[day] || {})
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([,p]) => p);

  // Determine center: 목적지 좌표 → 장소 좌표 → Geocoding으로 도시 검색
  let center = st.destLatLng;
  if (!center) {
    const withCoords = dayItems.find(p => p.lat && p.lng);
    if (withCoords) {
      center = { lat: withCoords.lat, lng: withCoords.lng };
    } else {
      // 도시 이름으로 Geocoding
      center = await new Promise(resolve => {
        new google.maps.Geocoder().geocode({ address: st.dest }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const loc = results[0].geometry.location;
            st.destLatLng = { lat: loc.lat(), lng: loc.lng() };
            resolve(st.destLatLng);
          } else {
            resolve({ lat: 34.6937, lng: 135.5023 }); // 오사카 기본
          }
        });
      });
    }
  }

  // Init or reuse map (각 일차별 "새 도화지"처럼 마커를 초기화)
  if (!st.googleMap) {
    st.googleMap = new google.maps.Map(mapDiv, {
      center,
      zoom: 13,
      mapTypeId: 'roadmap',
      styles: DARK_MAP_STYLE,
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
    });
  } else {
    st.googleMap.setCenter(center);
  }

  // 기존 마커/경로 전부 지우기 (새 도화지 효과)
  st.mapMarkers.forEach(m => m.setMap(null));
  st.mapInfoWindows.forEach(iw => iw.close());
  if (st.mapPolyline) st.mapPolyline.setMap(null);
  st.mapMarkers = [];
  st.mapInfoWindows = [];

  if (!dayItems.length) return;

  // lat/lng 없는 장소는 Geocoding으로 확보
  for (const place of dayItems) {
    if (!place.lat || !place.lng) {
      await geocodePlace(place);
    }
  }

  const pathCoords = [];
  let markerNum = 0; // lat/lng 있는 장소만 순서 번호

  dayItems.forEach((place) => {
    if (!place.lat || !place.lng) return;
    markerNum++;
    const position = { lat: place.lat, lng: place.lng };
    pathCoords.push(position);

    const color = catHexColor(place.cat);
    // 마커: 번호 원형 + 크기 24
    const markerIcon = {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 22,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3,
    };

    const marker = new google.maps.Marker({
      position,
      map: st.googleMap,
      label: {
        text: String(markerNum),
        color: '#ffffff',
        fontWeight: '800',
        fontSize: '13px',
      },
      icon: markerIcon,
      title: place.name,
      animation: google.maps.Animation.DROP,
    });

    const infoContent = `
      <div style="font-family:'Inter',sans-serif;padding:6px 8px;min-width:160px;max-width:220px">
        <div style="font-size:12px;font-weight:800;color:#ff6b6b;margin-bottom:2px">${markerNum}번째 방문</div>
        <div style="font-size:14px;font-weight:700;color:#1a1f2e;margin-bottom:4px">${place.emoji} ${place.name}</div>
        <div style="font-size:11px;color:#666">${place.cat} · ${place.dur}시간</div>
        ${place.rating ? `<div style="font-size:11px;color:#f4a261;margin-top:3px">⭐ ${place.rating.toFixed(1)}</div>` : ''}
        ${place.meta ? `<div style="font-size:11px;color:#555;margin-top:2px">${place.meta}</div>` : ''}
      </div>`;

    const infoWindow = new google.maps.InfoWindow({ content: infoContent });

    marker.addListener('click', () => {
      st.mapInfoWindows.forEach(iw => iw.close());
      infoWindow.open(st.googleMap, marker);
    });

    st.mapMarkers.push(marker);
    st.mapInfoWindows.push(infoWindow);
  });

  // 경로 Polyline
  if (pathCoords.length > 1) {
    st.mapPolyline = new google.maps.Polyline({
      path: pathCoords,
      geodesic: true,
      strokeColor: '#ff6b6b',
      strokeOpacity: 0.85,
      strokeWeight: 3,
      icons: [{
        icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
        offset: '50%',
        repeat: '100px',
      }],
    });
    st.mapPolyline.setMap(st.googleMap);
  }

  // 모든 마커가 보이도록 지도 자동 맞춤
  if (pathCoords.length > 0) {
    const bounds = new google.maps.LatLngBounds();
    pathCoords.forEach(c => bounds.extend(c));
    st.googleMap.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    // 단일 마커인 경우 너무 확대되지 않도록
    if (pathCoords.length === 1) st.googleMap.setZoom(15);
  }
}


function catHexColor(cat) {
  const map = {
    '관광': '#74b9ff',
    '맛집': '#fd79a8',
    '카페': '#fdcb6e',
    '쇼핑': '#a29bfe',
    '휴식': '#00b894',
  };
  return map[cat] || '#ff6b6b';
}

/* Google Maps Dark Style */
const DARK_MAP_STYLE = [
  { elementType:'geometry', stylers:[{color:'#1d2c4d'}] },
  { elementType:'labels.text.fill', stylers:[{color:'#8ec3b9'}] },
  { elementType:'labels.text.stroke', stylers:[{color:'#1a3646'}] },
  { featureType:'administrative.country', elementType:'geometry.stroke', stylers:[{color:'#4b6878'}] },
  { featureType:'administrative.land_parcel', elementType:'labels.text.fill', stylers:[{color:'#64779e'}] },
  { featureType:'administrative.province', elementType:'geometry.stroke', stylers:[{color:'#4b6878'}] },
  { featureType:'landscape.man_made', elementType:'geometry.stroke', stylers:[{color:'#334e87'}] },
  { featureType:'landscape.natural', elementType:'geometry', stylers:[{color:'#023e58'}] },
  { featureType:'poi', elementType:'geometry', stylers:[{color:'#283d6a'}] },
  { featureType:'poi', elementType:'labels.text.fill', stylers:[{color:'#6f9ba5'}] },
  { featureType:'poi', elementType:'labels.text.stroke', stylers:[{color:'#1d2c4d'}] },
  { featureType:'poi.park', elementType:'geometry.fill', stylers:[{color:'#023e58'}] },
  { featureType:'poi.park', elementType:'labels.text.fill', stylers:[{color:'#3C7680'}] },
  { featureType:'road', elementType:'geometry', stylers:[{color:'#304a7d'}] },
  { featureType:'road', elementType:'labels.text.fill', stylers:[{color:'#98a5be'}] },
  { featureType:'road', elementType:'labels.text.stroke', stylers:[{color:'#1d2c4d'}] },
  { featureType:'road.highway', elementType:'geometry', stylers:[{color:'#2c6675'}] },
  { featureType:'road.highway', elementType:'geometry.stroke', stylers:[{color:'#255763'}] },
  { featureType:'road.highway', elementType:'labels.text.fill', stylers:[{color:'#b0d5ce'}] },
  { featureType:'road.highway', elementType:'labels.text.stroke', stylers:[{color:'#023747'}] },
  { featureType:'transit', elementType:'labels.text.fill', stylers:[{color:'#98a5be'}] },
  { featureType:'transit', elementType:'labels.text.stroke', stylers:[{color:'#1d2c4d'}] },
  { featureType:'transit.line', elementType:'geometry.fill', stylers:[{color:'#283d6a'}] },
  { featureType:'transit.station', elementType:'geometry', stylers:[{color:'#3a4762'}] },
  { featureType:'water', elementType:'geometry', stylers:[{color:'#0e1626'}] },
  { featureType:'water', elementType:'labels.text.fill', stylers:[{color:'#4e6d70'}] },
];

/* ══ AI Optimization ══ */
function openAIPanel() {
  const day      = st._mapDay || 1;
  const dayItems = Object.entries(st.schedule[day]).sort(([a],[b]) => a.localeCompare(b));
  if (!dayItems.length) { toast('먼저 타임라인에 블록을 추가해주세요'); return; }
  if (dayItems.length < 2) { toast('2개 이상의 장소를 추가해주세요'); return; }

  // 현재 원본 저장
  st._origDayItems = JSON.parse(JSON.stringify(dayItems));

  document.getElementById('ai-panel').classList.add('open');
  document.getElementById('ai-reasons').innerHTML = '';
  document.getElementById('ai-action-row').style.display = 'none';
  document.getElementById('ai-loading').style.display    = 'flex';
  const summaryBox = document.getElementById('ai-summary-box');
  if (summaryBox) summaryBox.style.display = 'none';
  document.getElementById('ai-panel-sub').textContent    = '동선, 카테고리 흐름, 시간대를 분석해 최적 순서를 추천해드려요.';

  // 서버리스 함수를 통해 AI 최적화 호출 (항상 시도)
  fetchAIOptimization(dayItems, day);
}

/* ── 최근접 이웃(Nearest Neighbor) 동선 최적화 ── */
function computeNearestNeighbor(dayItems) {
  const places = dayItems.map(([t, p]) => ({ t, p }));
  const withCoords    = places.filter(x => x.p.lat && x.p.lng);
  const withoutCoords = places.filter(x => !x.p.lat || !x.p.lng);

  if (withCoords.length < 2) return places; // 좌표 없으면 현재 순서 유지

  const remaining = [...withCoords];
  const ordered   = [remaining.shift()]; // 첫 장소를 출발점으로

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1].p;
    let minDist = Infinity, nearestIdx = 0;
    remaining.forEach((x, i) => {
      const d = distanceKm(last.lat, last.lng, x.p.lat, x.p.lng);
      if (d < minDist) { minDist = d; nearestIdx = i; }
    });
    ordered.push(remaining.splice(nearestIdx, 1)[0]);
  }

  return [...ordered, ...withoutCoords];
}

/* 연속된 두 장소 간 거리 합 계산 */
function totalRouteKm(places) {
  let total = 0;
  for (let i = 0; i < places.length - 1; i++) {
    const a = places[i], b = places[i + 1];
    if (a.lat && a.lng && b.lat && b.lng)
      total += distanceKm(a.lat, a.lng, b.lat, b.lng);
  }
  return total;
}

async function fetchAIOptimization(dayItems, day) {
  // ① JS로 최적 순서 계산 (정확한 거리 기반)
  const nnOrdered = computeNearestNeighbor(dayItems);
  const optimizedOrder = nnOrdered.map(x => x.p.name);

  const beforeKm = totalRouteKm(dayItems.map(([, p]) => p)).toFixed(1);
  const afterKm  = totalRouteKm(nnOrdered.map(x => x.p)).toFixed(1);
  const saved    = (beforeKm - afterKm).toFixed(1);

  // 순서가 이미 같으면 바로 표시
  const currentOrder = dayItems.map(([, p]) => p.name);
  const isSameOrder  = optimizedOrder.every((n, i) => n === currentOrder[i]);

  // ② Gemini에게는 "이 최적 순서를 왜 추천하는지 설명"만 요청
  if (isSameOrder) {
    const sameMsg = isSameOrder
      ? '현재 순서가 이미 동선상 최적이에요 ✦'
      : `동선 ${beforeKm}km → ${afterKm}km (약 ${saved}km 단축)`;
    showAIResult({
      optimizedOrder,
      suggestions: nnOrdered.slice(0, -1).map((x, i) => {
        const next = nnOrdered[i + 1];
        if (!x.p.lat || !next?.p.lat) return null;
        const km = distanceKm(x.p.lat, x.p.lng, next.p.lat, next.p.lng).toFixed(1);
        return { from: x.p.name, to: next.p.name, reason: `이동 거리 ${km}km — 가장 가까운 다음 장소` };
      }).filter(Boolean).slice(0, 3),
      summary: isSameOrder
        ? `현재 순서가 동선상 최적입니다. ${beforeKm}km로 이미 효율적으로 배치되어 있어요.`
        : `최근접 이웃 알고리즘으로 동선을 ${beforeKm}km → ${afterKm}km로 약 ${saved}km 단축했어요.`,
    }, dayItems, day);
    return;
  }

  const orderedDesc = nnOrdered.map((x, i) => {
    const next = nnOrdered[i + 1];
    const km = (x.p.lat && next?.p.lat)
      ? distanceKm(x.p.lat, x.p.lng, next.p.lat, next.p.lng).toFixed(1) + 'km'
      : '';
    return `${i + 1}. ${x.p.name}${km ? ` → 다음까지 ${km}` : ''}`;
  }).join('\n');

  const prompt = `여행 일정 동선 최적화 결과를 자연스러운 한국어로 설명해주세요.

여행지: ${st.dest} / 테마: ${st.theme} / ${day}일차
이동 거리: ${beforeKm}km → ${afterKm}km (약 ${saved}km 단축)

최적화된 방문 순서 (거리 기반 계산 완료):
${orderedDesc}

아래 JSON만 반환하세요. 다른 텍스트 없이:
{
  "suggestions": [
    {"from": "장소A", "to": "장소B", "reason": "30자 이내 이유"},
    {"from": "장소B", "to": "장소C", "reason": "30자 이내 이유"}
  ],
  "summary": "동선 단축 효과와 방문 흐름을 2문장으로 설명"
}
suggestions는 2~3개만.`;

  try {
    const res  = await fetch(
      `/api/gemini`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gemini-2.0-flash', contents: [{ parts: [{ text: prompt }] }] }) }
    );
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const json = JSON.parse(raw.replace(/```json|```/g, '').trim());
    showAIResult({ ...json, optimizedOrder }, dayItems, day);
  } catch(e) {
    console.warn('Gemini 설명 오류(계산은 JS로 완료):', e);
    // Gemini 실패해도 JS 계산 결과는 그대로 표시
    showAIResult({
      optimizedOrder,
      suggestions: [],
      summary: `동선 ${beforeKm}km → ${afterKm}km (약 ${saved}km 단축). 최근접 이웃 알고리즘 적용.`,
    }, dayItems, day);
  }
}

function showFallbackOptimization(dayItems, day) {
  // Gemini Key 없어도 JS 알고리즘으로 동선 최적화
  const nnOrdered = computeNearestNeighbor(dayItems);
  const optimizedOrder = nnOrdered.map(x => x.p.name);
  const beforeKm = totalRouteKm(dayItems.map(([, p]) => p)).toFixed(1);
  const afterKm  = totalRouteKm(nnOrdered.map(x => x.p)).toFixed(1);
  const isSame   = optimizedOrder.every((n, i) => n === dayItems[i][1].name);

  showAIResult({
    optimizedOrder,
    suggestions: nnOrdered.slice(0, -1).map((x, i) => {
      const next = nnOrdered[i + 1];
      if (!x.p.lat || !next?.p.lat) return null;
      const km = distanceKm(x.p.lat, x.p.lng, next.p.lat, next.p.lng).toFixed(1);
      return { from: x.p.name, to: next.p.name, reason: `이동 거리 ${km}km — 가장 가까운 순서` };
    }).filter(Boolean).slice(0, 3),
    summary: isSame
      ? `현재 순서가 동선상 최적입니다 (${beforeKm}km). Gemini Key 등록 시 상세 설명도 제공해요.`
      : `최근접 이웃 알고리즘으로 ${beforeKm}km → ${afterKm}km 단축. Gemini Key 등록 시 상세 설명도 제공해요.`,
  }, dayItems, day);
}

function showAIResult(json, dayItems, day) {
  document.getElementById('ai-loading').style.display    = 'none';
  document.getElementById('ai-action-row').style.display = 'flex';

  // 요약 박스에 AI 분석 결론 표시
  const summaryBox = document.getElementById('ai-summary-box');
  if (summaryBox && json.summary) {
    summaryBox.textContent = `💬 ${json.summary}`;
    summaryBox.style.display = 'block';
  }

  // 부제목
  document.getElementById('ai-panel-sub').textContent = `${day}일차 · 현재 배치와 AI 추천 순서를 비교해보세요.`;

  // ── Before / After 비교 ──
  const reasons = document.getElementById('ai-reasons');

  const currentNames  = dayItems.map(([, p]) => p.name);
  const proposedNames = json.optimizedOrder?.length ? json.optimizedOrder : currentNames;

  // 순서가 실제로 바뀐 인덱스 탐지
  const changedSet = new Set();
  proposedNames.forEach((name, i) => {
    if (currentNames[i] !== name) changedSet.add(i);
  });

  const makeItem = (name, idx, isBefore) => {
    const isChanged = changedSet.has(idx);
    const cls = isBefore ? 'before-item' : `after-item${isChanged ? ' changed' : ''}`;
    const numCls = isBefore ? 'before-num' : 'after-num';
    const place = [...st.userPlaces, ...st.places].find(p => p.name === name);
    const emoji = place?.emoji || '';
    return `<div class="ai-compare-item ${cls}">
      <span class="ai-compare-num ${numCls}">${idx + 1}</span>
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${emoji ? emoji + ' ' : ''}${name}</span>
      ${isChanged && !isBefore ? '<span style="font-size:10px;color:var(--coral);flex-shrink:0">✦</span>' : ''}
    </div>`;
  };

  const compareHtml = `
    <div class="ai-compare">
      <div class="ai-compare-col">
        <span class="ai-compare-label before">현재 순서</span>
        ${currentNames.map((name, i) => makeItem(name, i, true)).join('')}
      </div>
      <div class="ai-compare-arrow">→</div>
      <div class="ai-compare-col">
        <span class="ai-compare-label after">AI 추천</span>
        ${proposedNames.map((name, i) => makeItem(name, i, false)).join('')}
      </div>
    </div>`;

  // 변경 이유 카드
  const sugs = json.suggestions || [];
  const reasonCards = sugs.map(s => `
    <div class="ai-reason-card">
      <div class="ai-reason-badge">🧠 변경 이유</div>
      <div class="ai-reason-places">${s.from} → ${s.to}</div>
      <div class="ai-reason-text">${s.reason}</div>
    </div>`).join('');

  reasons.innerHTML = compareHtml + (reasonCards
    ? `<div style="margin-top:8px;font-size:9px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">변경 이유</div>${reasonCards}`
    : '');

  st.pendingOpt   = json;
  st._aiOptDay    = day;
  st._aiDayItems  = dayItems;

  // 지도에 AI 추천 동선 미리보기
  if (st.mapsLoaded) renderAIPreviewMap(proposedNames, dayItems);
}


/* ══ AI 동선 미리보기 ══ */
function renderAIPreviewMap(proposedNames, dayItems) {
  if (!window.google?.maps || !st.googleMap) return;

  // 기존 마커/경로 반투명하게
  st.mapMarkers.forEach(m => {
    const ic = m.getIcon();
    if (ic) m.setIcon({ ...ic, fillOpacity: 0.22, strokeOpacity: 0.3 });
    m.setLabel({ ...m.getLabel(), color: 'rgba(255,255,255,0.3)' });
  });
  if (st.mapPolyline) st.mapPolyline.setOptions({ strokeOpacity: 0.12 });

  // 기존 미리보기 초기화
  st.previewMarkers.forEach(m => m.setMap(null));
  st.previewMarkers = [];
  if (st.previewPolyline) { st.previewPolyline.setMap(null); st.previewPolyline = null; }

  // 추천 순서대로 민트 마커
  const dayPlaces = dayItems.map(([, p]) => p);
  const ordered = proposedNames
    .map(name => dayPlaces.find(p => p.name === name))
    .filter(Boolean);

  const pathCoords = [];
  ordered.forEach((place, i) => {
    if (!place.lat || !place.lng) return;
    const pos = { lat: place.lat, lng: place.lng };
    pathCoords.push(pos);

    const marker = new google.maps.Marker({
      position: pos,
      map: st.googleMap,
      label: { text: String(i + 1), color: '#fff', fontWeight: '800', fontSize: '12px' },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 20,
        fillColor: '#00b894',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2.5,
      },
      title: `AI 추천 ${i + 1}: ${place.name}`,
      zIndex: 100,
      animation: google.maps.Animation.DROP,
    });
    st.previewMarkers.push(marker);
  });

  // 점선 경로
  if (pathCoords.length > 1) {
    st.previewPolyline = new google.maps.Polyline({
      path: pathCoords,
      geodesic: true,
      strokeColor: '#00b894',
      strokeOpacity: 0,
      strokeWeight: 3,
      icons: [{
        icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.9, scale: 4 },
        offset: '0', repeat: '14px',
      }],
    });
    st.previewPolyline.setMap(st.googleMap);
  }
}

/* ══ Projects Data ══ */

// 로컬 데이터를 클라우드로 마이그레이션
async function migrateLocalProjectsToCloud() {
  if (!window.currentUser) return;
  const raw = localStorage.getItem('tripai_projects');
  if (!raw) return;

  try {
    let localList = JSON.parse(raw);
    if (!Array.isArray(localList) || localList.length === 0) return;

    let migratedCount = 0;
    for (const proj of localList) {
      if (proj._migrated) continue; // 이미 마이그레이션된 항목 건너뛰기

      const dataToSave = {
        schedule: localStorage.getItem(`tripai_schedule_${proj.id}`) ? JSON.parse(localStorage.getItem(`tripai_schedule_${proj.id}`)) : { dest: proj.dest, theme: proj.theme, days: proj.dayCount },
        flight: localStorage.getItem(`tripai_flight_${proj.id}`) ? JSON.parse(localStorage.getItem(`tripai_flight_${proj.id}`)) : { airport: proj.airport, hotel: proj.hotel, depDate: proj.depDate, retDate: proj.retDate },
        places: localStorage.getItem(`tripai_places_${proj.id}`) ? JSON.parse(localStorage.getItem(`tripai_places_${proj.id}`)) : (proj.places || null),
        userPlaces: localStorage.getItem(`tripai_userplaces_${proj.id}`) ? JSON.parse(localStorage.getItem(`tripai_userplaces_${proj.id}`)) : (proj.userPlaces || null),
        schedData: localStorage.getItem(`tripai_sched_${proj.id}`) ? JSON.parse(localStorage.getItem(`tripai_sched_${proj.id}`)) : (proj.schedule || null),
      };

      const { data, error } = await window.supabaseClient
        .from('projects')
        .insert([{
          user_id: window.currentUser.id,
          title: proj.title || '새 내 여행',
          data: dataToSave
        }]);

      if (!error) {
        proj._migrated = true;
        migratedCount++;
      }
    }
    
    if (migratedCount > 0) {
      localStorage.setItem('tripai_projects', JSON.stringify(localList));
      console.log(`${migratedCount}개의 프로젝트가 클라우드로 옮겨졌습니다.`);
      // 목록 화면이면 다시 로드
      if (document.getElementById('projects-screen').style.display !== 'none') {
        loadProjects();
      }
    }
  } catch (err) {
    console.warn('마이그레이션 실패:', err);
  }
}

async function loadProjects() {
  const grid = document.getElementById('projects-grid');
  const empty = document.getElementById('projects-empty');

  let list = [];

  if (window.currentUser) {
    // ☁️ 클라우드에서 불어오기
    try {
      const { data, error } = await window.supabaseClient
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      list = (data || []).map(p => ({
        id: p.id,
        title: p.title,
        updatedAt: new Date(p.updated_at).getTime(),
        _cloud: true,
        data: p.data // 클라우드 데이터 통째로 들고 있음
      }));
    } catch (err) {
      console.error('클라우드 프로젝트 로드 에러:', err);
      toast('클라우드 프로젝트를 불러오지 못했습니다. 로컬 데이터를 표시합니다.');
      // fallback to local
      const raw = localStorage.getItem('tripai_projects');
      if (raw) list = JSON.parse(raw);
    }
  } else {
    // 로그아웃 상태에서는 사용자의 기록을 보이지 않게 함
    list = [];
  }

  // 삭제처리 필터링 (로컬)
  list = list.filter(p => !p.deleted);

  if (list.length === 0) {
    grid.style.display = 'none';
    empty.style.display = 'flex';

    // 로그인 여부에 따라 빈 화면 문구 변경
    const emptyTitle = empty.querySelector('.projects-empty-title');
    const emptySub = empty.querySelector('.projects-empty-sub');
    if (!window.currentUser) {
      if (emptyTitle) emptyTitle.textContent = '로그인이 필요합니다';
      if (emptySub) emptySub.textContent = '로그인하여 나만의 여행 기록을 확인해보세요';
    } else {
      if (emptyTitle) emptyTitle.textContent = '아직 저장된 여행이 없어요';
      if (emptySub) emptySub.textContent = '새 여행을 만들어 일정을 계획해보세요';
    }
  } else {
    empty.style.display = 'none';
    grid.style.display = 'grid';
    // 최신순 정렬
    list.sort((a,b) => b.updatedAt - a.updatedAt);
    grid.innerHTML = list.map(p => {
      let dest, theme, dayCount, depDate, retDate, airport, hotel;
      if (p._cloud && p.data) {
        dest = p.data.schedule?.dest || p.title;
        theme = p.data.schedule?.theme || '';
        dayCount = p.data.schedule?.days || 0;
        depDate = p.data.flight?.depDate || '';
        retDate = p.data.flight?.retDate || '';
        airport = p.data.flight?.airport || '';
        hotel = p.data.flight?.hotel || '';
      } else {
        const schedD = JSON.parse(localStorage.getItem(`tripai_schedule_${p.id}`) || '{}');
        const flightD = JSON.parse(localStorage.getItem(`tripai_flight_${p.id}`) || '{}');
        dest = schedD.dest || p.dest || p.title;
        theme = schedD.theme || p.theme || '';
        dayCount = schedD.days || p.dayCount || 0;
        depDate = flightD.depDate || p.depDate || '';
        retDate = flightD.retDate || p.retDate || '';
        airport = flightD.airport || p.airport || '';
        hotel = flightD.hotel || p.hotel || '';
      }
      
      const nights = dayCount || 0;
      const fmtD = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '';
      const dateStr = (depDate && retDate) ? `${fmtD(depDate)} → ${fmtD(retDate)} · ${nights}박 ${nights+1}일` : '';
      const updated = p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour:'2-digit', minute:'2-digit' }) : '';
      
      return `
      <div class="project-card" onclick="openProject('${p.id}', ${p._cloud ? 'true' : 'false'})">
        <div class="project-card-dest">✈ ${dest || '여행'} ${p._cloud ? '☁️' : ''}</div>
        <div class="project-card-meta">
          ${dateStr ? `<div class="project-card-dates">${dateStr}</div>` : ''}
          <div class="project-card-chips">
            ${theme ? `<span class="project-card-chip">${theme}</span>` : ''}
            ${airport ? `<span class="project-card-chip sky">✈ ${airport}</span>` : ''}
            ${hotel ? `<span class="project-card-chip sky">🏨 ${hotel}</span>` : ''}
          </div>
        </div>
        <div class="project-card-footer">
          <div class="project-card-updated">수정: ${updated}</div>
          <button class="project-card-delete" onclick="event.stopPropagation();deleteProject('${p.id}', ${p._cloud ? 'true' : 'false'})">&#x2715; 삭제</button>
        </div>
      </div>`;
    }).join('');
  }
}

async function saveCurrentProject() {
  if (!st.dest) return;
  const ts = Date.now();
  const projTitle = `${st.dest} 여행 (${st.dayCount}박)`;
  st.projectId = st.projectId || `proj_${ts}_${Math.random().toString(36).substr(2,9)}`;

  const flightLS = JSON.parse(localStorage.getItem('tripai_flight') || '{}');
  const dataToSave = {
    schedule: { dest: st.dest, theme: st.theme, days: st.dayCount, activities: [...st.activeCats] },
    flight: { airport: st.airport, hotel: st.hotel, depDate: flightLS.depDate || '', retDate: flightLS.retDate || '' },
    places: st.places,
    userPlaces: st.userPlaces,
    schedData: st.schedule,
  };

  if (window.currentUser) {
    // ☁️ 클라우드 저장
    try {
      // 기존 클라우드 ID면 update, 아니면(새로 생성되었거나 로컬ID면) insert
      let isUpdate = false;
      // UUID 포맷인지 간단 체크 (Supabase ID)
      if (st.projectId.length === 36 && st.projectId.includes('-')) {
        isUpdate = true;
      }

      if (isUpdate) {
        const { error } = await window.supabaseClient
          .from('projects')
          .update({
            title: projTitle,
            data: dataToSave,
            updated_at: new Date().toISOString()
          })
          .eq('id', st.projectId);
        if (error) throw error;
      } else {
        const { data, error } = await window.supabaseClient
          .from('projects')
          .insert([{
            user_id: window.currentUser.id,
            title: projTitle,
            data: dataToSave
          }])
          .select();
        if (error) throw error;
        if (data && data[0]) {
          st.projectId = data[0].id; // DB에서 생성된 UUID 할당
        }
      }
      toast('☁️ 클라우드에 자동 저장됨');
    } catch (err) {
      console.error('클라우드 저장 실패:', err);
      // fallback to local save below
    }
  }

  // 항상 로컬에도 최신본 백업 (오프라인/에러 대비)
  let list = [];
  const raw = localStorage.getItem('tripai_projects');
  if (raw) list = JSON.parse(raw);
  
  const idx = list.findIndex(p => p.id === st.projectId);
  if (idx > -1) {
    list[idx].updatedAt = ts;
    list[idx].title = projTitle;
  } else {
    list.push({ id: st.projectId, title: projTitle, updatedAt: ts });
  }
  localStorage.setItem('tripai_projects', JSON.stringify(list));

  localStorage.setItem(`tripai_schedule_${st.projectId}`, JSON.stringify(dataToSave.schedule));
  localStorage.setItem(`tripai_flight_${st.projectId}`, JSON.stringify(dataToSave.flight));
  localStorage.setItem(`tripai_places_${st.projectId}`, JSON.stringify(st.places));
  localStorage.setItem(`tripai_userplaces_${st.projectId}`, JSON.stringify(st.userPlaces));
  localStorage.setItem(`tripai_sched_${st.projectId}`, JSON.stringify(st.schedule));
}

async function openProject(pid, isCloud) {
  try {
    let schedD, flightD, placesD, uPlacesD, schedItemsD;

    if (isCloud && window.currentUser) {
      const { data, error } = await window.supabaseClient
        .from('projects')
        .select('data')
        .eq('id', pid)
        .single();
      
      if (error) throw error;
      if (data && data.data) {
        schedD = data.data.schedule;
        flightD = data.data.flight;
        placesD = data.data.places;
        uPlacesD = data.data.userPlaces;
        schedItemsD = data.data.schedData;
      }
    } else {
      schedD = JSON.parse(localStorage.getItem(`tripai_schedule_${pid}`));
      flightD = JSON.parse(localStorage.getItem(`tripai_flight_${pid}`));
      placesD = JSON.parse(localStorage.getItem(`tripai_places_${pid}`));
      uPlacesD = JSON.parse(localStorage.getItem(`tripai_userplaces_${pid}`));
      schedItemsD = JSON.parse(localStorage.getItem(`tripai_sched_${pid}`));
    }

    if (!schedD) { toast('프로젝트 데이터를 찾을 수 없습니다.'); return; }

    st.projectId = pid;
    st.dest = schedD.dest;
    st.theme = schedD.theme;
    st.dayCount = schedD.days;
    st.activeCats = new Set(schedD.activities || ['관광','맛집','카페','쇼핑','휴식']);

    st.airport = flightD?.airport || '';
    st.hotel = flightD?.hotel || '';
    
    st.places = placesD || [];
    st.userPlaces = uPlacesD || [];
    st.schedule = schedItemsD || {};
    
    if (Object.keys(st.schedule).length === 0) {
      for (let d = 1; d <= st.dayCount; d++) st.schedule[d] = {};
    }

    // 화면 전환
    document.getElementById('projects-screen').style.display = 'none';
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('main-screen').classList.add('visible');
    history.pushState({ screen: 'main' }, '');

    buildMainScreen();
    renderBlocks();
    toast(`📂 ${st.dest} 여행을 불러왔습니다`);

    // 지도 연동
    if (st.mapsLoaded && st.mapsApiKey && window.google?.maps) {
      new google.maps.Geocoder().geocode({ address: st.dest }, (results, status) => {
        if (status === 'OK' && results[0]) {
          st.destLatLng = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
          };
          renderGoogleMap();
        }
      });
    }
  } catch(e) {
    console.error('프로젝트 열기 실패:', e);
    toast('프로젝트를 불러오는 중 오류가 발생했습니다.');
  }
}

async function deleteProject(pid, isCloud) {
  if (!confirm('정말 이 프로젝트를 삭제하시겠습니까?')) return;
  
  if (isCloud && window.currentUser) {
    try {
      const { error } = await window.supabaseClient
        .from('projects')
        .delete()
        .eq('id', pid);
      if (error) throw error;
      toast('🗑 클라우드에서 삭제되었습니다.');
    } catch (err) {
      console.error('삭제 도중 에러:', err);
      toast('삭제에 실패했습니다.');
      return;
    }
  }

  // 로컬에서도 삭제 처리 (클라우드 삭제 성공 여부와 무관하게 로컬의 잔재를 지움)
  let list = [];
  const raw = localStorage.getItem('tripai_projects');
  if (raw) list = JSON.parse(raw);
  const idx = list.findIndex(p => p.id === pid);
  if (idx > -1) {
    list[idx].deleted = true; // 소프트 딜리트
    localStorage.setItem('tripai_projects', JSON.stringify(list));
  }
  
  // 세부 데이터 하드 삭제
  localStorage.removeItem(`tripai_schedule_${pid}`);
  localStorage.removeItem(`tripai_flight_${pid}`);
  localStorage.removeItem(`tripai_places_${pid}`);
  localStorage.removeItem(`tripai_userplaces_${pid}`);
  localStorage.removeItem(`tripai_sched_${pid}`);
  
  if (!isCloud || !window.currentUser) {
    toast('🗑 로컬에서 삭제되었습니다.');
  }
  
  loadProjects();
}

function clearAIPreviewMap() {
  // 미리보기 제거
  st.previewMarkers.forEach(m => m.setMap(null));
  st.previewMarkers = [];
  if (st.previewPolyline) { st.previewPolyline.setMap(null); st.previewPolyline = null; }
  // 기존 마커/경로 불투명도 복원
  st.mapMarkers.forEach(m => {
    const ic = m.getIcon();
    if (ic) m.setIcon({ ...ic, fillOpacity: 1, strokeOpacity: 1 });
    const lbl = m.getLabel();
    if (lbl) m.setLabel({ ...lbl, color: '#ffffff' });
  });
  if (st.mapPolyline) st.mapPolyline.setOptions({ strokeOpacity: 0.85 });
}

function applyOptimization() {
  const day      = st._aiOptDay || 1;
  const dayItems = st._aiDayItems || Object.entries(st.schedule[day]).sort(([a],[b]) => a.localeCompare(b));
  const places   = dayItems.map(([,p]) => p);
  const keys     = dayItems.map(([t]) => t);

  // Use optimizedOrder if provided, else rotate first two
  const orderedNames = st.pendingOpt?.optimizedOrder;
  if (orderedNames && orderedNames.length >= 2) {
    const newOrder = orderedNames
      .map(name => places.find(p => p.name === name))
      .filter(Boolean);
    // Fill in any unmatched places
    places.forEach(p => { if (!newOrder.includes(p)) newOrder.push(p); });
    newOrder.forEach((p, i) => { if (keys[i]) st.schedule[day][keys[i]] = p; });
  } else if (places.length >= 2) {
    const newOrder = [places[1], places[0], ...places.slice(2)];
    newOrder.forEach((p, i) => { st.schedule[day][keys[i]] = p; });
  }

  clearAIPreviewMap();
  renderMultiTimeline();
  if (st.mapsLoaded) renderGoogleMap();
  closeAIPanel();
  toast('✦ AI 추천 순서로 일정이 재배치됐어요!');
}

function closeAIPanel() {
  document.getElementById('ai-panel').classList.remove('open');
  const summaryBox = document.getElementById('ai-summary-box');
  if (summaryBox) summaryBox.style.display = 'none';
  clearAIPreviewMap();
}

/* ══ Init ══ */
(function init() {
  // localStorage에 사용자가 직접 등록한 키가 있으면 우선 사용, 없으면 코드 내장 키 유지
  const savedMapsKey = localStorage.getItem('tripai_maps_key');
  if (savedMapsKey) st.mapsApiKey = savedMapsKey;
  // geminiApiKey는 Vercel 서버리스 함수 사용으로 프론트엔드 키 불필요

  updateKeyStatuses();

  // Load Maps API if key already saved
  if (st.mapsApiKey) loadGoogleMapsAPI();

  // Default dates: 2 months from now, 5-night trip
  const d1 = new Date(); d1.setMonth(d1.getMonth() + 2); d1.setDate(15);
  const d2 = new Date(d1); d2.setDate(d2.getDate() + 5);
  const fmt = d => d.toISOString().split('T')[0];
  document.getElementById('dep-date').value = fmt(d1);
  document.getElementById('ret-date').value = fmt(d2);
  onDateChange();

  // 앱 시작: Projects 홈으로
  initApp();

  // 브라우저 뒤로가기 처리
  window.addEventListener('popstate', (e) => {
    const screen = e.state?.screen;
    if (screen === 'projects' || !screen) {
      showProjectsScreen();
    } else if (screen === 'setup') {
      document.getElementById('projects-screen').style.display = 'none';
      document.getElementById('setup-screen').style.display = '';
      document.getElementById('main-screen').classList.remove('visible');
    } else if (screen === 'main') {
      document.getElementById('setup-screen').style.display = 'none';
      document.getElementById('main-screen').classList.add('visible');
    }
  });
})();

/* ════════ PROJECTS 화면 라우팅 ════════ */

function initApp() { showProjectsScreen(); }

function showProjectsScreen() {
  document.getElementById('projects-screen').style.display = '';
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('main-screen').classList.remove('visible');
  loadProjects();
}

function goProjects() {
  saveCurrentProject();
  showProjectsScreen();
  history.pushState({ screen: 'projects' }, '');
}

function createNewProject() {
  st.dest=''; st.destLatLng=null; st.theme='';
  st.dayCount=1; st.airport=''; st.hotel='';
  st.hotelLatLng=null; st.hotelAddress='';
  st.schedule={}; st.places=[]; st.userPlaces=[];
  st.projectId=null;

  _currentStep = 1;
  document.querySelectorAll('.setup-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step-1')?.classList.add('active');
  const pb = document.getElementById('setup-progress-bar');
  if (pb) pb.style.width = '20%';
  const si = document.getElementById('setup-step-indicator');
  if (si) si.textContent = '1 / 5';

  document.getElementById('projects-screen').style.display = 'none';
  document.getElementById('setup-screen').style.display = '';
  history.pushState({ screen: 'setup' }, '');
}


