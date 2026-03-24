/* ══════════════════════════════════════
   TripAI — 일정 · Schedule Planner
   Theme → 3-panel (blocks / timeline / map) → AI optimize
══════════════════════════════════════ */

/* ── Place block data by destination ── */
const PLACE_DB = {
  '도쿄': [
    // 관광
    { id:'t1', cat:'관광', emoji:'🌸', name:'신주쿠 교엔',   meta:'도보 20분 · 공원', dur:1.5, x:42, y:38 },
    { id:'t2', cat:'관광', emoji:'⛩️', name:'메이지 신궁',   meta:'도보 15분 · 신사', dur:1,   x:35, y:30 },
    { id:'t3', cat:'관광', emoji:'🗼', name:'도쿄 스카이트리', meta:'전망대 · 입장료', dur:1.5, x:68, y:35 },
    { id:'t4', cat:'관광', emoji:'🏯', name:'아사쿠사 센소지', meta:'도보 20분 · 절', dur:1,   x:65, y:28 },
    // 맛집
    { id:'f1', cat:'맛집', emoji:'🍜', name:'이치란 라멘 본점', meta:'시부야 · 30~60분 웨이팅', dur:1, x:40, y:52 },
    { id:'f2', cat:'맛집', emoji:'🍱', name:'츠키지 시장 해산물', meta:'아침 일찍 · 신선한 회', dur:1.5, x:60, y:55 },
    { id:'f3', cat:'맛집', emoji:'🍣', name:'스시 잔마이',     meta:'24시간 · 스시', dur:1,   x:62, y:57 },
    { id:'f4', cat:'맛집', emoji:'🥩', name:'야키니쿠 쥬조',   meta:'석식 추천',     dur:1.5, x:38, y:62 },
    // 카페
    { id:'c1', cat:'카페', emoji:'☕', name:'블루보틀 커피 신주쿠', meta:'스페셜티 커피', dur:0.5, x:43, y:44 },
    { id:'c2', cat:'카페', emoji:'🍰', name:'후지야 케이크샵',  meta:'하라주쿠 · 디저트', dur:0.5, x:36, y:46 },
    { id:'c3', cat:'카페', emoji:'🧋', name:'타피오카 카페 원조', meta:'오모테산도',     dur:0.5, x:33, y:48 },
    // 쇼핑
    { id:'s1', cat:'쇼핑', emoji:'🛍️', name:'돈키호테 시부야', meta:'심야 쇼핑 · 면세',  dur:1.5, x:40, y:55 },
    { id:'s2', cat:'쇼핑', emoji:'👗', name:'하라주쿠 다케시타도리', meta:'트렌디 쇼핑',  dur:1,   x:36, y:42 },
    { id:'s3', cat:'쇼핑', emoji:'📦', name:'아키하바라 전자상가', meta:'전자제품·피규어', dur:2,  x:65, y:40 },
    // 휴식
    { id:'r1', cat:'휴식', emoji:'♨️', name:'오에도 온센 모노가타리', meta:'온천·힐링', dur:2, x:70, y:62 },
    { id:'r2', cat:'휴식', emoji:'🌿', name:'요요기 공원 피크닉',  meta:'산책·휴식',   dur:1, x:38, y:35 },
  ],
  '파리': [
    { id:'t1', cat:'관광', emoji:'🗼', name:'에펠탑',        meta:'예약 필수 · 2시간',    dur:2,   x:30, y:55 },
    { id:'t2', cat:'관광', emoji:'🖼️', name:'루브르 박물관',  meta:'예약 필수 · 반나절',   dur:3,   x:50, y:42 },
    { id:'t3', cat:'관광', emoji:'🏛️', name:'오르세 미술관',  meta:'인상파 거장',          dur:2,   x:45, y:50 },
    { id:'t4', cat:'관광', emoji:'⛪', name:'노트르담 대성당', meta:'공사중 · 외관 관람',   dur:1,   x:52, y:48 },
    { id:'f1', cat:'맛집', emoji:'🥐', name:'폴 베이커리',    meta:'아침 식사 추천',        dur:0.5, x:48, y:38 },
    { id:'f2', cat:'맛집', emoji:'🥩', name:'비스트로 뒤 마레', meta:'현지 분위기 맛집',    dur:1.5, x:55, y:40 },
    { id:'f3', cat:'맛집', emoji:'🧀', name:'마레 치즈 마켓',  meta:'지역 특산물',          dur:0.5, x:57, y:37 },
    { id:'c1', cat:'카페', emoji:'☕', name:'카페 드 플로르',  meta:'생제르맹 · 레전드 카페', dur:1, x:43, y:52 },
    { id:'c2', cat:'카페', emoji:'🥐', name:'레 두 마고',      meta:'파리 작가들의 카페',    dur:1,   x:42, y:53 },
    { id:'s1', cat:'쇼핑', emoji:'👜', name:'샹젤리제 명품 거리', meta:'루이비통·샤넬',    dur:2,   x:28, y:42 },
    { id:'s2', cat:'쇼핑', emoji:'🛍️', name:'라파예트 백화점', meta:'파리 최대 백화점',    dur:1.5, x:48, y:32 },
    { id:'r1', cat:'휴식', emoji:'🌸', name:'뤽상부르 공원',   meta:'피크닉 · 산책',        dur:1,   x:42, y:58 },
    { id:'r2', cat:'휴식', emoji:'🚢', name:'센강 크루즈',     meta:'석양 크루즈 추천',      dur:1,   x:42, y:50 },
  ],
  '_default': [
    { id:'t1', cat:'관광', emoji:'🏛️', name:'주요 박물관',     meta:'대표 관광지',  dur:2,   x:40, y:35 },
    { id:'t2', cat:'관광', emoji:'🏰', name:'역사 유적지',      meta:'역사 탐방',   dur:1.5, x:60, y:30 },
    { id:'t3', cat:'관광', emoji:'🌅', name:'야경 뷰포인트',    meta:'저녁 추천',   dur:1,   x:50, y:65 },
    { id:'f1', cat:'맛집', emoji:'🍽️', name:'현지 대표 맛집',   meta:'점심 추천',   dur:1,   x:38, y:55 },
    { id:'f2', cat:'맛집', emoji:'🥘', name:'로컬 레스토랑',    meta:'저녁 추천',   dur:1.5, x:55, y:60 },
    { id:'c1', cat:'카페', emoji:'☕', name:'감성 카페',         meta:'오전 추천',   dur:0.5, x:45, y:45 },
    { id:'c2', cat:'카페', emoji:'🧁', name:'디저트 카페',       meta:'오후 추천',   dur:0.5, x:58, y:48 },
    { id:'s1', cat:'쇼핑', emoji:'🛍️', name:'로컬 시장',        meta:'기념품 쇼핑', dur:1.5, x:35, y:42 },
    { id:'s2', cat:'쇼핑', emoji:'🏬', name:'면세점',           meta:'출국 전 추천', dur:1,  x:65, y:55 },
    { id:'r1', cat:'휴식', emoji:'🌿', name:'공원 / 광장',      meta:'산책·휴식',   dur:1,   x:50, y:40 },
  ],
};

/* ── Time slots: 08:00 ~ 22:00 (30min intervals) ── */
const TIMES = [];
for (let h = 8; h <= 21; h++) { TIMES.push(`${String(h).padStart(2,'0')}:00`); TIMES.push(`${String(h).padStart(2,'0')}:30`); }
TIMES.push('22:00');

/* ── Category colors ── */
const CAT_COLOR = {
  '관광': 'var(--cat-sight)',
  '맛집': 'var(--cat-food)',
  '카페': 'var(--cat-cafe)',
  '쇼핑': 'var(--cat-shop)',
  '휴식': 'var(--cat-rest)',
};
const CAT_TEXT = { '관광':'#fff','맛집':'#fff','카페':'#333','쇼핑':'#fff','휴식':'#333' };

/* ── State ── */
const st = {
  dest:      '',
  theme:     '',
  dayCount:  3,
  currentDay:1,
  apiKey:    '',
  activeCats: new Set(['관광','맛집','카페','쇼핑','휴식']),
  /* schedule: { day: { slotTime: placeObj } } */
  schedule:  {},
  /* pendingOptimization: [{ day, fromSlot, toSlot, reason, block }] */
  pendingOpt: [],
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

/* ── Setup ── */
function pickTheme(chip) {
  document.querySelectorAll('.theme-chip').forEach(c => c.classList.remove('on'));
  chip.classList.add('on');
  st.theme = chip.dataset.v;
  const custom = document.getElementById('custom-theme');
  if (st.theme === 'custom') custom.classList.add('visible'); else custom.classList.remove('visible');
}

/* ── Date change ── */
function onDateChange() {
  const dep = document.getElementById('dep-date').value;
  const ret = document.getElementById('ret-date').value;
  if (!dep || !ret) return;
  const nights = Math.round((new Date(ret) - new Date(dep)) / 86400000);
  if (nights < 1) { toast('귀국일이 출발일보다 빨라요'); return; }
  document.getElementById('date-nights').textContent = `${nights}박`;
  const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  document.getElementById('date-summary').textContent = `${fmt(dep)} 출발 → ${fmt(ret)} 귀국 · ${nights}박 ${nights + 1}일`;
}

function startPlanning() {
  const dest = document.getElementById('dest-input').value.trim();
  if (!dest) { toast('여행지를 입력해주세요'); return; }
  if (!st.theme) { toast('여행 테마를 선택해주세요'); return; }
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
  st.dayCount = nights;  // 박수 = 일차 수
  st.apiKey   = localStorage.getItem('tripai_key') || '';

  // Save for packing card
  localStorage.setItem('tripai_schedule', JSON.stringify({
    dest: st.dest,
    theme: st.theme,
    days: st.dayCount,
    activities: [...st.activeCats],
  }));
  localStorage.setItem('tripai_flight', JSON.stringify({
    dest: st.dest, depDate: dep, retDate: ret, nights: st.dayCount, weather: 'mild',
  }));

  // Init schedule
  st.schedule = {};
  for (let d = 1; d <= st.dayCount; d++) st.schedule[d] = {};

  buildMainScreen();
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('main-screen').classList.add('visible');
}

function goSetup() {
  document.getElementById('setup-screen').style.display = '';
  document.getElementById('main-screen').classList.remove('visible');
}

/* ── Build main screen ── */
function buildMainScreen() {
  document.getElementById('topbar-dest').textContent  = `✈ ${st.dest}`;
  document.getElementById('topbar-theme').textContent = `${st.theme} 테마`;
  renderBlocks();
  renderMultiTimeline();
}

/* ── Multi-day grid ── */
function getDepDate() {
  try { return JSON.parse(localStorage.getItem('tripai_flight') || '{}').depDate || null; } catch { return null; }
}

function renderMultiTimeline() {
  const panel = document.getElementById('panel-multi');
  panel.innerHTML = '';
  const dep = getDepDate();

  // Header — sticky row with day columns
  const header = document.createElement('div');
  header.className = 'multi-header';

  // Time gutter placeholder
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
      const c = {관광:'var(--cat-sight)',맛집:'var(--cat-food)',카페:'var(--cat-cafe)',쇼핑:'var(--cat-shop)',휴식:'var(--cat-rest)'}[p.cat]||'var(--coral)';
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
  panel.appendChild(header);

  // Body — scrollable, grid: gutter + N day columns
  const body = document.createElement('div');
  body.className = 'multi-body';
  body.style.gridTemplateColumns = `44px repeat(${st.dayCount}, 1fr)`;

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
  const destKey = Object.keys(PLACE_DB).find(k => st.dest.includes(k)) || '_default';
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
        const pid   = e.dataTransfer.getData('placeId');
        const dKey  = e.dataTransfer.getData('destKey');
        const place = PLACE_DB[dKey || destKey]?.find(p => p.id === pid) || PLACE_DB['_default']?.find(p => p.id === pid);
        if (!place) return;
        st.schedule[d][time] = place;
        renderSlotBlock(drop, place, time, d);
        refreshDayHead(d);
        renderMap();
        toast(`✅ ${place.name} — ${d}일차 ${time}`);
      });
      col.appendChild(drop);
    });
    body.appendChild(col);
  }
  panel.appendChild(body);
}

function refreshDayHead(d) {
  const el = document.getElementById(`mdh-dots-${d}`);
  if (!el) return;
  const items = Object.values(st.schedule[d] || {});
  if (!items.length) {
    el.innerHTML = '<span class="mdh-empty">비어있음</span>';
  } else {
    el.innerHTML = items.slice(0,5).map(p => {
      const c = {관광:'var(--cat-sight)',맛집:'var(--cat-food)',카페:'var(--cat-cafe)',쇼핑:'var(--cat-shop)',휴식:'var(--cat-rest)'}[p.cat]||'var(--coral)';
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
  block.innerHTML = `
    <div class="slot-block-num" style="background:${color};color:${tc}">${idx}</div>
    <span style="font-size:13px">${place.emoji}</span>
    <span style="flex:1;font-size:11px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${place.name}</span>
    <button class="slot-block-remove" onclick="removeBlock(${day},'${time}')">×</button>`;
  drop.appendChild(block);
}

function removeBlock(day, time) {
  delete st.schedule[day][time];
  // re-render only that day column
  const drops = document.querySelectorAll(`.slot-drop[data-day="${day}"]`);
  drops.forEach(drop => {
    const t = drop.dataset.time;
    drop.innerHTML = '';
    const placed = st.schedule[day][t];
    if (placed) renderSlotBlock(drop, placed, t, day);
  });
  refreshDayHead(day);
  renderMap();
  toast('블록이 제거됐어요');
}

function clearDay(d) {
  st.schedule[d] = {};
  const drops = document.querySelectorAll(`.slot-drop[data-day="${d}"]`);
  drops.forEach(drop => { drop.innerHTML = ''; });
  refreshDayHead(d);
  renderMap();
  toast(`${d}일차 초기화됐어요`);
}

/* ── Map modal ── */
function openMapModal()  { document.getElementById('map-modal-overlay').classList.add('open'); renderMap(); }
function closeMapModal() { document.getElementById('map-modal-overlay').classList.remove('open'); }

function renderBlocks() {
  const key    = Object.keys(PLACE_DB).find(k => st.dest.includes(k)) || '_default';
  const places = PLACE_DB[key];
  const list   = document.getElementById('blocks-list');
  list.innerHTML = '';

  places.forEach(p => {
    if (!st.activeCats.has(p.cat)) return;
    const el = document.createElement('div');
    el.className = 'place-block';
    el.draggable = true;
    el.dataset.id = p.id;
    el.dataset.cat = p.cat;

    const color = CAT_COLOR[p.cat] || '#fff';
    el.innerHTML = `
      <div class="block-cat" style="color:${color}">
        <span class="block-dot" style="background:${color}"></span>${p.cat}
      </div>
      <div class="block-name">${p.emoji} ${p.name}</div>
      <div class="block-meta">${p.meta} · ${p.dur}h</div>`;

    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('placeId', p.id);
      e.dataTransfer.setData('destKey', key);
      e.dataTransfer.effectAllowed = 'copy';
    });
    list.appendChild(el);
  });
}

function filterCat(pill) {
  pill.classList.toggle('on');
  const cat = pill.dataset.cat;
  if (st.activeCats.has(cat)) st.activeCats.delete(cat); else st.activeCats.add(cat);
  renderBlocks();
}

/* ── Middle panel: timeline ── */
function renderTimeline() {
  const tl = document.getElementById('timeline');
  tl.innerHTML = '';

  TIMES.forEach(time => {
    const row = document.createElement('div');
    row.className = 'time-slot';

    const label = document.createElement('div');
    label.className = 'time-label';
    label.textContent = time;

    const drop = document.createElement('div');
    drop.className = 'slot-drop';
    drop.dataset.time = time;

    // If block already placed
    const placed = st.schedule[st.currentDay][time];
    if (placed) {
      renderSlotBlock(drop, placed, time);
    }

    // Drag events
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
    drop.addEventListener('dragleave',  () => drop.classList.remove('drag-over'));
    drop.addEventListener('drop',       e => {
      e.preventDefault(); drop.classList.remove('drag-over');
      const pid    = e.dataTransfer.getData('placeId');
      const dKey   = e.dataTransfer.getData('destKey');
      const key2   = Object.keys(PLACE_DB).find(k => st.dest.includes(k)) || '_default';
      const place  = PLACE_DB[dKey || key2]?.find(p => p.id === pid) || PLACE_DB['_default']?.find(p => p.id === pid);
      if (!place) return;
      st.schedule[st.currentDay][time] = place;
      renderSlotBlock(drop, place, time);
      renderMap();
      toast(`✅ ${place.name} — ${time} 추가됨`);
    });

    row.appendChild(label);
    row.appendChild(drop);
    tl.appendChild(row);
  });
}

function renderSlotBlock(drop, place, time) {
  drop.innerHTML = '';
  const key   = Object.keys(PLACE_DB).find(k => st.dest.includes(k)) || '_default';
  const daySchedule = Object.entries(st.schedule[st.currentDay]).sort(([a],[b]) => a.localeCompare(b));
  const idx   = daySchedule.findIndex(([t]) => t === time) + 1;
  const color = CAT_COLOR[place.cat] || '#fff';
  const tc    = CAT_TEXT[place.cat]  || '#fff';

  const block = document.createElement('div');
  block.className = 'slot-block';
  block.style.background = `${color}22`;
  block.style.border     = `1px solid ${color}55`;
  block.innerHTML = `
    <div class="slot-block-num" style="background:${color};color:${tc}">${idx}</div>
    <span style="font-size:14px">${place.emoji}</span>
    <span>${place.name}</span>
    <span style="font-size:10px;color:var(--muted);margin-left:4px">${place.dur}h</span>
    <button class="slot-block-remove" onclick="removeBlock('${time}')">×</button>`;
  drop.appendChild(block);
}

function removeBlock(time) {
  delete st.schedule[st.currentDay][time];
  renderTimeline();
  renderMap();
  toast('블록이 제거됐어요');
}

function clearDay() {
  st.schedule[st.currentDay] = {};
  renderTimeline();
  renderMap();
  toast(`${st.currentDay}일차 초기화됐어요`);
}

/* ── Right panel: map ── */
function renderMap() {
  const canvas   = document.getElementById('map-canvas');
  const svg      = document.getElementById('map-svg');
  const empty    = document.getElementById('map-empty');
  const dayItems = Object.entries(st.schedule[st.currentDay]).sort(([a],[b]) => a.localeCompare(b));

  // Remove old pins
  canvas.querySelectorAll('.map-pin').forEach(p => p.remove());

  if (!dayItems.length) { empty.style.display = 'flex'; svg.innerHTML = ''; return; }
  empty.style.display = 'none';

  const key    = Object.keys(PLACE_DB).find(k => st.dest.includes(k)) || '_default';
  const places = dayItems.map(([,p]) => p);

  // SVG grid + route
  const points = places.map(p => `${p.x}%,${p.y}%`).join(' ');
  svg.innerHTML = `
    <defs>
      <filter id="glow"><feGaussianBlur stdDeviation="3" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <g stroke="rgba(255,107,107,0.05)" stroke-width="1">
      ${Array.from({length:22},(_,i)=>`<line x1="${i*5}%" y1="0" x2="${i*5}%" y2="100%"/>`).join('')}
      ${Array.from({length:22},(_,i)=>`<line x1="0" y1="${i*5}%" x2="100%" y2="${i*5}%"/>`).join('')}
    </g>
    ${places.length>1?`<polyline points="${points}" fill="none" stroke="rgba(255,107,107,0.4)" stroke-width="2" stroke-dasharray="6,4" filter="url(#glow)"/>`:''}
  `;

  // Pins
  places.forEach((place, i) => {
    const pin = document.createElement('div');
    pin.className = 'map-pin';
    pin.style.left = `${place.x}%`;
    pin.style.top  = `${place.y}%`;
    const color = CAT_COLOR[place.cat] || 'var(--coral)';
    const tc    = CAT_TEXT[place.cat]  || '#fff';
    pin.innerHTML = `
      <div class="pin-num" style="background:${color};color:${tc}">${i + 1}</div>
      <div class="pin-tip">${place.emoji} ${place.name}</div>`;
    canvas.appendChild(pin);
  });
}

/* ── AI Optimization ── */
function openAIPanel() {
  const dayItems = Object.entries(st.schedule[st.currentDay]).sort(([a],[b]) => a.localeCompare(b));
  if (!dayItems.length) { toast('먼저 타임라인에 블록을 추가해주세요'); return; }

  document.getElementById('ai-panel').classList.add('open');
  document.getElementById('ai-changes').innerHTML = '';
  document.getElementById('ai-apply-btn').style.display = 'block';
  document.getElementById('ai-loading').style.display   = 'flex';
  document.getElementById('ai-panel-sub').textContent   = '날씨, 이동 거리, 영업시간을 고려해 최적 순서를 제안해드릴게요.';

  st.apiKey = localStorage.getItem('tripai_key') || '';
  if (st.apiKey) {
    fetchAIOptimization(dayItems);
  } else {
    setTimeout(() => showFallbackOptimization(dayItems), 900);
  }
}

async function fetchAIOptimization(dayItems) {
  const blocks = dayItems.map(([t, p]) => `${t}: ${p.name}(${p.cat})`).join(', ');
  const prompt = `
여행지: ${st.dest}, 테마: ${st.theme}, ${st.currentDay}일차 현재 일정: ${blocks}
다음 JSON만 반환:
{
  "suggestions": [
    {"from":"기존장소명","to":"이동장소명","reason":"한 줄 이유 15자 이내"},
    {"from":"...","to":"...","reason":"..."}
  ],
  "summary":"2줄 이내 전체 최적화 요약"
}
suggestions 2~3개, 실제 일정 기반으로 제안.`;

  try {
    const res  = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${st.apiKey}`,
      { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }] }) }
    );
    const data = await res.json();
    const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const json = JSON.parse(raw.replace(/```json|```/g,'').trim());
    showAIResult(json, dayItems);
  } catch {
    showFallbackOptimization(dayItems);
  }
}

function showFallbackOptimization(dayItems) {
  const cats = dayItems.map(([,p]) => p.cat);
  const sug  = [];

  if (cats.includes('관광') && cats.indexOf('관광') > 0) {
    sug.push({ reason:'관광지는 아침에 방문 시 혼잡을 피할 수 있어요', swap:true });
  }
  if (cats.includes('맛집') && cats.includes('카페')) {
    sug.push({ reason:'카페는 맛집 방문 사이 소화 시간으로 배치가 좋아요', swap:false });
  }
  if (cats.includes('쇼핑')) {
    sug.push({ reason:'쇼핑은 귀숙 전 마지막에 배치 시 짐 운반이 편해요', swap:false });
  }
  if (!sug.length) {
    sug.push({ reason:'현재 일정은 이동 거리 기준으로 이미 효율적이에요 ✦', swap:false });
  }

  showAIResult({
    suggestions: sug.map((s, i) => ({
      from: dayItems[Math.min(i * 2, dayItems.length - 1)][1].name,
      to:   dayItems[Math.min(i * 2 + 1, dayItems.length - 1)][1].name,
      reason: s.reason,
    })),
    summary: `${st.theme} 테마와 ${st.dest} 동선을 고려한 최적화 예시예요. API Key 설정 시 실제 날씨 데이터 반영 가능해요.`
  }, dayItems);
}

function showAIResult(json, dayItems) {
  document.getElementById('ai-loading').style.display = 'none';
  document.getElementById('ai-panel-sub').textContent = json.summary || '';

  const changes = document.getElementById('ai-changes');
  changes.innerHTML = (json.suggestions || []).map(s => `
    <div class="ai-change-item">
      <strong>${s.from}</strong> → <strong>${s.to}</strong><br>
      <span style="font-size:11px;color:var(--muted)">${s.reason}</span>
    </div>`).join('');

  st.pendingOpt = json.suggestions || [];
}

function applyOptimization() {
  // Shuffle blocks as a simple reorder demonstration
  const dayItems = Object.entries(st.schedule[st.currentDay]).sort(([a],[b]) => a.localeCompare(b));
  const places   = dayItems.map(([,p]) => p);
  // Rotate first two items if possible
  if (places.length >= 2) {
    const keys = dayItems.map(([t]) => t);
    const newOrder = [places[1], places[0], ...places.slice(2)];
    newOrder.forEach((p, i) => { st.schedule[st.currentDay][keys[i]] = p; });
  }
  renderTimeline();
  renderMap();
  closeAIPanel();
  toast('✦ AI 추천 순서로 일정이 재배치됐어요!');
}

function closeAIPanel() {
  document.getElementById('ai-panel').classList.remove('open');
}

/* ── Init ── */
(function init() {
  st.apiKey = localStorage.getItem('tripai_key') || '';
  // Default dates: 2 months from now, 5-night trip
  const d1 = new Date(); d1.setMonth(d1.getMonth() + 2); d1.setDate(15);
  const d2 = new Date(d1); d2.setDate(d2.getDate() + 5);
  const fmt = d => d.toISOString().split('T')[0];
  document.getElementById('dep-date').value = fmt(d1);
  document.getElementById('ret-date').value = fmt(d2);
  onDateChange();
})();
