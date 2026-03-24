/* ── Confirm section from previous cards ── */
const WEATHER_LABELS = {
  sunny:'☀️ 맑고 따뜻함', hot:'🌡️ 폭염·더움',
  rain:'🌧️ 비·우기',     cold:'🧥 추움·겨울',
  snow:'❄️ 눈·설경',      mild:'🌤️ 선선·쾌적',
};

function loadPreviousData() {
  const flight   = JSON.parse(localStorage.getItem('tripai_flight')   || 'null');
  const schedule = JSON.parse(localStorage.getItem('tripai_schedule') || 'null');
  if (!flight && !schedule) return; // nothing to show

  const dest    = schedule?.dest    || flight?.dest    || '';
  const days    = schedule?.days    || flight?.nights  || 3;
  const weather = flight?.weather   || 'mild';
  const theme   = schedule?.theme   || '일반';
  const acts    = schedule?.activities || ['관광','맛집'];
  const dep     = flight?.depDate   || '';
  const ret     = flight?.retDate   || '';

  const dateStr = dep && ret
    ? `${new Date(dep).toLocaleDateString('ko-KR',{month:'short',day:'numeric'})} ~ ${new Date(ret).toLocaleDateString('ko-KR',{month:'short',day:'numeric'})}`
    : `${days}박 ${days+1}일`;

  const rows = [
    { icon:'✈️', label:'여행지',   value: dest,                   field:'dest-prev',    type:'text',   placeholder:'예: 도쿄' },
    { icon:'📅', label:'기간',     value: dateStr,                field:'date-prev',    type:'text',   placeholder:'예: 3박 4일', readonly:true },
    { icon:'🌤️', label:'날씨',     value: WEATHER_LABELS[weather],field:'weather-prev', type:'select', options: Object.entries(WEATHER_LABELS) },
    { icon:'🎯', label:'여행 테마', value: theme,                  field:'theme-prev',   type:'text',   placeholder:'예: 미식여행' },
    { icon:'🏃', label:'활동',     value: acts.join(', '),        field:'acts-prev',    type:'text',   placeholder:'예: 관광, 맛집' },
  ];

  const container = document.getElementById('confirm-rows');
  container.innerHTML = rows.map(r => {
    if (r.type === 'select') {
      const opts = r.options.map(([v,l]) =>
        `<option value="${v}" ${WEATHER_LABELS[weather]===l?'selected':''}>${l}</option>`).join('');
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid var(--border2);border-radius:var(--rs)">
          <span style="font-size:16px;width:24px">${r.icon}</span>
          <span style="font-size:11px;font-weight:700;color:var(--muted);min-width:60px">${r.label}</span>
          <select id="${r.field}" style="flex:1;background:transparent;border:none;color:var(--text);font-family:Inter,sans-serif;font-size:13px;font-weight:600;outline:none;cursor:pointer">${opts}</select>
        </div>`;
    }
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid var(--border2);border-radius:var(--rs)">
        <span style="font-size:16px;width:24px">${r.icon}</span>
        <span style="font-size:11px;font-weight:700;color:var(--muted);min-width:60px">${r.label}</span>
        <input id="${r.field}" type="text" value="${r.value}" placeholder="${r.placeholder}" ${r.readonly?'readonly':''}
          style="flex:1;background:transparent;border:none;color:var(--text);font-family:Inter,sans-serif;font-size:13px;font-weight:600;outline:none;${r.readonly?'cursor:default;color:var(--muted)':''}"/>
        ${!r.readonly?`<span style="font-size:10px;color:var(--dim)">수정 가능</span>`:''}
      </div>`;
  }).join('');

  // Store parsed nights separately
  document.getElementById('confirm-section').dataset.nights = days;
  document.getElementById('confirm-section').dataset.weather = weather;
  document.getElementById('confirm-section').style.display = 'block';
  // Hide the manual form by default
  document.getElementById('manual-wrap').style.display = 'none';
}

function confirmAndGenerate() {
  // Read from confirm rows
  const destEl    = document.getElementById('dest-prev');
  const weatherEl = document.getElementById('weather-prev');
  const themeEl   = document.getElementById('theme-prev');
  const actsEl    = document.getElementById('acts-prev');
  const nights    = parseInt(document.getElementById('confirm-section').dataset.nights) || 3;

  st.dest     = destEl?.value.trim() || '여행지';
  st.days     = nights;
  st.weather  = weatherEl?.value || 'mild';
  st.theme    = themeEl?.value.trim() || '일반';

  // Parse activities from comma-separated string
  if (actsEl?.value) {
    st.activities = new Set(actsEl.value.split(',').map(a => a.trim()).filter(Boolean));
  }

  st.apiKey = localStorage.getItem('tripai_key') || '';
  st.checkedItems.clear();

  const items = buildPackList();
  st.allItems = items;
  renderSummary();
  renderList(items);
  document.getElementById('result-wrap').classList.add('visible');
  document.getElementById('result-wrap').scrollIntoView({ behavior:'smooth', block:'start' });
  updateProgress();

  if (st.apiKey) fetchAITip(); else showFallbackTip();
}

function showManualForm() {
  document.getElementById('confirm-section').style.display = 'none';
  document.getElementById('manual-wrap').style.display = 'block';
  document.getElementById('manual-wrap').scrollIntoView({ behavior:'smooth', block:'start' });
}

/* ── Rule-based packing database ── */
const PACK_DB = {
  서류: [
    { icon:'🛂', name:'여권', reason:'필수', always:true },
    { icon:'✈️', name:'항공권 (e-티켓)', reason:'필수', always:true },
    { icon:'🏨', name:'숙소 예약 확인서', reason:'필수', always:true },
    { icon:'💊', name:'여행자 보험 서류', reason:'권장', always:false },
    { icon:'💳', name:'해외 결제 카드', reason:'필수', always:true },
    { icon:'💵', name:'현지 소액 현금', reason:'현지 결제', always:true },
    { icon:'📋', name:'비자 서류', reason:'국가별 확인', always:false },
  ],
  의류: [
    { icon:'👕', name:'상의', reason:'일수만큼 + 여분 1장', always:true, days:true },
    { icon:'👖', name:'하의', reason:'일수 ÷ 2 + 여분', always:true, days:true },
    { icon:'🩲', name:'속옷', reason:'일수만큼 + 여분', always:true, days:true },
    { icon:'🧦', name:'양말', reason:'일수만큼 + 여분', always:true, days:true },
    { icon:'👟', name:'편한 운동화', reason:'걷기 많은 여행', always:true },
    { icon:'🧴', name:'세탁용 물빨래 세제', reason:'장기 여행', always:false, longTrip:true },
  ],
  세면도구: [
    { icon:'🪥', name:'칫솔·치약', reason:'필수', always:true },
    { icon:'🧴', name:'샴푸·컨디셔너', reason:'소용량 비행기형', always:true },
    { icon:'🧼', name:'세안 클렌저', reason:'필수', always:true },
    { icon:'💆', name:'스킨케어 기초템', reason:'건조한 기내 대비', always:true },
    { icon:'🪒', name:'면도기', reason:'필수', always:true },
    { icon:'💊', name:'비상 약 (두통·소화·지사제)', reason:'여행지 약 구하기 어려움', always:true },
    { icon:'🩹', name:'반창고·밴드', reason:'응급 처치', always:true },
  ],
  전자기기: [
    { icon:'📱', name:'스마트폰 + 충전기', reason:'필수', always:true },
    { icon:'🔌', name:'해외 어댑터', reason:'국가별 콘센트 다름', always:true },
    { icon:'🔋', name:'보조 배터리', reason:'장시간 외출', always:true },
    { icon:'🎧', name:'이어폰/헤드폰', reason:'비행기·이동 중', always:false },
    { icon:'📷', name:'카메라', reason:'여행 기록', always:false },
    { icon:'💻', name:'노트북', reason:'업무·장기 여행', always:false, longTrip:true },
  ],
  기타: [
    { icon:'🎒', name:'작은 데이백', reason:'일일 외출용', always:true },
    { icon:'🔒', name:'자물쇠', reason:'호스텔·짐 보관', always:false },
    { icon:'💊', name:'멀미약', reason:'이동 많은 일정', always:false },
    { icon:'🛁', name:'슬리퍼', reason:'숙소·장거리 비행', always:true },
  ],
};

/* ── Weather-specific additions ── */
const WEATHER_ITEMS = {
  sunny: [
    { icon:'☀️', name:'선크림 (SPF 50+)', reason:'자외선 차단 필수', badge:'weather' },
    { icon:'🧢', name:'모자·선글라스', reason:'강한 햇빛 대비', badge:'weather' },
    { icon:'💧', name:'텀블러·물병', reason:'수분 보충', badge:'weather' },
  ],
  hot: [
    { icon:'☀️', name:'선크림 (SPF 50+)', reason:'폭염 필수', badge:'weather' },
    { icon:'🌂', name:'양산', reason:'폭염 대비', badge:'weather' },
    { icon:'💧', name:'보냉 물병', reason:'수분 보충 필수', badge:'weather' },
    { icon:'🧊', name:'쿨링 스프레이', reason:'더위 완화', badge:'weather' },
    { icon:'👙', name:'민소매·반바지 여분', reason:'땀 많은 더위', badge:'weather' },
  ],
  rain: [
    { icon:'☂️', name:'우산 (접이식)', reason:'우기 필수', badge:'weather' },
    { icon:'🌧️', name:'방수 재킷', reason:'갑작스러운 비 대비', badge:'weather' },
    { icon:'👢', name:'방수 신발', reason:'빗길 이동', badge:'weather' },
    { icon:'🎒', name:'방수 가방 커버', reason:'짐 보호', badge:'weather' },
  ],
  cold: [
    { icon:'🧥', name:'두꺼운 겨울 코트', reason:'방한 필수', badge:'weather' },
    { icon:'🧣', name:'목도리·장갑·귀마개', reason:'방한 세트', badge:'weather' },
    { icon:'🔥', name:'핫팩', reason:'야외 활동 대비', badge:'weather' },
    { icon:'👢', name:'방한 부츠', reason:'눈·한파 대비', badge:'weather' },
  ],
  snow: [
    { icon:'❄️', name:'방수 패딩 점퍼', reason:'눈 날씨 필수', badge:'weather' },
    { icon:'🧤', name:'방수 장갑', reason:'눈 대비', badge:'weather' },
    { icon:'👢', name:'방수 스노우 부츠', reason:'눈길 보행', badge:'weather' },
    { icon:'🧣', name:'두꺼운 목도리', reason:'방한 필수', badge:'weather' },
    { icon:'🔥', name:'핫팩', reason:'설경 외출 시', badge:'weather' },
  ],
  mild: [
    { icon:'🧥', name:'가벼운 재킷·가디건', reason:'아침·저녁 선선함', badge:'weather' },
    { icon:'☀️', name:'선크림', reason:'낮 자외선 대비', badge:'weather' },
  ],
};

/* ── Activity-specific additions ── */
const ACTIVITY_ITEMS = {
  해변: [
    { icon:'👙', name:'수영복', reason:'해변 필수', badge:'activity' },
    { icon:'🏖️', name:'비치 타월', reason:'해변 필수', badge:'activity' },
    { icon:'🕶️', name:'선글라스', reason:'바다 반사 자외선', badge:'activity' },
    { icon:'👟', name:'샌들', reason:'모래사장 이동', badge:'activity' },
  ],
  수영: [
    { icon:'🩱', name:'수영복', reason:'수영 필수', badge:'activity' },
    { icon:'🥽', name:'수경', reason:'수영 편의', badge:'activity' },
    { icon:'🧴', name:'방수 선크림', reason:'수영 후 자외선', badge:'activity' },
  ],
  등산: [
    { icon:'🥾', name:'등산화', reason:'등산 필수', badge:'activity' },
    { icon:'🎒', name:'등산용 배낭', reason:'물·간식 휴대', badge:'activity' },
    { icon:'🧦', name:'두꺼운 양말', reason:'발 보호', badge:'activity' },
    { icon:'🥤', name:'물·간식', reason:'에너지 보충', badge:'activity' },
    { icon:'🧲', name:'등산 스틱', reason:'무릎 보호', badge:'activity' },
  ],
  스키: [
    { icon:'⛷️', name:'스키복 (상하의)', reason:'스키 필수', badge:'activity' },
    { icon:'🥽', name:'스키 고글', reason:'설원 자외선·바람', badge:'activity' },
    { icon:'🧤', name:'방수 장갑', reason:'스키 필수', badge:'activity' },
    { icon:'🧢', name:'비니 모자', reason:'방한', badge:'activity' },
    { icon:'🔥', name:'핫팩', reason:'슬로프 추위 대비', badge:'activity' },
  ],
  캠핑: [
    { icon:'⛺', name:'텐트·침낭', reason:'캠핑 필수', badge:'activity' },
    { icon:'🔦', name:'랜턴·헤드램프', reason:'야간 활동', badge:'activity' },
    { icon:'🍳', name:'캠핑 취사 도구', reason:'직접 요리', badge:'activity' },
    { icon:'🦟', name:'모기 기피제', reason:'야외 필수', badge:'activity' },
  ],
  나이트라이프: [
    { icon:'👗', name:'드레스 코드 의류', reason:'클럽·바 입장', badge:'activity' },
    { icon:'👠', name:'드레스 슈즈', reason:'나이트 외출', badge:'activity' },
    { icon:'💊', name:'숙취 해소제', reason:'음주 대비', badge:'activity' },
  ],
  미술관: [
    { icon:'👟', name:'편한 운동화', reason:'장시간 서있기', badge:'activity' },
    { icon:'📓', name:'노트·펜', reason:'메모 관람', badge:'activity' },
  ],
  쇼핑: [
    { icon:'🛍️', name:'여분 가방 (접이식)', reason:'쇼핑 짐 대비', badge:'activity' },
    { icon:'💳', name:'면세 서류·영수증 봉투', reason:'면세 환급', badge:'activity' },
  ],
};

/* ── Theme-specific additions ── */
const THEME_ITEMS = {
  미식: [
    { icon:'📸', name:'카메라·폰 거치대', reason:'음식 사진 촬영', badge:'theme' },
    { icon:'📓', name:'맛집 노트·지도 출력', reason:'예약 정보 관리', badge:'theme' },
  ],
  커플: [
    { icon:'💐', name:'작은 기념품·선물', reason:'여행 중 서프라이즈', badge:'theme' },
    { icon:'📸', name:'미니 삼각대', reason:'커플 사진 촬영', badge:'theme' },
  ],
  나홀로: [
    { icon:'📚', name:'책·킨들', reason:'이동 중 독서', badge:'theme' },
    { icon:'🔒', name:'가방 자물쇠', reason:'홀로 여행 보안', badge:'theme' },
  ],
  가족: [
    { icon:'🩹', name:'구급 약 키트 (풍부하게)', reason:'아이 포함 여행', badge:'theme' },
    { icon:'🧸', name:'아이 장난감·간식', reason:'이동 중 달래기', badge:'theme' },
    { icon:'🚗', name:'유아용 시트벨트 커버', reason:'렌터카 사용 시', badge:'theme' },
  ],
  액티비티: [
    { icon:'💊', name:'근육통 파스·진통제', reason:'활동 후 회복', badge:'theme' },
    { icon:'🩺', name:'스포츠 테이프', reason:'부상 예방', badge:'theme' },
  ],
  비즈니스: [
    { icon:'💼', name:'비즈니스 정장·셔츠', reason:'미팅·행사', badge:'theme' },
    { icon:'💻', name:'노트북·어댑터', reason:'업무 필수', badge:'theme' },
    { icon:'📇', name:'명함', reason:'네트워킹', badge:'theme' },
  ],
};

/* ── State ── */
const st = {
  dest: '', days: 3, weather: 'sunny', theme: '일반',
  activities: new Set(['관광','맛집']),
  apiKey: '', checkedItems: new Set(), allItems: [],
};

/* ── Utils ── */
let _tt;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(_tt); _tt = setTimeout(() => el.classList.remove('show'), 2800);
}
function openModal()  { document.getElementById('modal').classList.add('open'); document.getElementById('key-input').value = st.apiKey; }
function closeModal() { document.getElementById('modal').classList.remove('open'); }
function saveKey()    {
  const v = document.getElementById('key-input').value.trim();
  if (!v) { toast('API Key를 입력하세요'); return; }
  st.apiKey = v; localStorage.setItem('tripai_key', v);
  closeModal(); toast('✅ API Key 저장됨');
}

/* Activity chips */
document.getElementById('act-chips').addEventListener('click', e => {
  const chip = e.target.closest('.act-chip');
  if (!chip) return;
  chip.classList.toggle('on');
  const v = chip.dataset.v;
  if (st.activities.has(v)) st.activities.delete(v); else st.activities.add(v);
});

/* ── Generate packing list ── */
async function generate() {
  st.dest     = document.getElementById('dest').value.trim() || '여행지';
  st.days     = parseInt(document.getElementById('days').value);
  st.weather  = document.getElementById('weather').value;
  st.theme    = document.getElementById('theme').value;
  st.apiKey   = localStorage.getItem('tripai_key') || '';
  st.checkedItems.clear();

  const items = buildPackList();
  st.allItems = items;

  renderSummary();
  renderList(items);
  document.getElementById('result-wrap').classList.add('visible');
  document.getElementById('result-wrap').scrollIntoView({ behavior:'smooth', block:'start' });
  updateProgress();

  // AI tip
  if (st.apiKey) {
    await fetchAITip();
  } else {
    showFallbackTip();
  }
}

/* ── Rule-based packing list builder ── */
function buildPackList() {
  const days      = st.days;
  const weather   = st.weather;
  const theme     = st.theme;
  const acts      = st.activities;
  const longTrip  = days >= 5;

  const result = {};

  // Core categories
  Object.entries(PACK_DB).forEach(([cat, items]) => {
    result[cat] = items.filter(it => {
      if (it.always) return true;
      if (it.longTrip && longTrip) return true;
      return false;
    }).map(it => ({
      ...it,
      badge: 'base',
      reason: it.days ? `${days}일 기준` : it.reason,
    }));
  });

  // Weather items → 의류 or 기타
  const wItems = WEATHER_ITEMS[weather] || [];
  wItems.forEach(it => {
    const cat = ['👙','🧥','🌂','🧣','🔥','🩱','👗','👠','👢','👟'].some(e => it.icon === e) ? '의류' : '기타';
    if (!result[cat]) result[cat] = [];
    result[cat].push(it);
  });

  // Activity items
  acts.forEach(act => {
    const aItems = ACTIVITY_ITEMS[act] || [];
    aItems.forEach(it => {
      if (!result['기타']) result['기타'] = [];
      result['기타'].push(it);
    });
  });

  // Theme items
  const tItems = THEME_ITEMS[theme] || [];
  tItems.forEach(it => {
    if (!result['기타']) result['기타'] = [];
    result['기타'].push(it);
  });

  // Deduplicate by name
  Object.keys(result).forEach(cat => {
    const seen = new Set();
    result[cat] = result[cat].filter(it => {
      if (seen.has(it.name)) return false;
      seen.add(it.name); return true;
    });
  });

  return result;
}

/* ── Render ── */
function renderSummary() {
  const wLabel = { sunny:'☀️ 맑음', hot:'🌡️ 폭염', rain:'🌧️ 우기', cold:'🧥 추움', snow:'❄️ 설경', mild:'🌤️ 선선' };
  const tags = [
    `✈️ ${st.dest}`, `🗓️ ${st.days}박`, wLabel[st.weather], `${st.theme} 테마`,
    ...[...st.activities].map(a => a),
  ];
  document.getElementById('trip-summary').innerHTML = tags.map(t => `<div class="trip-tag">${t}</div>`).join('');
}

function renderList(items) {
  const container = document.getElementById('list-container');
  container.innerHTML = '';

  const order = ['서류','의류','세면도구','전자기기','기타'];
  order.forEach(cat => {
    if (!items[cat] || !items[cat].length) return;
    const sec = document.createElement('div');
    sec.className = 'cat-section';
    sec.innerHTML = `
      <div class="cat-title">
        ${{ '서류':'📋', '의류':'👗', '세면도구':'🧴', '전자기기':'📱', '기타':'📦' }[cat] || '📦'} ${cat}
        <span class="cat-count">${items[cat].length}개</span>
      </div>
      <div class="items-list" id="items-${cat}"></div>`;
    container.appendChild(sec);

    const list = sec.querySelector(`#items-${cat}`);
    items[cat].forEach((it, i) => {
      const id = `${cat}-${i}`;
      const row = document.createElement('div');
      row.className = 'pack-item'; row.id = `item-${id}`;
      row.onclick = () => toggleItem(id);
      const badgeHtml = it.badge && it.badge !== 'base'
        ? `<span class="item-badge ${it.badge}">${it.badge === 'weather' ? '날씨' : it.badge === 'activity' ? '활동' : '테마'}</span>`
        : '';
      row.innerHTML = `
        <div class="pack-checkbox"></div>
        <div class="item-icon">${it.icon}</div>
        <div style="flex:1">
          <div class="item-name">${it.name}</div>
          <div class="item-reason">${it.reason}</div>
        </div>
        ${badgeHtml}`;
      list.appendChild(row);
    });
  });
}

function toggleItem(id) {
  const row = document.getElementById(`item-${id}`);
  if (!row) return;
  if (st.checkedItems.has(id)) {
    st.checkedItems.delete(id); row.classList.remove('checked');
  } else {
    st.checkedItems.add(id);    row.classList.add('checked');
  }
  updateProgress();
}

function updateProgress() {
  const total   = document.querySelectorAll('.pack-item').length;
  const checked = st.checkedItems.size;
  document.getElementById('progress-label').textContent = `${checked} / ${total} 준비 완료`;
  document.getElementById('progress-bar').style.width   = total ? `${(checked / total) * 100}%` : '0%';
}

function checkAll() {
  document.querySelectorAll('.pack-item').forEach(row => {
    const id = row.id.replace('item-', '');
    st.checkedItems.add(id); row.classList.add('checked');
  });
  updateProgress();
  toast('✅ 전체 체크 완료!');
}

function uncheckAll() {
  document.querySelectorAll('.pack-item').forEach(row => row.classList.remove('checked'));
  st.checkedItems.clear(); updateProgress();
  toast('체크가 초기화됐어요');
}

/* ── AI tip ── */
async function fetchAITip() {
  const prompt = `
여행지: ${st.dest}, 날씨: ${st.weather}, 테마: ${st.theme}, 일수: ${st.days}박, 활동: ${[...st.activities].join(', ')}
이 여행자를 위한 짐싸기 팁 3가지를 한국어로 알려줘. 각 팁은 한 문장씩, 구체적이고 실용적으로.
JSON으로만: {"tips": ["팁1", "팁2", "팁3"]}`;

  try {
    const res  = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${st.apiKey}`,
      { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }] }) }
    );
    const data = await res.json();
    const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const json = JSON.parse(raw.replace(/```json|```/g,'').trim());
    if (json.tips?.length) {
      document.getElementById('ai-tip-text').innerHTML = json.tips.map(t => `• ${t}`).join('<br>');
      document.getElementById('ai-tip').classList.add('visible');
    }
  } catch {
    showFallbackTip();
  }
}

function showFallbackTip() {
  const tips = [];
  if (st.days >= 5) tips.push('• 장기 여행은 현지 코인 세탁소를 활용하면 짐을 줄일 수 있어요.');
  if (st.weather === 'rain' || st.weather === 'hot') tips.push(`• ${st.dest}의 현지 약국은 한국보다 저렴한 경우가 많아 상비약은 최소화해도 돼요.`);
  if (st.activities.has('쇼핑')) tips.push('• 쇼핑 여행은 귀국 짐을 위해 출국 시 캐리어를 여유 있게 챙기거나 기내 위탁 무게를 미리 확인하세요.');
  tips.push(`• ${st.dest} 공항에서 심카드를 구매하면 현지 데이터를 저렴하게 이용할 수 있어요.`);

  document.getElementById('ai-tip-text').innerHTML = tips.slice(0,3).join('<br>');
  document.getElementById('ai-tip').classList.add('visible');
}

/* ── Init ── */
(function init() {
  st.apiKey = localStorage.getItem('tripai_key') || '';
  loadPreviousData();
})();
