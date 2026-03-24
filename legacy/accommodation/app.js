/* ══════════════════════════════════════
   TripAI — 숙소 · Accommodation Finder
   Yes/No decision flow + AI area recommendation + booking deep links
══════════════════════════════════════ */

/* ── Fallback AI recommendations per destination ── */
const FALLBACK_REC = {
  '도쿄': {
    areas: [
      { name: '신주쿠', desc: '교통 허브, 백화점+식당 밀집', tag: '시내중심·가성비' },
      { name: '시부야', desc: 'SNS 핫플, 젊은 분위기', tag: '감성·쇼핑' },
      { name: '아사쿠사', desc: '전통 분위기, 관광지 인접', tag: '문화·관광' },
      { name: '긴자', desc: '고급 호텔 밀집, 쇼핑 편리', tag: '럭셔리' },
    ],
    tip: '도쿄는 지하철이 잘 돼 있어서 어느 지역이든 접근성이 좋아요. 첫 방문이라면 <strong>신주쿠나 시부야</strong>를 추천드려요.',
  },
  '파리': {
    areas: [
      { name: '마레 (3·4구)', desc: '감성 카페, 미술관 밀집', tag: '감성·문화' },
      { name: '생제르맹 (6구)', desc: '파리 로컬 분위기 최고', tag: '로컬·럭셔리' },
      { name: '오페라 (9구)', desc: '교통 편리, 가성비 호텔 多', tag: '가성비·시내' },
      { name: '샹젤리제 (8구)', desc: '에펠탑 인접, 고급 호텔', tag: '럭셔리·관광' },
    ],
    tip: '파리는 지역(구)마다 분위기가 크게 달라요. <strong>마레 지구</strong>는 감성과 편의성 모두 잡을 수 있어 추천해요.',
  },
  '방콕': {
    areas: [
      { name: '수쿰빗', desc: '외국인 많음, 편의시설 풍부', tag: '시내중심·편의' },
      { name: '시암', desc: '쇼핑몰 밀집, BTS 역 인접', tag: '쇼핑·교통' },
      { name: '카오산로드', desc: '배낭여행자 명소, 저렴한 숙소', tag: '가성비' },
      { name: '차오프라야강변', desc: '럭셔리 리조트, 강뷰', tag: '럭셔리·뷰' },
    ],
    tip: '방콕은 교통 체증이 심하니 <strong>BTS 스카이트레인 역 근처</strong> 숙소를 선택하면 이동이 편리해요.',
  },
  '발리': {
    areas: [
      { name: '쿠타·레기안', desc: '해변 인접, 서퍼 분위기', tag: '해변·가성비' },
      { name: '스미냑', desc: '럭셔리 빌라, 트렌디한 레스토랑', tag: '감성·럭셔리' },
      { name: '우붓', desc: '자연·문화 체험, 논 뷰 빌라', tag: '자연뷰·힐링' },
      { name: '짱구', desc: 'SNS 핫플, 서퍼&디지털노마드', tag: '감성·힙' },
    ],
    tip: '해변을 원하면 <strong>스미냑</strong>, 자연 힐링을 원하면 <strong>우붓</strong>을 추천해요. 두 지역은 차로 1시간 거리예요.',
  },
};

const GENERIC_REC = {
  areas: [
    { name: '시내 중심부', desc: '관광지 접근성 최고', tag: '시내중심' },
    { name: '구시가지', desc: '로컬 분위기, 도보 관광', tag: '문화·감성' },
  ],
  tip: 'Gemini API Key를 설정하면 해당 여행지에 맞는 정확한 숙소 지역 추천을 받을 수 있어요.',
};

/* ── State ── */
const st = { dest: '', styles: ['가성비'], apiKey: '' };

/* ── Utils ── */
let _tt;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(_tt); _tt = setTimeout(() => el.classList.remove('show'), 2800);
}
function openModal()  { document.getElementById('modal').classList.add('open'); document.getElementById('key-input').value = st.apiKey; }
function closeModal() { document.getElementById('modal').classList.remove('open'); }
function saveKey() {
  const v = document.getElementById('key-input').value.trim();
  if (!v) { toast('API Key를 입력하세요'); return; }
  st.apiKey = v; localStorage.setItem('tripai_key', v);
  closeModal(); toast('✅ API Key 저장됨');
}

/* ── Decision flow ── */
function choose(type) {
  document.querySelectorAll('.decision-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`.decision-card.${type}`).classList.add('selected');

  const nextPanel    = document.getElementById('next-panel');
  const searchPanel  = document.getElementById('search-panel');
  const bookingSec   = document.getElementById('booking-section');

  if (type === 'yes') {
    nextPanel.classList.add('visible');
    searchPanel.classList.remove('visible');
    bookingSec.classList.remove('visible');
    setTimeout(() => nextPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  } else {
    nextPanel.classList.remove('visible');
    searchPanel.classList.add('visible');
    setTimeout(() => searchPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }
}

/* ── Style filter chips ── */
document.getElementById('style-filters').addEventListener('click', e => {
  const tag = e.target.closest('.ftag');
  if (!tag) return;
  tag.classList.toggle('on');
  st.styles = [...document.querySelectorAll('.ftag.on')].map(t => t.dataset.v);
});

/* ── Search ── */
async function searchAccom() {
  const raw = document.getElementById('dest-input').value.trim();
  if (!raw) { toast('여행지를 입력해주세요'); return; }
  st.dest = raw;

  document.getElementById('s-btn').disabled = true;
  document.getElementById('spinner').style.display = 'flex';
  document.getElementById('ai-rec').classList.remove('visible');
  document.getElementById('booking-section').classList.remove('visible');

  st.apiKey = localStorage.getItem('tripai_key') || '';
  if (st.apiKey) {
    await fetchGeminiRec(raw);
  } else {
    await new Promise(r => setTimeout(r, 700));
    renderFallback(raw);
  }

  renderBooking(raw);
  document.getElementById('s-btn').disabled = false;
  document.getElementById('spinner').style.display = 'none';
  document.getElementById('booking-section').classList.add('visible');
  setTimeout(() => document.getElementById('ai-rec').scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
}

/* ── Gemini ── */
async function fetchGeminiRec(dest) {
  const styleStr = st.styles.join(', ') || '가성비';
  const prompt = `여행지: ${dest}, 여행 스타일: ${styleStr}
다음 JSON만 반환 (다른 텍스트 없이):
{
  "areas": [
    {"name":"지역명","desc":"한 줄 설명 15자 이내","tag":"키워드1·키워드2"}
  ],
  "tip":"전체 팁 2~3문장, HTML <strong> 허용"
}
areas는 2~4개. 여행 스타일에 맞게 추천.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${st.apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
    );
    const data = await res.json();
    const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const json = JSON.parse(raw.replace(/```json|```/g, '').trim());
    renderRec(json);
  } catch {
    toast('샘플 데이터로 표시됩니다');
    renderFallback(dest);
  }
}

function renderFallback(dest) {
  const key = Object.keys(FALLBACK_REC).find(k =>
    dest.toLowerCase().includes(k) || k.includes(dest.toLowerCase())
  );
  renderRec(key ? FALLBACK_REC[key] : GENERIC_REC);
}

function renderRec(data) {
  const areaHtml = (data.areas || []).map(a => `
    <div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
      <span style="font-weight:700;color:var(--text)">${a.name}</span>
      <span style="margin-left:8px;font-size:10px;color:var(--amber);background:rgba(245,158,11,0.1);
        border:1px solid rgba(245,158,11,0.25);padding:2px 7px;border-radius:999px">${a.tag}</span>
      <div style="font-size:11px;color:var(--muted);margin-top:3px">${a.desc}</div>
    </div>`).join('');

  document.getElementById('ai-rec-text').innerHTML =
    areaHtml + `<div style="margin-top:12px;font-size:12px;color:var(--muted)">${data.tip || ''}</div>`;
  document.getElementById('ai-rec').classList.add('visible');
}

/* ── Booking sites ── */
function renderBooking(dest) {
  const enc = encodeURIComponent(dest);

  const sites = [
    {
      logo: '🔵', name: '부킹닷컴',    sub: '전세계 최다 숙소 보유',
      url: `https://www.booking.com/searchresults.ko.html?ss=${enc}&lang=ko`,
    },
    {
      logo: '🟣', name: '아고다',      sub: '아시아 숙소 특가',
      url: `https://www.agoda.com/ko-kr/search?city=${enc}&locale=ko-kr`,
    },
    {
      logo: '🟠', name: '익스피디아',   sub: '호텔+항공 묶음 할인',
      url: `https://www.expedia.co.kr/Hotels-Search?destination=${enc}`,
    },
    {
      logo: '🟡', name: '야놀자',      sub: '국내 최대 숙박 플랫폼',
      url: `https://www.yanolja.com/search?keyword=${enc}`,
    },
    {
      logo: '🔴', name: '에어비앤비',   sub: '집·빌라·독채 숙소',
      url: `https://www.airbnb.co.kr/s/${enc}/homes`,
    },
    {
      logo: '🟢', name: '호텔스닷컴',   sub: '10박 모으면 1박 무료',
      url: `https://kr.hotels.com/search.do?q-destination=${enc}`,
    },
  ];

  document.getElementById('booking-grid').innerHTML = sites.map(s => `
    <a class="booking-btn" href="${s.url}" target="_blank" rel="noopener">
      <div class="booking-logo">${s.logo}</div>
      <div>
        <div class="booking-name">${s.name}</div>
        <div class="booking-sub">${s.sub}</div>
      </div>
      <div class="booking-arrow">↗</div>
    </a>`).join('');
}

/* ── Init ── */
(function init() {
  st.apiKey = localStorage.getItem('tripai_key') || '';
})();
