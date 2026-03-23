/* ══════════════════════════════════════
   PlanAI — Scenario 2: Block Assembly
   User + AI Collaboration Planner
══════════════════════════════════════ */

const HOUR_HEIGHT = 72;
const START_HOUR  = 8;   // 08:00
const END_HOUR    = 23;  // 23:00
const TOTAL_HOURS = END_HOUR - START_HOUR;

/* ── Block type config ── */
const TYPES = {
  '관광': { color: '#4f7cff', bg: 'rgba(79,124,255,0.14)',  emoji: '🏛️' },
  '식당': { color: '#ff6b6b', bg: 'rgba(255,107,107,0.14)', emoji: '🍜' },
  '카페': { color: '#ffd166', bg: 'rgba(255,209,102,0.14)', emoji: '☕' },
  '쇼핑': { color: '#c77dff', bg: 'rgba(199,125,255,0.14)', emoji: '🛍️' },
  '휴식': { color: '#00c9a7', bg: 'rgba(0,201,167,0.14)',   emoji: '😴' },
  '기타': { color: '#74b9ff', bg: 'rgba(116,185,255,0.14)', emoji: '📍' },
};

/* ── Fallback sample recs (used when no API key) ── */
const SAMPLE_RECS = {
  '도쿄': [
    { name: '신주쿠 교엔', type: '관광', emoji: '🌸', desc: '벚꽃 명소·대형 공원', duration: 2   },
    { name: '스카이트리 전망대', type: '관광', emoji: '🗼', desc: '도쿄 야경 한눈에', duration: 1.5 },
    { name: '이치란 라멘', type: '식당', emoji: '🍜', desc: '1인 칸막이 라멘 원조', duration: 1  },
    { name: '츠키지 시장', type: '식당', emoji: '🐟', desc: '해산물 아침 투어', duration: 1.5 },
    { name: '사루토히코 커피', type: '카페', emoji: '☕', desc: '도쿄 특급 제3 물결 카페', duration: 1 },
    { name: '하라주쿠 타케시타 거리', type: '쇼핑', emoji: '🛍️', desc: '패션·크레페 거리', duration: 2 },
    { name: '아키하바라', type: '쇼핑', emoji: '🎮', desc: '전자·애니·피규어 천국', duration: 2.5 },
    { name: '온천 료칸 입욕', type: '휴식', emoji: '♨️', desc: '피로 회복 온천욕', duration: 1.5 },
    { name: '시부야 스크램블 교차로', type: '관광', emoji: '🚦', desc: '도쿄 상징 교차로', duration: 0.5 },
    { name: '오모테산도 힐스', type: '쇼핑', emoji: '🏬', desc: '럭셔리 쇼핑몰', duration: 2 },
    { name: '요요기 공원 피크닉', type: '휴식', emoji: '🌿', desc: '현지인처럼 쉬어가기', duration: 1.5 },
    { name: '긴자 스시 오마카세', type: '식당', emoji: '🍣', desc: '정통 스시 오마카세', duration: 2 },
  ],
  '파리': [
    { name: '에펠탑', type: '관광', emoji: '🗼', desc: '파리의 상징', duration: 2 },
    { name: '루브르 박물관', type: '관광', emoji: '🖼️', desc: '세계 최대 미술관', duration: 3 },
    { name: '크루아상 카페', type: '카페', emoji: '🥐', desc: '파리지앵 아침 루틴', duration: 1 },
    { name: '르 마레 탐방', type: '쇼핑', emoji: '🛍️', desc: '빈티지·편집숍의 성지', duration: 2 },
    { name: '샹젤리제 산책', type: '관광', emoji: '🌆', desc: '파리 대로 산책', duration: 1.5 },
    { name: '오르세 미술관', type: '관광', emoji: '🎨', desc: '인상파 작품 콜렉션', duration: 2.5 },
    { name: '몽마르트르 언덕', type: '관광', emoji: '⛪', desc: '사크레쾨르 성당·예술가 거리', duration: 2 },
    { name: '비스트로 디너', type: '식당', emoji: '🥩', desc: '파리 전통 비스트로', duration: 2 },
    { name: '센강 크루즈', type: '휴식', emoji: '🚢', desc: '야경 크루즈 1시간', duration: 1 },
    { name: '갤러리 라파예트', type: '쇼핑', emoji: '🛒', desc: '파리 최대 백화점', duration: 2 },
  ],
};

/* ── State ── */
const state = {
  destination: '',
  startDate:   null,
  endDate:     null,
  partySize:   2,
  currentDay:  0,
  days:        [],   // days[dayIndex] = [ block, ... ]
  weather:     [],
  recs:        [],   // all loaded recommendations
  filter:      '전체',
  apiKey:      '',
  dragData:    null,
  blockIdSeed: 1,
};

/* ── Utils ── */
function fmtTime(t) {
  const h = Math.floor(t);
  const m = Math.round((t - h) * 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
function snapTime(raw) {
  return Math.min(Math.max(START_HOUR, Math.round(raw * 2) / 2), END_HOUR - 0.5);
}
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ─── Toast ─── */
let _toastTimer;
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

/* ─── Modal ─── */
function openModal() {
  document.getElementById('modal').classList.add('open');
  const k = localStorage.getItem('planai_key') || '';
  document.getElementById('key-input').value = k;
}
function closeModal() { document.getElementById('modal').classList.remove('open'); }
function saveKey() {
  const v = document.getElementById('key-input').value.trim();
  if (!v) { showToast('API Key를 입력해주세요', 'warning'); return; }
  state.apiKey = v;
  localStorage.setItem('planai_key', v);
  closeModal();
  showToast('✅ API Key 저장됨', 'success');
}

/* ═══════════════════════════════════════
   START BOARD
═══════════════════════════════════════ */
function startBoard() {
  const dest  = document.getElementById('destination').value.trim();
  const start = document.getElementById('start-date').value;
  const end   = document.getElementById('end-date').value;
  if (!dest)         { showToast('여행지를 입력해주세요', 'warning'); return; }
  if (!start || !end){ showToast('날짜를 선택해주세요', 'warning'); return; }

  state.destination = dest;
  state.startDate   = new Date(start);
  state.endDate     = new Date(end);
  state.partySize   = parseInt(document.getElementById('party-size').value);
  state.apiKey      = localStorage.getItem('planai_key') || '';

  const numDays = Math.max(1, Math.round((state.endDate - state.startDate) / 86400000) + 1);
  state.days = Array.from({ length: numDays }, () => []);
  state.currentDay = 0;

  buildBoard(numDays);
  showScreen('screen-board');
  loadAIRecs();
}

/* ─── Build board ─── */
function buildBoard(numDays) {
  document.getElementById('board-title').textContent = `✈️ ${state.destination}`;
  const opts = { month: 'long', day: 'numeric' };
  const s = state.startDate.toLocaleDateString('ko-KR', opts);
  const e = state.endDate.toLocaleDateString('ko-KR', opts);
  document.getElementById('board-meta').textContent = `${s} ~ ${e} · ${numDays}일 · ${state.partySize}명`;

  state.weather = buildWeather(numDays);
  renderWeatherStrip();
  buildDayTabs(numDays);
  buildTimeline();
  renderBlocks();
  updateStats();
}

function buildWeather(n) {
  const cond = [
    { icon:'☀️', label:'맑음', cls:'sun'   },
    { icon:'⛅', label:'흐림', cls:'cloud' },
    { icon:'🌧️', label:'비',   cls:'rain'  },
    { icon:'🌤️', label:'구름', cls:'sun'   },
  ];
  const temps = [12,15,18,20,22,24,26,28];
  return Array.from({ length: n }, (_, i) => {
    const c = cond[Math.floor(Math.random() * cond.length)];
    const t = temps[Math.floor(Math.random() * temps.length)];
    return { day: i+1, ...c, temp: t };
  });
}
function renderWeatherStrip() {
  document.getElementById('weather-strip').innerHTML = state.weather.map((w,i) =>
    `<div class="weather-chip ${w.cls}" onclick="switchDay(${i})" title="${w.label}">
       ${w.icon} Day${w.day}·${w.temp}°
     </div>`
  ).join('');
}

/* ─── Day tabs ─── */
function buildDayTabs(n) {
  const container = document.getElementById('day-tabs');
  container.innerHTML = Array.from({ length: n }, (_, i) => {
    const d = new Date(state.startDate);
    d.setDate(d.getDate() + i);
    const label = d.toLocaleDateString('ko-KR', { month:'numeric', day:'numeric', weekday:'short' });
    return `<button class="day-tab ${i===0?'active':''}" id="dtab-${i}" onclick="switchDay(${i})">${i+1}일차 · ${label}</button>`;
  }).join('');
}
function switchDay(i) {
  state.currentDay = i;
  document.querySelectorAll('.day-tab').forEach((t,j) => t.classList.toggle('active', i===j));
  renderBlocks();
  updateStats();
}

/* ─── Timeline ─── */
function buildTimeline() {
  const wrapper = document.getElementById('timeline-wrapper');
  wrapper.innerHTML = '';
  wrapper.style.minHeight = `${TOTAL_HOURS * HOUR_HEIGHT + 40}px`;
  wrapper.style.paddingLeft = '58px';
  wrapper.style.position = 'relative';

  // Time markers + hour lines
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    const top = (h - START_HOUR) * HOUR_HEIGHT;
    const marker = document.createElement('div');
    marker.className = 'time-marker';
    marker.style.cssText = `top:${top}px`;
    marker.textContent = `${h}:00`;
    wrapper.appendChild(marker);

    if (h < END_HOUR) {
      const line = document.createElement('div');
      line.className = 'hour-line';
      line.style.cssText = `position:absolute;left:0;right:0;top:${top}px`;
      wrapper.appendChild(line);
      const half = document.createElement('div');
      half.className = 'hour-line half';
      half.style.cssText = `position:absolute;left:0;right:0;top:${top + HOUR_HEIGHT/2}px`;
      wrapper.appendChild(half);
    }
  }

  // Drop zone
  const dz = document.createElement('div');
  dz.id = 'drop-zone';
  dz.className = 'drop-zone';
  dz.style.cssText = `height:${TOTAL_HOURS * HOUR_HEIGHT}px;top:0;left:0;right:0;position:absolute`;
  dz.addEventListener('dragover',  onDzDragOver);
  dz.addEventListener('dragenter', onDzDragEnter);
  dz.addEventListener('dragleave', onDzDragLeave);
  dz.addEventListener('drop',      onDzDrop);

  // Drop preview
  const prev = document.createElement('div');
  prev.id = 'drop-preview';
  prev.className = 'drop-preview';
  prev.style.display = 'none';
  dz.appendChild(prev);

  wrapper.appendChild(dz);
}

/* ─── Render blocks ─── */
function renderBlocks() {
  const dz = document.getElementById('drop-zone');
  if (!dz) return;
  dz.querySelectorAll('.block').forEach(b => b.remove());
  (state.days[state.currentDay] || []).forEach(b => dz.appendChild(createBlockEl(b)));
  detectConflicts();
}

function createBlockEl(block) {
  const cfg = TYPES[block.type] || TYPES['기타'];
  const topPx = (block.startTime - START_HOUR) * HOUR_HEIGHT;
  const hPx   = Math.max(40, block.duration * HOUR_HEIGHT);

  const el = document.createElement('div');
  el.className  = 'block';
  el.dataset.id = block.id;
  el.draggable  = true;
  el.style.cssText = `top:${topPx}px;height:${hPx}px;background:${cfg.bg};border-color:${cfg.color}40;border-left-color:${cfg.color}`;

  el.innerHTML = `
    <div class="block-inner">
      <div class="block-emoji">${block.emoji || cfg.emoji}</div>
      <div style="flex:1;min-width:0">
        <div class="block-name">${block.name}</div>
        <div class="block-time">${fmtTime(block.startTime)} – ${fmtTime(block.startTime + block.duration)}</div>
      </div>
      <button class="block-delete" title="삭제" onclick="deleteBlock(${block.id})">✕</button>
    </div>`;

  el.addEventListener('dragstart', e => {
    e.dataTransfer.effectAllowed = 'move';
    el.classList.add('dragging');
    state.dragData = { source:'block', blockId: block.id, offsetY: e.offsetY };
  });
  el.addEventListener('dragend', () => el.classList.remove('dragging'));
  return el;
}

/* ─── Delete block ─── */
function deleteBlock(id) {
  const day = state.days[state.currentDay];
  const idx = day.findIndex(b => b.id === id);
  if (idx !== -1) {
    day.splice(idx, 1);
    renderBlocks();
    updateStats();
  }
}

/* ─── Drop zone events ─── */
function onDzDragEnter(e) { e.preventDefault(); document.getElementById('drop-zone').classList.add('drag-over'); }
function onDzDragLeave(e) {
  if (!document.getElementById('drop-zone').contains(e.relatedTarget))
    document.getElementById('drop-zone').classList.remove('drag-over');
}

function onDzDragOver(e) {
  e.preventDefault(); e.dataTransfer.dropEffect = 'move';
  if (!state.dragData) return;

  const dz   = document.getElementById('drop-zone');
  const prev = document.getElementById('drop-preview');
  const rect = dz.getBoundingClientRect();
  const offsetY = state.dragData.source === 'block' ? (state.dragData.offsetY || 0) : 0;
  const y    = e.clientY - rect.top - offsetY;
  const time = snapTime(START_HOUR + y / HOUR_HEIGHT);
  const dur  = state.dragData.source === 'rec' ? (state.dragData.duration || 1) : (state.dragData.duration || 1);
  const top  = (time - START_HOUR) * HOUR_HEIGHT;
  const h    = Math.max(40, dur * HOUR_HEIGHT);

  prev.style.cssText = `top:${top}px;height:${h}px;left:6px;right:6px;display:block;position:absolute`;
  state.dragData._previewTime = time;
}

function onDzDrop(e) {
  e.preventDefault();
  const dz = document.getElementById('drop-zone');
  dz.classList.remove('drag-over');
  document.getElementById('drop-preview').style.display = 'none';

  if (!state.dragData) return;
  const rect = dz.getBoundingClientRect();
  const offsetY = state.dragData.source === 'block' ? (state.dragData.offsetY || 0) : 0;
  const y    = e.clientY - rect.top - offsetY;
  const time = snapTime(START_HOUR + y / HOUR_HEIGHT);

  if (state.dragData.source === 'rec') {
    // New block from AI panel
    const rec = state.dragData.rec;
    const cfg = TYPES[rec.type] || TYPES['기타'];
    state.days[state.currentDay].push({
      id:        state.blockIdSeed++,
      name:      rec.name,
      type:      rec.type,
      emoji:     rec.emoji || cfg.emoji,
      duration:  rec.duration,
      startTime: time,
    });
  } else if (state.dragData.source === 'block') {
    // Move existing block
    const day = state.days[state.currentDay];
    const bl  = day.find(b => b.id === state.dragData.blockId);
    if (bl) bl.startTime = time;
  }

  state.dragData = null;
  renderBlocks();
  updateStats();
}

/* ─── AI Recommendations ─── */
async function loadAIRecs() {
  const loading = document.getElementById('ai-loading');
  const list    = document.getElementById('rec-list');
  loading.style.display = 'flex';
  list.innerHTML = '';

  const key = state.apiKey;
  if (!key) {
    // Fallback to sample
    await new Promise(r => setTimeout(r, 700));
    const dest = state.destination;
    const samples = SAMPLE_RECS[dest] || buildGenericSamples(dest);
    state.recs = samples;
    loading.style.display = 'none';
    renderRecs();
    return;
  }

  try {
    const prompt = `여행지: ${state.destination}. 인원: ${state.partySize}명.
여행 액티비티 12개를 JSON 배열로만 반환해주세요. 다른 텍스트 없이 JSON만:
[{"name":"장소명","type":"관광|식당|카페|쇼핑|휴식","emoji":"이모지","desc":"한줄 설명 15자 이내","duration":1.5}]
duration은 0.5~3 사이 숫자(시간 단위).`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const clean = raw.replace(/```json|```/g, '').trim();
    state.recs = JSON.parse(clean);
    loading.style.display = 'none';
    renderRecs();
  } catch {
    loading.style.display = 'none';
    const samples = buildGenericSamples(state.destination);
    state.recs = samples;
    renderRecs();
    showToast('샘플 데이터로 표시됩니다', 'warning');
  }
}

async function loadMoreRecs() {
  if (!state.apiKey) { showToast('API Key를 먼저 설정해주세요 🔑', 'warning'); return; }
  showToast('✨ 추가 추천을 불러오는 중...', 'info');
  await loadAIRecs();
  showToast('✅ 추천 블록 업데이트됨', 'success');
}

function buildGenericSamples(dest) {
  return [
    { name:`${dest} 중심부 산책`, type:'관광', emoji:'🗺️', desc:'메인 구역 탐방',   duration:2   },
    { name:`${dest} 대표 맛집`,   type:'식당', emoji:'🍽️', desc:'현지 인기 음식점', duration:1.5 },
    { name:`${dest} 로컬 카페`,   type:'카페', emoji:'☕', desc:'감성 카페 한 잔',  duration:1   },
    { name:`${dest} 재래시장`,    type:'쇼핑', emoji:'🏪', desc:'현지 시장 탐방',   duration:1.5 },
    { name:`${dest} 박물관`,      type:'관광', emoji:'🏛️', desc:'역사·문화 탐방',   duration:2   },
    { name:'호텔 수영장 휴식',    type:'휴식', emoji:'🏊', desc:'피로 회복',        duration:1.5 },
    { name:`${dest} 야경 명소`,   type:'관광', emoji:'🌆', desc:'뷰포인트 야경',    duration:1   },
    { name:'현지 브런치',         type:'식당', emoji:'🥗', desc:'여유로운 아침식사', duration:1  },
    { name:`${dest} 쇼핑몰`,      type:'쇼핑', emoji:'🛍️', desc:'쇼핑 & 구경',       duration:2  },
    { name:'오후 낮잠 & 휴식',    type:'휴식', emoji:'😴', desc:'에너지 충전',      duration:1   },
    { name:`${dest} 공원 산책`,   type:'관광', emoji:'🌿', desc:'자연 속 힐링',     duration:1.5 },
    { name:'현지 디저트 카페',    type:'카페', emoji:'🍰', desc:'달콤한 티타임',    duration:1   },
  ];
}

/* ─── Render AI recs ─── */
function filterRecs(filter, btn) {
  state.filter = filter;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderRecs();
}

function renderRecs() {
  const list    = document.getElementById('rec-list');
  const filter  = state.filter;
  const visible = filter === '전체' ? state.recs : state.recs.filter(r => r.type === filter);

  if (!visible.length) {
    list.innerHTML = `<div class="empty-panel"><div class="empty-panel-icon">🔍</div><div>해당 카테고리 추천이 없어요</div></div>`;
    return;
  }

  list.innerHTML = '';
  visible.forEach((rec, i) => {
    const cfg = TYPES[rec.type] || TYPES['기타'];
    const card = document.createElement('div');
    card.className  = 'rec-card';
    card.draggable  = true;
    card.dataset.idx = i;

    card.innerHTML = `
      <button class="rec-add-btn" title="타임라인에 추가" onclick="addRecToTimeline(${state.recs.indexOf(rec)})">+</button>
      <div class="rec-card-top">
        <div class="rec-emoji">${rec.emoji || cfg.emoji}</div>
        <div>
          <div class="rec-name">${rec.name}</div>
          <div class="rec-meta">
            <span class="type-badge" style="background:${cfg.bg};color:${cfg.color}">${rec.type}</span>
            <span class="rec-duration">⏱ ${rec.duration}h</span>
          </div>
        </div>
      </div>
      <div class="rec-desc">${rec.desc || ''}</div>`;

    card.addEventListener('dragstart', e => {
      e.dataTransfer.effectAllowed = 'copy';
      card.classList.add('dragging');
      state.dragData = { source:'rec', rec, duration: rec.duration };
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));

    list.appendChild(card);
  });
}

/* ─── Add rec at next available time ─── */
function addRecToTimeline(recIdx) {
  const rec = state.recs[recIdx];
  if (!rec) return;
  const cfg = TYPES[rec.type] || TYPES['기타'];
  const day = state.days[state.currentDay];

  // Find next available start time (after all current blocks)
  let startTime = 9; // default 09:00
  if (day.length) {
    const lastEnd = Math.max(...day.map(b => b.startTime + b.duration));
    startTime = snapTime(lastEnd + 0.5); // 30-min gap
  }
  if (startTime + rec.duration > END_HOUR) {
    showToast('⚠️ 하루 일정이 꽉 찼어요! 다른 날을 이용해보세요', 'warning');
    return;
  }

  day.push({
    id:        state.blockIdSeed++,
    name:      rec.name,
    type:      rec.type,
    emoji:     rec.emoji || cfg.emoji,
    duration:  rec.duration,
    startTime,
  });

  renderBlocks();
  updateStats();
  showToast(`✅ "${rec.name}" 추가됨`, 'success');
}

/* ─── Conflict detection ─── */
function detectConflicts() {
  const blocks = state.days[state.currentDay] || [];
  const sorted = [...blocks].sort((a,b) => a.startTime - b.startTime);
  const conflictIds = new Set();

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i+1];
    if (a.startTime + a.duration > b.startTime) {
      conflictIds.add(a.id);
      conflictIds.add(b.id);
    }
  }

  document.querySelectorAll('.block').forEach(el => {
    const id = parseInt(el.dataset.id);
    el.classList.toggle('conflict', conflictIds.has(id));
  });

  const ci = document.getElementById('stat-conflict-item');
  const cv = document.getElementById('stat-conflicts');
  const count = conflictIds.size;
  cv.textContent = count;
  ci.classList.toggle('conflict-warn', count > 0);
  return count;
}

/* ─── Stats ─── */
function updateStats() {
  const blocks = state.days[state.currentDay] || [];
  document.getElementById('stat-blocks').textContent    = blocks.length;
  const totalH = blocks.reduce((s, b) => s + b.duration, 0);
  document.getElementById('stat-hours').textContent     = `${totalH}h`;
  detectConflicts();
}

/* ─── Route Optimization ─── */
function optimizeRoute() {
  const blocks = state.days[state.currentDay];
  if (!blocks.length) { showToast('타임라인에 블록을 먼저 추가해주세요', 'warning'); return; }

  // Sort blocks by a smart time order:
  // Cafe → Sightseeing → Restaurant → Shopping → Rest
  const order = { '카페':0, '관광':1, '식당':2, '쇼핑':3, '휴식':4, '기타':5 };
  const sorted = [...blocks].sort((a,b) => (order[a.type]??5) - (order[b.type]??5));

  // Re-assign start times with 30-min gaps
  let cursor = 9.0; // 09:00
  sorted.forEach(bl => {
    bl.startTime = snapTime(cursor);
    cursor = bl.startTime + bl.duration + 0.5; // 30-min gap
  });
  state.days[state.currentDay] = sorted;

  renderBlocks();
  updateStats();
  showToast('⚡ 동선 최적화 완료!', 'success');
}

/* ─── Init ─── */
(function init() {
  state.apiKey = localStorage.getItem('planai_key') || '';
  // Set default dates (tomorrow + 3 days)
  const d1 = new Date(); d1.setDate(d1.getDate() + 1);
  const d2 = new Date(); d2.setDate(d2.getDate() + 4);
  const fmt = d => d.toISOString().split('T')[0];
  document.getElementById('start-date').value = fmt(d1);
  document.getElementById('end-date').value   = fmt(d2);
})();
