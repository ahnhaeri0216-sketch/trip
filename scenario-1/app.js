// ── State ──────────────────────────────────────
let apiKey = localStorage.getItem('travel_api_key') || '';
let tripData = {};

// ── API Key ─────────────────────────────────────
function updateApiDot() {
  const dot = document.getElementById('api-dot');
  const txt = document.getElementById('api-btn-text');
  if (apiKey) {
    dot.classList.add('connected');
    txt.textContent = 'API 연결됨';
  } else {
    dot.classList.remove('connected');
    txt.textContent = 'API Key 설정';
  }
}
function openModal() { document.getElementById('modal').classList.add('open'); }
function closeModal() { document.getElementById('modal').classList.remove('open'); }
function saveKey() {
  apiKey = document.getElementById('key-input').value.trim();
  localStorage.setItem('travel_api_key', apiKey);
  updateApiDot();
  closeModal();
}

// ── Screen nav ──────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Budget slider ───────────────────────────────
function onBudget() {
  const s = document.getElementById('budget');
  const v = parseInt(s.value);
  const pct = ((v - 50) / (2000 - 50)) * 100;
  s.style.setProperty('--pct', pct + '%');
  document.getElementById('budget-val').textContent = v.toLocaleString('ko-KR') + '만원';
}

// ── Tag toggle ──────────────────────────────────
function setupTags() {
  document.querySelectorAll('.tag').forEach(t =>
    t.addEventListener('click', () => t.classList.toggle('selected'))
  );
}

// ── Mock itinerary (UI only) ────────────────────
const MOCK_DAYS = [
  { day: 1, theme: '도착 & 첫 탐험', activities: [
    { time:'14:00', icon:'✈️', name:'공항 도착 & 이동', desc:'숙소 체크인 후 주변 탐방' },
    { time:'17:00', icon:'🚶', name:'근처 산책', desc:'첫날 가볍게 동네 분위기 파악' },
    { time:'19:00', icon:'🍜', name:'저녁 식사', desc:'현지 맛집에서 첫 끼니' },
  ]},
  { day: 2, theme: '주요 명소 투어', activities: [
    { time:'09:00', icon:'🏛️', name:'주요 관광지', desc:'이른 아침 여유롭게 관람' },
    { time:'12:00', icon:'☕', name:'감성 카페', desc:'현지 카페에서 브런치' },
    { time:'14:00', icon:'🛍️', name:'시장/쇼핑', desc:'로컬 시장 구경 & 기념품' },
    { time:'19:00', icon:'🍷', name:'저녁 & 야경', desc:'뷰 맛집 디너' },
  ]},
  { day: 3, theme: '자유 시간 & 귀국', activities: [
    { time:'09:00', icon:'🌅', name:'모닝 산책', desc:'마지막 아침 여유롭게' },
    { time:'11:00', icon:'🛒', name:'마지막 쇼핑', desc:'기념품 & 남은 로컬 체험' },
    { time:'15:00', icon:'✈️', name:'공항 이동 & 귀국', desc:'안전한 귀가!' },
  ]},
];

function renderMockItinerary() {
  document.getElementById('itinerary-container').innerHTML = MOCK_DAYS.map(d => `
    <div class="day-card" style="animation-delay:${(d.day-1)*0.1}s">
      <div class="day-header">
        <div class="day-badge">D${d.day}</div>
        <div>
          <div class="day-title">${d.theme}</div>
          <div class="day-sub">✨ AI가 여행지 맞춤 일정을 생성할 예정</div>
        </div>
      </div>
      <div class="activities-list">
        ${d.activities.map(a => `
          <div class="activity-item">
            <div class="activity-time">${a.time}</div>
            <div class="activity-icon">${a.icon}</div>
            <div>
              <div class="activity-name">${a.name}</div>
              <div class="activity-desc">${a.desc}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <a class="map-btn" href="https://maps.google.com/?q=${encodeURIComponent(tripData.destination||'Seoul')}" target="_blank">🗺️ 지도에서 보기</a>
    </div>
  `).join('');
}

// ── Mock weather (UI only) ──────────────────────
function renderMockWeather() {
  document.getElementById('weather-container').innerHTML = `
    <div class="weather-grid">
      <div class="weather-card"><div class="weather-icon">🌤️</div><div class="weather-label">날씨</div><div class="weather-value">대체로 맑음</div></div>
      <div class="weather-card"><div class="weather-icon">🌡️</div><div class="weather-label">예상 기온</div><div class="weather-value">18 ~ 26°C</div></div>
      <div class="weather-card"><div class="weather-icon">💧</div><div class="weather-label">습도</div><div class="weather-value">55%</div></div>
      <div class="weather-card"><div class="weather-icon">☔</div><div class="weather-label">강수 확률</div><div class="weather-value">20%</div></div>
    </div>
    <div class="glass-card" style="margin-top:20px">
      <div class="form-section-title"><span>👗</span> 추천 옷차림</div>
      <p style="color:var(--text-secondary);font-size:14px;line-height:1.7;margin-bottom:16px">
        낮에는 가벼운 반팔·얇은 셔츠가 적합하며, 아침·저녁에는 얇은 가디건이나 바람막이를 챙기세요. 우산은 접이식 소형으로 준비하면 좋습니다.
      </p>
      <div class="clothing-list">
        <div class="clothing-tag"><span>👕</span>반팔 티셔츠</div>
        <div class="clothing-tag"><span>🧥</span>얇은 가디건</div>
        <div class="clothing-tag"><span>👖</span>청바지/면바지</div>
        <div class="clothing-tag"><span>👟</span>편한 운동화</div>
        <div class="clothing-tag"><span>🕶️</span>선글라스</div>
        <div class="clothing-tag"><span>☂️</span>접이식 우산</div>
      </div>
    </div>
  `;
}

// ── ★ Real Logic: Gemini로 짐 리스트 생성 ────────
async function generatePacking() {
  if (!apiKey) { openModal(); return; }
  const btn = document.getElementById('gen-packing-btn');
  btn.disabled = true;
  btn.textContent = '⏳ 생성 중...';

  const prompt = `여행지: ${tripData.destination || '미정'}, 기간: ${tripData.days || 3}일, 여행 스타일: ${tripData.styles || '관광'}
이 여행에 꼭 필요한 짐 리스트를 카테고리별로 반환해주세요.

반드시 아래 JSON 형식 그대로, 코드블록 포함:
\`\`\`json
{
  "categories": [
    { "name": "카테고리명", "icon": "이모지", "items": ["아이템1", "아이템2"] }
  ]
}
\`\`\`

카테고리: 의류, 세면/목욕, 전자기기, 의약품, 서류/결제, 여행 편의용품. 각 4~6개 아이템.`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    if (!res.ok) throw new Error((await res.json()).error?.message);
    const raw = (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    const parsed = JSON.parse(match ? match[1] : raw);
    renderPacking(parsed.categories);
  } catch (err) {
    document.getElementById('packing-container').innerHTML = `<p style="color:#f87171">오류: ${err.message}</p>`;
  }
  btn.disabled = false;
  btn.textContent = '🔄 다시 생성';
}

function renderPacking(categories) {
  if (!categories) return;
  let total = 0;
  document.getElementById('packing-container').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px">
      ${categories.map(cat => {
        total += cat.items.length;
        return `
          <div class="glass-card">
            <div class="form-section-title"><span>${cat.icon}</span> ${cat.name}</div>
            <div class="packing-items">
              ${cat.items.map(item => `
                <div class="packing-item" onclick="this.classList.toggle('checked');updateProgress()">
                  <div class="check-box"></div>
                  <span class="item-text">${item}</span>
                </div>
              `).join('')}
            </div>
          </div>`;
      }).join('')}
    </div>
    <div class="packing-progress" style="margin-top:20px">
      <div class="packing-progress-bar"><div class="packing-progress-fill" id="packing-fill" style="width:0%"></div></div>
      <div class="packing-progress-text" id="packing-text">0 / ${total}</div>
    </div>`;
}

function updateProgress() {
  const all = document.querySelectorAll('.packing-item');
  const done = document.querySelectorAll('.packing-item.checked');
  if (!all.length) return;
  const pct = Math.round(done.length / all.length * 100);
  document.getElementById('packing-fill').style.width = pct + '%';
  document.getElementById('packing-text').textContent = `${done.length} / ${all.length}`;
}

// ── Tab ─────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`tab-${tab}`).classList.add('active');
}

// ── Go / Start ──────────────────────────────────
function startPlanning() {
  if (!apiKey) { openModal(); return; }
  showScreen('screen-input');
}

function generate() {
  const dest = document.getElementById('destination').value.trim();
  if (!dest) { alert('여행지를 입력해주세요!'); return; }
  const start = new Date(document.getElementById('start-date').value);
  const end = new Date(document.getElementById('end-date').value);
  const days = Math.max(1, Math.ceil((end - start) / 86400000) + 1);
  const styles = [...document.querySelectorAll('.tag.selected')].map(t => t.dataset.value).join(', ') || '관광';
  tripData = { destination: dest, days, styles };

  document.getElementById('result-title').textContent = `✈️ ${dest} 여행`;
  document.getElementById('result-meta').textContent = `${document.getElementById('start-date').value} ~ ${document.getElementById('end-date').value} · ${days}일`;

  renderMockItinerary();
  renderMockWeather();
  document.getElementById('packing-container').innerHTML = `
    <div style="text-align:center;padding:40px;color:var(--text-muted)">
      <div style="font-size:48px;margin-bottom:12px">🎒</div>
      <div>아래 버튼을 눌러 AI 짐 리스트를 생성하세요</div>
    </div>`;
  showScreen('screen-result');
  switchTab('itinerary');
}

// ── Init ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateApiDot();
  setupTags();
  onBudget();

  const today = new Date();
  const d1 = new Date(today); d1.setDate(d1.getDate() + 30);
  const d2 = new Date(today); d2.setDate(d2.getDate() + 34);
  document.getElementById('start-date').value = d1.toISOString().slice(0,10);
  document.getElementById('end-date').value = d2.toISOString().slice(0,10);

  document.getElementById('modal').addEventListener('click', e => { if(e.target===document.getElementById('modal')) closeModal(); });
});
