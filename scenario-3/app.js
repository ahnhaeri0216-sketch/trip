/* ══════════════════════════════════════
   TripAI — Scenario 3: Real-time Assistant
   상황 대응형 실시간 여행 도우미
══════════════════════════════════════ */

/* ── Weather configs ── */
const WEATHER = {
  sunny: { icon:'☀️', temp:'26°', label:'맑음 · 선크림 필수', warn:false, cls:'sun' },
  cloudy:{ icon:'⛅', temp:'21°', label:'흐림 · 가볍게 입어요', warn:false, cls:'cloud' },
  rain:  { icon:'🌧️', temp:'17°', label:'비 · 우산 필수', warn:true, warnText:'⚠️ 야외 일정 주의', cls:'rain' },
  hot:   { icon:'🌡️', temp:'35°', label:'폭염 · 수분 보충', warn:true, warnText:'⚠️ 야외 최소화 권장', cls:'hot' },
};

/* ── Sample schedules per destination ── */
const SCHEDULES = {
  '도쿄': [
    { time:'09:00', emoji:'☕', name:'츠타야 다이칸야마 카페', status:'done'     },
    { time:'11:00', emoji:'🏛️', name:'신주쿠 교엔 산책',        status:'now'      },
    { time:'13:30', emoji:'🍜', name:'이치란 라멘',              status:'upcoming' },
    { time:'15:00', emoji:'🛍️', name:'하라주쿠 쇼핑',           status:'upcoming' },
    { time:'18:30', emoji:'🌆', name:'시부야 야경 스팟',         status:'upcoming' },
  ],
  '파리': [
    { time:'09:00', emoji:'🥐', name:'파리지앵 브런치 카페',    status:'done'     },
    { time:'10:30', emoji:'🖼️', name:'루브르 박물관',            status:'now'      },
    { time:'13:00', emoji:'🥩', name:'비스트로 디너',            status:'upcoming' },
    { time:'15:00', emoji:'🗼', name:'에펠탑',                   status:'upcoming' },
    { time:'18:00', emoji:'🚢', name:'센강 크루즈',              status:'upcoming' },
  ],
  '_default': [
    { time:'09:00', emoji:'☕', name:'호텔 조식',                status:'done'     },
    { time:'10:30', emoji:'🗺️', name:'시내 중심부 탐방',         status:'now'      },
    { time:'13:00', emoji:'🍽️', name:'현지 맛집 점심',           status:'upcoming' },
    { time:'15:30', emoji:'🏛️', name:'박물관 / 명소',            status:'upcoming' },
    { time:'19:00', emoji:'🌆', name:'야경 뷰포인트',            status:'upcoming' },
  ],
};

/* ── Map pins per destination ── */
const MAP_PINS = {
  '도쿄': [
    { x:25, y:30, emoji:'☕', name:'다이칸야마', status:'done'     },
    { x:45, y:45, emoji:'🌸', name:'신주쿠 교엔',status:'current'  },
    { x:60, y:25, emoji:'🍜', name:'이치란',     status:'next'     },
    { x:75, y:55, emoji:'🛍️', name:'하라주쿠',   status:'upcoming' },
    { x:55, y:70, emoji:'🌆', name:'시부야',     status:'upcoming' },
  ],
  '파리': [
    { x:30, y:25, emoji:'🥐', name:'브런치카페', status:'done'     },
    { x:50, y:45, emoji:'🖼️', name:'루브르',     status:'current'  },
    { x:65, y:30, emoji:'🥩', name:'비스트로',   status:'next'     },
    { x:40, y:65, emoji:'🗼', name:'에펠탑',     status:'upcoming' },
    { x:55, y:70, emoji:'🚢', name:'센강',       status:'upcoming' },
  ],
  '_default': [
    { x:30, y:30, emoji:'☕', name:'카페',       status:'done'     },
    { x:50, y:45, emoji:'🗺️', name:'중심부',     status:'current'  },
    { x:65, y:25, emoji:'🍽️', name:'맛집',       status:'next'     },
    { x:70, y:60, emoji:'🏛️', name:'박물관',     status:'upcoming' },
    { x:40, y:70, emoji:'🌆', name:'야경',       status:'upcoming' },
  ],
};

/* ── Nearby places per destination ── */
const NEARBY = {
  '도쿄': [
    { emoji:'🍜', name:'스가 라멘', dist:'120m' },
    { emoji:'☕', name:'블루보틀 커피', dist:'250m' },
    { emoji:'🏪', name:'돈키호테', dist:'350m' },
  ],
  '파리': [
    { emoji:'🥗', name:'비스트로 뒤 마레', dist:'80m' },
    { emoji:'☕', name:'카페 드 플로르', dist:'200m' },
    { emoji:'🛍️', name:'갤러리 라파예트', dist:'400m' },
  ],
  '_default': [
    { emoji:'🍽️', name:'근처 맛집', dist:'150m' },
    { emoji:'☕', name:'로컬 카페', dist:'200m' },
    { emoji:'🛍️', name:'기념품 숍', dist:'300m' },
  ],
};

/* ── Quick action presets ── */
const QUICK = {
  rain:  '비가 와서 야외 일정이 힘들어. 대안 일정 알려줘.',
  food:  '배고픈데 근처에 맛있는 곳 추천해줘.',
  tired: '많이 걸어서 지쳤어. 잠깐 쉴 수 있는 곳 알려줘.',
  near:  '지금 내 위치 근처에 뭐가 있어?',
  hot:   '너무 더운데 시원하게 쉴 수 있는 곳 알려줘.',
  cafe:  '감성 카페 가고 싶어. 근처에 예쁜 카페 추천해줘.',
};

/* ── State ── */
const st = {
  dest:    '',
  dayN:    1,
  styles:  ['미식'],
  weather: 'rain',
  apiKey:  '',
  schedule:[],
  chatHistory: [],
};

/* ── Utils ── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
let _toastT;
function toast(msg, cls='') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = `toast show ${cls}`;
  clearTimeout(_toastT); _toastT = setTimeout(() => el.classList.remove('show'), 2800);
}
function openModal()  { document.getElementById('modal').classList.add('open'); document.getElementById('key-input').value = st.apiKey; }
function closeModal() { document.getElementById('modal').classList.remove('open'); }
function saveKey() {
  const v = document.getElementById('key-input').value.trim();
  if (!v) { toast('API Key를 입력하세요', 'warn'); return; }
  st.apiKey = v; localStorage.setItem('tripai_key', v);
  closeModal(); toast('✅ API Key 저장됨', 'ok');
}

/* ── Setup screen ── */
document.getElementById('style-chips').addEventListener('click', e => {
  const chip = e.target.closest('.style-chip');
  if (!chip) return;
  chip.classList.toggle('on');
  st.styles = [...document.querySelectorAll('.style-chip.on')].map(c => c.dataset.v);
});

function startMain() {
  const dest = document.getElementById('dest').value.trim();
  if (!dest) { toast('여행지를 입력하세요', 'warn'); return; }
  st.dest    = dest;
  st.dayN    = parseInt(document.getElementById('dayn').value);
  st.weather = document.getElementById('weather-sim').value;
  st.apiKey  = localStorage.getItem('tripai_key') || '';

  buildMain();
  showScreen('screen-main');

  // Welcome message after brief delay
  setTimeout(() => addAIMsg(
    `안녕하세요! ✈️ <strong>${dest}</strong> ${st.dayN}일차 실시간 도우미예요.<br>` +
    `현재 <strong>${WEATHER[st.weather].label}</strong> 날씨예요.` +
    (WEATHER[st.weather].warn ? '<br>⚠️ 야외 일정에 주의가 필요해요. 아래 빠른 질문으로 도움받아보세요!' : '<br>날씨가 괜찮으니 원래 일정대로 즐겨보세요 😊')
  ), 600);
}

/* ── Build main screen ── */
function buildMain() {
  // Header badge
  document.getElementById('map-trip-badge').textContent = `✈️ ${st.dest} ${st.dayN}일차`;
  // Clock
  updateClock();
  setInterval(updateClock, 1000);
  // Weather
  renderWeather();
  // Map
  renderMap();
  // Nearby
  renderNearby();
  // Schedule
  renderSchedule();
}

function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  document.getElementById('map-clock').textContent = `${h}:${m}`;
}

/* ── Weather ── */
function renderWeather() {
  const w = WEATHER[st.weather];
  document.getElementById('w-icon').textContent  = w.icon;
  document.getElementById('w-temp').textContent  = w.temp;
  document.getElementById('w-label').textContent = w.label;
  const warn = document.getElementById('w-warn');
  if (w.warn) { warn.style.display = ''; warn.textContent = w.warnText; } else { warn.style.display = 'none'; }
}

/* ── Map SVG ── */
function renderMap() {
  const canvas = document.getElementById('map-canvas');
  const svg    = document.getElementById('map-svg');

  // Remove existing pins
  canvas.querySelectorAll('.map-pin').forEach(p => p.remove());

  // SVG road lines
  const pins    = MAP_PINS[st.dest] || MAP_PINS['_default'];
  const points  = pins.map(p => `${p.x}%,${p.y}%`).join(' ');
  svg.innerHTML = `
    <defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <!-- Grid -->
    <g stroke="rgba(168,85,247,0.06)" stroke-width="1">
      ${Array.from({length:20},(_,i)=>`<line x1="${i*5}%" y1="0" x2="${i*5}%" y2="100%"/>`).join('')}
      ${Array.from({length:20},(_,i)=>`<line x1="0" y1="${i*5}%" x2="100%" y2="${i*5}%"/>`).join('')}
    </g>
    <!-- Route line -->
    <polyline points="${points}" fill="none" stroke="rgba(168,85,247,0.35)" stroke-width="2" stroke-dasharray="8,4" filter="url(#glow)"/>
    <!-- Done segments (solid) -->
    ${pins.filter(p=>p.status==='done').map((p,i,a)=>i<a.length-1?`
      <line x1="${p.x}%" y1="${p.y}%" x2="${a[i+1].x}%" y2="${a[i+1].y}%" stroke="rgba(100,100,150,0.4)" stroke-width="2"/>
    `:'').join('')}
  `;

  // Place pins
  pins.forEach(pin => {
    const el = document.createElement('div');
    el.className = `map-pin ${pin.status}`;
    el.style.left = `${pin.x}%`;
    el.style.top  = `${pin.y}%`;
    const color = pin.status==='current'?'var(--rose)': pin.status==='next'?'var(--cyan)': pin.status==='done'?'var(--dim)':'var(--purple)';
    el.innerHTML = `
      <div class="pin-dot" style="background:${color};color:${color}"></div>
      <div class="pin-label">${pin.emoji} ${pin.name}</div>`;
    canvas.appendChild(el);
  });
}

/* ── Nearby ── */
function renderNearby() {
  const items = NEARBY[st.dest] || NEARBY['_default'];
  document.getElementById('nearby-deck').innerHTML = items.map(n => `
    <div class="nearby-item" onclick="nearbyClick('${n.name}')">
      <div class="nearby-emoji">${n.emoji}</div>
      <div>
        <div class="nearby-name">${n.name}</div>
        <div class="nearby-dist">📍 ${n.dist}</div>
      </div>
    </div>`).join('');
}
function nearbyClick(name) {
  document.getElementById('chat-input').value = `${name} 어때?`;
  sendMsg();
}

/* ── Schedule ── */
function renderSchedule() {
  const sched = SCHEDULES[st.dest] || SCHEDULES['_default'];
  st.schedule = sched;
  document.getElementById('schedule-items').innerHTML = sched.map(s => `
    <div class="sched-item ${s.status}">
      <div class="sched-time">${s.time}</div>
      <div class="sched-emoji">${s.emoji}</div>
      <div class="sched-name">${s.name}</div>
      ${s.status==='now'?'<div class="now-tag">NOW</div>':''}
    </div>`).join('');
}

/* ── Chat ── */
function addUserMsg(text) {
  const area = document.getElementById('chat-area');
  const now  = new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
  const div  = document.createElement('div');
  div.className = 'msg user';
  div.innerHTML = `<div class="bubble">${text}</div><div class="msg-time">${now}</div>`;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

function addAIMsg(html, extras = '') {
  const area = document.getElementById('chat-area');
  // Remove typing indicator if present
  const typing = area.querySelector('.typing-wrap');
  if (typing) typing.remove();

  const now = new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
  const div = document.createElement('div');
  div.className = 'msg ai';
  div.innerHTML = `<div class="bubble">${html}</div>${extras}<div class="msg-time">${now}</div>`;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

function showTyping() {
  const area = document.getElementById('chat-area');
  const wrap = document.createElement('div');
  wrap.className = 'msg ai typing-wrap';
  wrap.innerHTML = `<div class="typing"><span></span><span></span><span></span></div>`;
  area.appendChild(wrap);
  area.scrollTop = area.scrollHeight;
}

function buildSuggestCard(title, items) {
  const rows = items.map(it => `
    <div class="suggest-item" onclick="suggestAdd('${it.name}')">
      <div class="suggest-item-emoji">${it.emoji}</div>
      <div>
        <div class="suggest-item-name">${it.name}</div>
        <div class="suggest-item-meta">${it.type} · ${it.duration}h</div>
      </div>
      <div class="suggest-item-dist">${it.dist || ''}</div>
      <button class="suggest-add" title="일정 추가">+</button>
    </div>`).join('');
  return `
    <div class="suggest-card">
      <div class="suggest-header">✦ ${title}</div>
      <div class="suggest-items">${rows}</div>
    </div>`;
}

function buildNotifCard(text) {
  return `<div class="notif" style="margin-top:6px"><div class="notif-icon">🔔</div><div class="notif-text">${text}</div></div>`;
}

function suggestAdd(name) {
  toast(`✅ "${name}" 일정에 추가됨`, 'ok');
}

/* ── Quick actions ── */
function quickAct(type) {
  const text = QUICK[type];
  document.getElementById('chat-input').value = text;
  sendMsg();
}

/* ── Send message ── */
async function sendMsg() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';

  addUserMsg(text);
  showTyping();

  st.chatHistory.push({ role:'user', text });

  if (st.apiKey) {
    await callGemini(text);
  } else {
    await new Promise(r => setTimeout(r, 900 + Math.random()*600));
    fallbackReply(text);
  }
}

/* ── Gemini API call ── */
async function callGemini(userText) {
  const w = WEATHER[st.weather];
  const nowSched = st.schedule.find(s => s.status === 'now');
  const context  = `
여행지: ${st.dest} (${st.dayN}일차)
현재 날씨: ${w.label}, ${w.temp}
현재 일정: ${nowSched ? `${nowSched.time} ${nowSched.name}` : '없음'}
여행 스타일: ${st.styles.join(', ')}
사용자 메시지: "${userText}"

JSON으로만 응답해주세요:
{
  "reply": "짧은 공감 + 안내 (2~3문장, HTML 가능, <strong> 허용)",
  "suggestions": [
    {"emoji":"이모지","name":"장소명","type":"관광|식당|카페|쇼핑|휴식","duration":1.5,"dist":"도보 Xm"}
  ],
  "notif": "알림 메시지 (선택사항, null 가능)"
}
suggestions는 2~3개. JSON만 반환.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${st.apiKey}`,
      { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contents:[{ parts:[{ text: context }] }] }) }
    );
    const data = await res.json();
    const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const json = JSON.parse(raw.replace(/```json|```/g,'').trim());

    let extras = '';
    if (json.suggestions?.length) extras += buildSuggestCard('AI 추천 대안', json.suggestions);
    if (json.notif) extras += buildNotifCard(json.notif);
    addAIMsg(json.reply || '도움을 드리기 어렵네요. 다시 시도해주세요.', extras);
  } catch {
    fallbackReply(userText);
  }
}

/* ── Fallback replies (no API key) ── */
function fallbackReply(text) {
  const t = text.toLowerCase();
  const w = WEATHER[st.weather];

  if (t.includes('비') || t.includes('우산') || t.includes('날씨')) {
    const items = [
      { emoji:'🏛️', name:`${st.dest} 국립박물관`, type:'관광', duration:2, dist:'도보 10분' },
      { emoji:'☕', name:'실내 감성 카페',         type:'카페', duration:1, dist:'도보 3분'  },
      { emoji:'🛍️', name:'대형 쇼핑몰',           type:'쇼핑', duration:2, dist:'도보 8분'  },
    ];
    addAIMsg(
      `아, <strong>비가 오고 있군요</strong> ${w.icon} 야외 일정은 잠시 미루고 실내 장소로 바꿔드릴게요!`,
      buildSuggestCard('🌧️ 비 오는 날 실내 대안', items) +
      buildNotifCard(`<strong>팁:</strong> 편의점에서 우산 구매 가능해요. 현재 기온 ${w.temp}이니 가볍게 입으세요.`)
    );
  } else if (t.includes('배고') || t.includes('먹') || t.includes('밥') || t.includes('식사')) {
    const items = [
      { emoji:'🍜', name:`${st.dest} 현지 대표 라멘`, type:'식당', duration:1, dist:'도보 5분' },
      { emoji:'🥗', name:'로컬 분위기 식당',          type:'식당', duration:1.5,dist:'도보 7분' },
      { emoji:'🍣', name:'근처 스시바',               type:'식당', duration:1, dist:'도보 3분' },
    ];
    addAIMsg(
      `배가 고프시군요! 😋 현재 위치 근처 <strong>맛집을 추천</strong>해드릴게요.`,
      buildSuggestCard('🍽️ 근처 추천 식당', items)
    );
  } else if (t.includes('지쳤') || t.includes('피곤') || t.includes('쉬') || t.includes('힘들')) {
    const items = [
      { emoji:'☕', name:'조용한 감성 카페',  type:'카페', duration:1.5,dist:'도보 4분' },
      { emoji:'🌿', name:'근처 공원 벤치',   type:'휴식', duration:1,  dist:'도보 2분' },
      { emoji:'♨️', name:'도심 스파 & 휴식', type:'휴식', duration:2,  dist:'도보 12분'},
    ];
    addAIMsg(
      `많이 피곤하시겠어요 😮‍💨 잠시 <strong>에너지를 충전</strong>할 곳을 찾아드릴게요!`,
      buildSuggestCard('😴 휴식 추천 장소', items) +
      buildNotifCard('다음 일정까지 <strong>2시간 여유</strong>가 있어요. 충분히 쉬어도 괜찮아요.')
    );
  } else if (t.includes('근처') || t.includes('주변') || t.includes('뭐 있') || t.includes('어디')) {
    const near = NEARBY[st.dest] || NEARBY['_default'];
    const items = near.map(n => ({ emoji:n.emoji, name:n.name, type:'장소', duration:1, dist:n.dist }));
    addAIMsg(
      `현재 위치 <strong>${(MAP_PINS[st.dest]||MAP_PINS['_default']).find(p=>p.status==='current')?.name || '근처'}</strong> 기준으로 가까운 곳들이에요!`,
      buildSuggestCard('📍 주변 추천 장소', items)
    );
  } else if (t.includes('더워') || t.includes('덥') || t.includes('폭염')) {
    const items = [
      { emoji:'🏪', name:'편의점 아이스크림',  type:'휴식', duration:0.5,dist:'도보 1분' },
      { emoji:'☕', name:'에어컨 실내 카페',   type:'카페', duration:1.5,dist:'도보 6분' },
      { emoji:'🏬', name:'대형 백화점 방문',   type:'쇼핑', duration:2,  dist:'도보 9분' },
    ];
    addAIMsg(
      `🌡️ <strong>정말 덥죠!</strong> 시원한 실내 공간으로 이동을 추천드려요.`,
      buildSuggestCard('🌡️ 더울 때 추천 장소', items) +
      buildNotifCard('수분 보충 잊지 마세요! 💧 페트병 생수 구매를 권장드려요.')
    );
  } else if (t.includes('카페') || t.includes('커피')) {
    const items = [
      { emoji:'☕', name:`${st.dest} 로컬 스페셜티 카페`, type:'카페', duration:1, dist:'도보 5분'  },
      { emoji:'🧋', name:'SNS 핫플 감성 카페',            type:'카페', duration:1, dist:'도보 10분' },
      { emoji:'🍰', name:'디저트 카페 & 베이커리',         type:'카페', duration:1, dist:'도보 7분'  },
    ];
    addAIMsg(
      `카페 분위기 좋죠 ☕ 근처 <strong>감성 카페</strong>를 찾아봤어요!`,
      buildSuggestCard('☕ 근처 카페 추천', items)
    );
  } else {
    addAIMsg(
      `말씀 잘 들었어요! 🤖 <strong>"${text.slice(0,20)}..."</strong>에 대한 답변이에요.<br>` +
      `현재 날씨(${w.icon} ${w.temp})와 일정을 고려해 최적의 장소를 안내드릴게요.`,
      buildNotifCard('추가로 궁금한 점이 있으시면 아래 빠른 질문 버튼이나 직접 입력해주세요!')
    );
  }
}

/* ── Init ── */
(function init() {
  st.apiKey = localStorage.getItem('tripai_key') || '';
  const d = new Date(); d.setDate(d.getDate() + 1);
  document.getElementById('sdate').value = d.toISOString().split('T')[0];
})();
