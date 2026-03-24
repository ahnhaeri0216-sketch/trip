/* ══════════════════════════════════════
   TripAI — 항공권 · Flight Finder
   Gemini AI season recommendations + booking deep links
══════════════════════════════════════ */

/* ── IATA codes for common destinations ── */
const IATA = {
  '도쿄':'TYO','tokyo':'TYO','오사카':'OSA','osaka':'OSA','후쿠오카':'FUK',
  '파리':'CDG','paris':'CDG','런던':'LHR','london':'LHR',
  '뉴욕':'JFK','newyork':'JFK','로스앤젤레스':'LAX','la':'LAX',
  '방콕':'BKK','bangkok':'BKK','발리':'DPS','bali':'DPS',
  '싱가포르':'SIN','singapore':'SIN','홍콩':'HKG','hongkong':'HKG',
  '바르셀로나':'BCN','barcelona':'BCN','로마':'FCO','rome':'FCO',
  '프라하':'PRG','prague':'PRG','암스테르담':'AMS','amsterdam':'AMS',
  '두바이':'DXB','dubai':'DXB','이스탄불':'IST','istanbul':'IST',
  '시드니':'SYD','sydney':'SYD','하노이':'HAN','호치민':'SGN',
  '나트랑':'CXR','세부':'CEB','다낭':'DAD',
};
const ORIGIN = 'ICN'; // 인천공항

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const MONTH_KEYS = ['01','02','03','04','05','06','07','08','09','10','11','12'];

/* ── Fallback data ── */
const FALLBACK = {
  '도쿄': {
    airport: 'NRT (나리타) 또는 HND (하네다) — 두 공항 모두 도쿄 접근 가능. 하네다가 시내와 더 가까워요.',
    months: [
      {r:'ok',   label:'⚡ 무난',  desc:'겨울 막바지, 선선함',       temp:'-3~9°C'},
      {r:'ok',   label:'⚡ 무난',  desc:'점점 따뜻해지는 시기',       temp:'2~12°C'},
      {r:'best', label:'✦ 최적',  desc:'벚꽃 시즌! 최고 인기',       temp:'8~18°C'},
      {r:'best', label:'✦ 최적',  desc:'따뜻하고 쾌적한 봄',         temp:'14~22°C'},
      {r:'ok',   label:'⚡ 무난',  desc:'초여름, 아직 덜 더움',       temp:'19~26°C'},
      {r:'avoid',label:'✗ 비추',  desc:'우기 시작, 습하고 더움',      temp:'22~30°C'},
      {r:'avoid',label:'✗ 비추',  desc:'가장 덥고 습한 여름',         temp:'25~34°C'},
      {r:'ok',   label:'⚡ 무난',  desc:'더위 다소 꺾임, 아직 더움',   temp:'25~32°C'},
      {r:'best', label:'✦ 최적',  desc:'단풍 시즌, 선선하고 쾌적',    temp:'19~26°C'},
      {r:'best', label:'✦ 최적',  desc:'가을 단풍 절정!',             temp:'13~20°C'},
      {r:'ok',   label:'⚡ 무난',  desc:'쌀쌀하지만 관광 쾌적',       temp:'6~15°C'},
      {r:'ok',   label:'⚡ 무난',  desc:'추운 겨울, 연말 분위기 굿',   temp:'1~9°C'},
    ]
  },
  '파리': {
    airport: 'CDG (샤를 드골) — 파리 메인 공항. ORY (오를리)도 가능하나 CDG가 더 편리해요.',
    months: [
      {r:'avoid',label:'✗ 비추',  desc:'춥고 흐린 겨울',             temp:'1~7°C'},
      {r:'avoid',label:'✗ 비추',  desc:'여전히 춥고 비가 많음',       temp:'2~9°C'},
      {r:'ok',   label:'⚡ 무난',  desc:'점점 따뜻해지는 봄',         temp:'6~14°C'},
      {r:'best', label:'✦ 최적',  desc:'꽃피는 봄, 관광 최적',       temp:'10~19°C'},
      {r:'best', label:'✦ 최적',  desc:'따뜻하고 화창한 봄',         temp:'14~23°C'},
      {r:'best', label:'✦ 최적',  desc:'여름 시작, 쾌적함',          temp:'17~26°C'},
      {r:'ok',   label:'⚡ 무난',  desc:'성수기, 더울 수 있음',       temp:'19~28°C'},
      {r:'ok',   label:'⚡ 무난',  desc:'여름 끝, 인파 많음',         temp:'19~28°C'},
      {r:'best', label:'✦ 최적',  desc:'어깨 시즌, 쾌적하고 덜 붐빔', temp:'14~23°C'},
      {r:'ok',   label:'⚡ 무난',  desc:'가을, 선선하고 구름 많음',   temp:'9~17°C'},
      {r:'avoid',label:'✗ 비추',  desc:'비 자주, 쌀쌀한 초겨울',     temp:'5~11°C'},
      {r:'avoid',label:'✗ 비추',  desc:'크리스마스 분위기 좋지만 추움', temp:'1~8°C'},
    ]
  },
  '방콕': {
    airport: 'BKK (수완나품) — 방콕 메인 국제공항. DMK (돈므앙)은 저가항공 위주.',
    months: [
      {r:'best', label:'✦ 최적',  desc:'건기·선선, 여행 최적기',      temp:'22~33°C'},
      {r:'best', label:'✦ 최적',  desc:'건기·맑음, 가장 덜 더움',     temp:'24~35°C'},
      {r:'ok',   label:'⚡ 무난',  desc:'더워지기 시작',              temp:'26~36°C'},
      {r:'avoid',label:'✗ 비추',  desc:'가장 무더운 시기',            temp:'28~38°C'},
      {r:'avoid',label:'✗ 비추',  desc:'우기 시작, 더위+비',         temp:'27~37°C'},
      {r:'avoid',label:'✗ 비추',  desc:'우기, 비가 많음',             temp:'26~34°C'},
      {r:'avoid',label:'✗ 비추',  desc:'우기 절정, 홍수 주의',        temp:'26~33°C'},
      {r:'avoid',label:'✗ 비추',  desc:'우기 지속',                  temp:'26~33°C'},
      {r:'avoid',label:'✗ 비추',  desc:'우기 끝 무렵',               temp:'26~33°C'},
      {r:'ok',   label:'⚡ 무난',  desc:'우기 마감, 점점 좋아짐',     temp:'25~33°C'},
      {r:'best', label:'✦ 최적',  desc:'건기 시작, 쾌적해짐',        temp:'24~33°C'},
      {r:'best', label:'✦ 최적',  desc:'건기·선선, 연말 분위기',      temp:'22~32°C'},
    ]
  },
};

/* ── State ── */
const st = {
  dest:    '',
  iata:    '',
  apiKey:  '',
  calData: null,
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
function saveKey() {
  const v = document.getElementById('key-input').value.trim();
  if (!v) { toast('API Key를 입력하세요'); return; }
  st.apiKey = v; localStorage.setItem('tripai_key', v);
  closeModal(); toast('✅ API Key 저장됨');
}
function setDest(d) {
  document.getElementById('dest-input').value = d;
  searchDest();
}
function fmt(d) { return d ? new Date(d).toLocaleDateString('ko-KR', { month:'long', day:'numeric' }) : ''; }

/* ── Main search ── */
async function searchDest() {
  const raw = document.getElementById('dest-input').value.trim();
  if (!raw) { toast('여행지를 입력해주세요'); return; }
  st.dest = raw;

  // Resolve IATA
  const key = raw.toLowerCase().replace(/\s/g,'');
  st.iata = IATA[raw] || IATA[key] || '';

  // Show calendar section, hide others
  document.getElementById('calendar-section').classList.add('visible');
  document.getElementById('cal-title').textContent = `${raw} — 월별 여행 추천`;
  document.getElementById('cal-loading').style.display = 'flex';
  document.getElementById('cal-grid').style.display   = 'none';
  document.getElementById('cal-legend').style.display = 'none';
  document.getElementById('airport-info').style.display = 'none';
  document.getElementById('date-section').classList.remove('visible');
  document.getElementById('booking-section').classList.remove('visible');

  // Scroll to calendar
  setTimeout(() => document.getElementById('calendar-section').scrollIntoView({ behavior:'smooth', block:'start' }), 100);

  // Fetch AI data
  st.apiKey = localStorage.getItem('tripai_key') || '';
  if (st.apiKey) {
    await fetchGeminiSeasons(raw);
  } else {
    await new Promise(r => setTimeout(r, 800));
    renderFallback(raw);
  }

  // Show date & booking
  document.getElementById('date-section').classList.add('visible');
  document.getElementById('booking-section').classList.add('visible');
  updateBooking();
}

/* ── Gemini API ── */
async function fetchGeminiSeasons(dest) {
  const prompt = `여행지: ${dest}
다음 JSON을 정확히 반환해주세요 (다른 텍스트 없이 JSON만):
{
  "airport": "공항 IATA 코드와 공항명, 인천에서 어느 공항에 착륙하는지 한국어로 2문장 이내",
  "months": [
    {"r":"best"|"ok"|"avoid", "label":"✦ 최적"|"⚡ 무난"|"✗ 비추", "desc":"한 줄 설명 (15자 이내)", "temp":"기온범위 °C"}
  ]
}
months 배열은 1월~12월 순서로 정확히 12개. r 값은 best/ok/avoid 중 하나만.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${st.apiKey}`,
      { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }] }) }
    );
    const data = await res.json();
    const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const json = JSON.parse(raw.replace(/```json|```/g,'').trim());
    renderCalendar(json);
  } catch {
    toast('샘플 데이터로 표시됩니다');
    renderFallback(dest);
  }
}

function renderFallback(dest) {
  const key = Object.keys(FALLBACK).find(k =>
    dest.toLowerCase().includes(k) || k.includes(dest.toLowerCase())
  );
  if (key) {
    renderCalendar(FALLBACK[key]);
  } else {
    // generic
    renderCalendar({
      airport: `${dest}의 주요 공항에 착륙합니다. Gemini API Key를 설정하면 정확한 공항 정보를 알 수 있어요.`,
      months: MONTHS.map((_, i) => ({
        r: i === 5 || i === 6 || i === 7 ? 'ok' : 'best',
        label: i === 5 || i === 6 || i === 7 ? '⚡ 무난' : '✦ 최적',
        desc: 'API Key 설정 시 정밀 데이터',
        temp: '—',
      }))
    });
  }
}

/* ── Render calendar ── */
function renderCalendar(data) {
  document.getElementById('cal-loading').style.display = 'none';
  st.calData = data;

  // Airport info
  if (data.airport) {
    const ai = document.getElementById('airport-info');
    ai.innerHTML = `✈ <strong>공항 안내</strong><br>${data.airport}`;
    ai.style.display = 'block';

    // Try to parse IATA from airport text if not already set
    if (!st.iata) {
      const match = data.airport.match(/\b([A-Z]{3})\b/);
      if (match) st.iata = match[1];
    }
  }

  // Month grid
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';
  if (!data.months || data.months.length !== 12) {
    grid.innerHTML = '<p style="color:var(--muted);grid-column:1/-1">데이터를 불러오지 못했어요.</p>';
  } else {
    data.months.forEach((m, i) => {
      const card = document.createElement('div');
      card.className = `month-card ${m.r}`;
      card.onclick = () => selectMonth(i, card);
      card.innerHTML = `
        <div class="month-name">${MONTHS[i]}</div>
        <div class="month-rating">${m.label}</div>
        <div class="month-desc">${m.desc}</div>
        <div class="month-temp">${m.temp}</div>`;
      grid.appendChild(card);
    });
  }
  grid.style.display = 'grid';
  document.getElementById('cal-legend').style.display = 'flex';

  // Auto-select best month for departure date defaults
  if (data.months) {
    const now  = new Date();
    const year = now.getFullYear();
    // Find first "best" month after today
    let bestIdx = data.months.findIndex((m, i) => m.r === 'best' && i >= now.getMonth());
    if (bestIdx === -1) bestIdx = data.months.findIndex(m => m.r === 'best');
    if (bestIdx !== -1) {
      const depYear = bestIdx <= now.getMonth() ? year + 1 : year;
      const dep = `${depYear}-${MONTH_KEYS[bestIdx]}-15`;
      const ret = new Date(dep); ret.setDate(ret.getDate() + 5);
      document.getElementById('dep-date').value = dep;
      document.getElementById('ret-date').value = ret.toISOString().split('T')[0];
      updateBooking();
    }
  }
}

function selectMonth(i, card) {
  document.querySelectorAll('.month-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  // Set departure date to the 15th of that month
  const now = new Date();
  const yr  = i <= now.getMonth() ? now.getFullYear() + 1 : now.getFullYear();
  const dep = `${yr}-${MONTH_KEYS[i]}-15`;
  const ret = new Date(dep); ret.setDate(ret.getDate() + 5);
  document.getElementById('dep-date').value = dep;
  document.getElementById('ret-date').value = ret.toISOString().split('T')[0];
  updateBooking();
  document.getElementById('date-section').scrollIntoView({ behavior:'smooth', block:'nearest' });
}

/* ── Save to localStorage for packing card ── */
function saveFlightData() {
  const dep = document.getElementById('dep-date').value;
  const ret = document.getElementById('ret-date').value;
  if (!st.dest || !dep || !ret) return;
  const nights = Math.round((new Date(ret) - new Date(dep)) / 86400000);
  // Guess weather from selected month
  const depMonth = dep ? new Date(dep).getMonth() : -1;
  const calData  = st.calData;
  let weather = 'mild';
  if (calData && calData.months && depMonth >= 0) {
    const temp = calData.months[depMonth]?.temp || '';
    const maxTemp = parseInt(temp.split('~')[1]) || 20;
    if (maxTemp >= 32) weather = 'hot';
    else if (maxTemp >= 24) weather = 'sunny';
    else if (maxTemp >= 15) weather = 'mild';
    else if (maxTemp >= 5)  weather = 'cold';
    else weather = 'snow';
    // Check if avoid month (rain season)
    if (calData.months[depMonth]?.r === 'avoid' && weather === 'hot') weather = 'rain';
  }
  localStorage.setItem('tripai_flight', JSON.stringify({
    dest: st.dest, depDate: dep, retDate: ret, nights, weather,
  }));
}

/* ── Booking links ── */
function updateBooking() {
  const dep = document.getElementById('dep-date').value;
  const ret = document.getElementById('ret-date').value;
  saveFlightData();
  const dest = st.dest;
  const iata = st.iata;

  // Update route badge
  document.getElementById('booking-route').textContent =
    iata ? `인천(ICN) → ${dest}(${iata})` : `인천(ICN) → ${dest}`;
  document.getElementById('booking-dates').textContent =
    dep && ret ? `${fmt(dep)} ~ ${fmt(ret)}` : '날짜를 선택하면 바로 검색할 수 있어요';

  // Build deep links
  const depFmt  = dep.replace(/-/g,'');  // YYYYMMDD for some sites
  const depDash = dep;                   // YYYY-MM-DD
  const retFmt  = ret.replace(/-/g,'');

  const links = [
    {
      logo: '🔵', name: '스카이스캐너', sub: '최저가 항공권 비교',
      url: iata
        ? `https://www.skyscanner.co.kr/transport/flights/${ORIGIN}/${iata}/${depFmt}/?adultsv2=1&inboundaltsenabled=false&outboundaltsenabled=false&preferdirects=false&ref=home&rtn=1&inbounddate=${retFmt}`
        : `https://www.skyscanner.co.kr/flights`,
    },
    {
      logo: '🟡', name: '네이버 항공', sub: '국내 최다 항공사 비교',
      url: iata
        ? `https://flight.naver.com/flights/international/${ORIGIN}-${iata}-${depFmt}/${iata}-${ORIGIN}-${retFmt}?adult=1&fareType=Y`
        : `https://flight.naver.com`,
    },
    {
      logo: '🟠', name: 'Trip.com', sub: '전세계 항공권 특가',
      url: iata
        ? `https://kr.trip.com/flights/showfarefirst/oneway-${ORIGIN.toLowerCase()}-${iata.toLowerCase()}/?dcity=${ORIGIN}&acity=${iata}&ddate=${depDash}&retdate=${ret}&adult=1&child=0&infant=0&cabin=Y&class=Economy`
        : `https://kr.trip.com/flights`,
    },
    {
      logo: '🔵', name: '익스피디아', sub: '호텔+항공 묶음 할인',
      url: iata
        ? `https://www.expedia.co.kr/Flights-Search?trip=roundtrip&leg1=from%3A${ORIGIN}%2Cto%3A${iata}%2Cdeparture%3A${depFmt}TANYT&leg2=from%3A${iata}%2Cto%3A${ORIGIN}%2Cdeparture%3A${retFmt}TANYT&passengers=adults%3A1&options=cabinclass%3Aeconomy`
        : `https://www.expedia.co.kr/Flights`,
    },
  ];

  const grid = document.getElementById('booking-grid');
  grid.innerHTML = links.map(l => `
    <a class="booking-btn" href="${l.url}" target="_blank" rel="noopener">
      <div class="booking-logo">${l.logo}</div>
      <div>
        <div class="booking-name">${l.name}</div>
        <div class="booking-sub">${l.sub}</div>
      </div>
      <div class="booking-arrow">↗</div>
    </a>`).join('');
}

/* ── Init ── */
(function init() {
  st.apiKey = localStorage.getItem('tripai_key') || '';
  // Default dates
  const d1 = new Date(); d1.setMonth(d1.getMonth() + 2); d1.setDate(15);
  const d2 = new Date(d1); d2.setDate(d2.getDate() + 5);
  document.getElementById('dep-date').value = d1.toISOString().split('T')[0];
  document.getElementById('ret-date').value = d2.toISOString().split('T')[0];
})();
