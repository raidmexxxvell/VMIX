// Упрощённая логика управления таблом через vMix HTTP API
const API_BASE = 'http://localhost:8088/api/';

const inputSelect = document.getElementById('inputSelect');
const btnRefresh = document.getElementById('btnRefresh');
const fieldsList = document.getElementById('fieldsList');
const logEl = document.getElementById('log');
const autoPollCheckbox = document.getElementById('autoPoll');

// Элементы интерфейса табло
const homeNameEl = document.getElementById('homeName');
const awayNameEl = document.getElementById('awayName');
let homeNameTextEl = document.getElementById('homeNameText');
let awayNameTextEl = document.getElementById('awayNameText');
const homeEditBtn = document.getElementById('homeEditBtn');
const awayEditBtn = document.getElementById('awayEditBtn');
const homeScoreEl = document.getElementById('homeScore');
const awayScoreEl = document.getElementById('awayScore');
const homePlus = document.getElementById('homePlus');
const homeMinus = document.getElementById('homeMinus');
const awayPlus = document.getElementById('awayPlus');
const awayMinus = document.getElementById('awayMinus');
const homeFoulsEl = document.getElementById('homeFouls');
const awayFoulsEl = document.getElementById('awayFouls');
const homeFoulPlus = document.getElementById('homeFoulPlus');
const homeFoulMinus = document.getElementById('homeFoulMinus');
const awayFoulPlus = document.getElementById('awayFoulPlus');
const awayFoulMinus = document.getElementById('awayFoulMinus');
const matchTimerEl = document.getElementById('matchTimer');
const timerStartBtn = document.getElementById('timerStart');
const timerStopBtn = document.getElementById('timerStop');
const timerResetBtn = document.getElementById('timerReset');
const resetScoreBtn = document.getElementById('resetScore');
const lowerTabBtn = document.getElementById('lowerTabBtn');
const penaltyBtn = document.getElementById('penaltyBtn');
const bigTabBtn = document.getElementById('bigTabBtn');
const centerTabBtn = document.getElementById('centerTabBtn');
const mainBtn = document.getElementById('mainBtn');
const homeColorBtn = document.getElementById('homeColorBtn');
const awayColorBtn = document.getElementById('awayColorBtn');
const homeColorInput = document.getElementById('homeColorInput');
const awayColorInput = document.getElementById('awayColorInput');
const homeColorApply = document.getElementById('homeColorApply');
const awayColorApply = document.getElementById('awayColorApply');
const halfSelect = document.getElementById('halfSelect');
const replayMarkBtn = document.getElementById('replayMarkBtn');
const goalMomentBtn = document.getElementById('goalMomentBtn');
// foul button removed per request
const betweenHalvesBtn = document.getElementById('betweenHalvesBtn');
const varBtn = document.getElementById('varBtn');
const recBtn = document.getElementById('recBtn');
const clearEventsBtn = document.getElementById('clearEventsBtn');

let vmixDoc = null;
let pollTimer = null;
let scoreboard = {
  inputNumber: null,
  inputKey: null,
  homeFieldName: null,    // SelectedName для очков хозяев (например "Счет дом.Text")
  awayFieldName: null,    // SelectedName для очков гостей
  homeTeamNameField: null,// SelectedName для названия домашней команды
  awayTeamNameField: null, // SelectedName для названия гостевой команды
  homeColorField: null,
  awayColorField: null,
  halfFieldName: null,
  homeFoulsField: null,
  awayFoulsField: null,
  timeFieldName: null,
  foulImages: {home: {}, away: {} }
};
const pendingColors = { home: '#000000', away: '#000000' };
// Состояние таймера: обратный отсчёт в секундах. По умолчанию старт = 20 минут (1200 с)
let TIMER_DEFAULT_SECONDS = 20 * 60;
// Если в вашем GT-шаблоне используется встроенный объект Countdown, укажите его индекс здесь (обычно 1).
// Установите в `null`, чтобы использовать старое поведение (обновление через SetText).
let TIMER_INDEX = 1; // по умолчанию 1 — установите null, чтобы использовать SetText вместо команд Countdown
// sendEvery: как часто (в секундах) отправлять значение таймера в vMix при использовании SetText.
let timerState = {intervalId: null, secondsRemaining: TIMER_DEFAULT_SECONDS, sendEvery: 1, tickCounter: 0};
let autoPollPaused = false;
let ignoreHalfSelectChange = false;
let replayRecordingActive = false;
// Кеш последних отправленных значений, чтобы избегать дублирующих SetText (по ключу SelectedName)
const lastSentText = {};
// Кеш последних отправленных цветов (по ключу Input::SelectedName) — чтобы не дублировать SetColor
const lastSentColor = {};
// Кеш последних увиденных цветов по Input — позволяет обнаруживать изменения, сделанные вне этого UI
const lastSeenColors = {};

// флаг, какая команда сейчас в режиме редактирования: 'home' | 'away' | null
let editingTeam = null;

// overlay state for lower tab (overlay index 4)
let lowerTabVisible = false;

// overlay state for penalty button
let penaltyVisible = false;
let bigTabVisible = false;
let centerTabVisible = false;

// input numbers for the special overlays (as provided)
const LOWER_TAB_INPUT_NUMBER = '5';
const PENALTY_INPUT_NUMBER = '6';
const BIGTAB_INPUT_NUMBER = '7';
const CENTER_TAB_INPUT_NUMBER = '2';

const BIG_SCOREBOARD_INPUT_NUMBER = '5';
const LOWER_TAB_OVERLAY_INDEX = 4;
const REPLAY_INPUT_NUMBER = '8';
const REPLAY_CHANNEL = '1';
const REPLAY_DELETE_LOOP_LIMIT = 50;
// Сопоставление изображений фолов: {home: {1: index, 2: index...}, away: {...}}
scoreboard.foulImages = {home: {}, away: {}};
scoreboard.homeFoulsField = null;
scoreboard.awayFoulsField = null;
scoreboard.timeFieldName = null;

function log(msg, err=false){ /* логирование отключено */ }

const diagEl = document.getElementById('diag');
const streamIndicatorEl = document.getElementById('streamIndicator');
const streamIndicatorStatusEl = document.getElementById('streamIndicatorStatus');
const streamKeyDisplay = document.getElementById('streamKeyDisplay');
const streamStartBtn = document.getElementById('streamStartBtn');
const streamStopBtn = document.getElementById('streamStopBtn');
const streamKeyEditBtn = document.getElementById('streamKeyEditBtn');
const STREAM_KEY_STORAGE = 'vmixStreamingKey';
let streamingKey = '';
let streamingActive = false;
function updateDiag(){
  if(!diagEl) return;
  const parts = [];
  parts.push(`Input: ${scoreboard.inputNumber || '—'}`);
  parts.push(`homeField: ${scoreboard.homeFieldName || '—'}`);
  parts.push(`awayField: ${scoreboard.awayFieldName || '—'}`);
  diagEl.textContent = 'Диагностика: ' + parts.join(' | ');
}

function maskStreamingKey(key){
  if(!key) return '';
  const trimmed = key.trim();
  if(trimmed.length <= 4) return '••••';
  return '••••' + trimmed.slice(-4);
}

function updateStreamingKeyDisplay(){
  if(!streamKeyDisplay) return;
  const display = streamingKey ? maskStreamingKey(streamingKey) : 'не задан';
  streamKeyDisplay.textContent = `Ключ: ${display}`;
  streamKeyDisplay.title = streamingKey ? streamingKey : 'Ключ стрима отсутствует';
}

function persistStreamingKey(value){
  const trimmed = (value || '').trim();
  streamingKey = trimmed;
  try{
    if(trimmed){
      localStorage.setItem(STREAM_KEY_STORAGE, trimmed);
    } else {
      localStorage.removeItem(STREAM_KEY_STORAGE);
    }
  }catch(e){ /* localStorage may be unavailable */ }
  updateStreamingKeyDisplay();
}

function loadStreamingKeyFromStorage(){
  try{
    const saved = localStorage.getItem(STREAM_KEY_STORAGE);
    if(saved){
      streamingKey = saved.trim();
    }
  }catch(e){ /* ignore */ }
  updateStreamingKeyDisplay();
}

function setStreamingIndicator(active, options={}){
  streamingActive = Boolean(active);
  if(streamIndicatorEl){
    streamIndicatorEl.classList.toggle('live', streamingActive);
  }
  if(streamIndicatorStatusEl){
    streamIndicatorStatusEl.textContent = streamingActive ? 'В эфире' : 'Офлайн';
  }
  if(streamStartBtn) streamStartBtn.disabled = streamingActive;
  if(streamStopBtn) streamStopBtn.disabled = !streamingActive;
  if(options.message && logEl){
    logEl.textContent = options.message;
  }
}

function updateStreamingIndicatorFromXml(){
  if(!vmixDoc) return;
  const node = vmixDoc.querySelector('streaming');
  const text = node ? (node.textContent || '').trim().toLowerCase() : 'false';
  const isLive = text === 'true';
  setStreamingIndicator(isLive);
}

function sendStreamingKeyToVmix(value){
  const candidate = (value !== undefined && value !== null) ? value : streamingKey;
  const trimmed = (candidate || '').trim();
  if(!trimmed){
    return Promise.reject(new Error('Ключ стрима не задан'));
  }
  const payload = `0,${trimmed}`;
  return sendCommandParts([`Function=StreamingSetKey`, `Value=${encodeURIComponent(payload)}`]);
}

async function startStreaming(){
  if(streamStartBtn) streamStartBtn.disabled = true;
  if(!streamingKey){
    if(logEl) logEl.textContent = 'Стрим: ключ не задан, нажмите карандашик.';
    if(streamStartBtn) streamStartBtn.disabled = false;
    return;
  }
  try{
    await sendStreamingKeyToVmix(streamingKey);
  }catch(err){
    if(logEl) logEl.textContent = 'Стрим: не удалось применить ключ';
    if(streamStartBtn) streamStartBtn.disabled = false;
    return;
  }
  try{
    await sendCommandParts([`Function=StartStreaming`]);
    setStreamingIndicator(true, {message: 'Стрим включён'});
  }catch(err){
    if(logEl) logEl.textContent = 'Стрим: не удалось запустить';
    if(streamStartBtn) streamStartBtn.disabled = false;
  }
}

async function stopStreaming(){
  if(streamStopBtn) streamStopBtn.disabled = true;
  try{
    await sendCommandParts([`Function=StopStreaming`]);
    setStreamingIndicator(false, {message: 'Стрим остановлен'});
  }catch(err){
    if(logEl) logEl.textContent = 'Стрим: не удалось остановить';
    if(streamStopBtn) streamStopBtn.disabled = false;
  }
}

function promptStreamingKey(){
  const current = streamingKey || '';
  const result = prompt('Введите ключ стрима (вставьте только ключ)', current);
  if(result === null) return;
  const trimmed = result.trim();
  persistStreamingKey(trimmed);
  if(trimmed){
    sendStreamingKeyToVmix(trimmed).then(()=>{
      if(logEl) logEl.textContent = 'Ключ стрима обновлён';
    }).catch(()=>{
      if(logEl) logEl.textContent = 'Не удалось отправить ключ стрима';
    });
  } else if(logEl){
    logEl.textContent = 'Ключ стрима очищен';
  }
}

function attachStreamingControls(){
  if(streamStartBtn) streamStartBtn.addEventListener('click', ()=> startStreaming());
  if(streamStopBtn) streamStopBtn.addEventListener('click', ()=> stopStreaming());
  if(streamKeyEditBtn) streamKeyEditBtn.addEventListener('click', ()=> promptStreamingKey());
}

async function fetchXml(){
  try{
    const res = await fetch(API_BASE);
    const statusInfo = res.status + ' ' + res.statusText;
    const text = await res.text();
    // Попытаться распарсить XML, даже если статус не OK (vMix иногда возвращает 500 с телом XML)
    try{
      const parser = new DOMParser();
      vmixDoc = parser.parseFromString(text, 'application/xml');
      if(vmixDoc.querySelector('vmix')){
        log('XML загружен ('+statusInfo+')');
      } else {
        log('Получен ответ, но это не XML или пустой документ ('+statusInfo+')', true);
        // Получен текст ответа (лог отключён)
      }
      return vmixDoc;
    }catch(parseErr){
      // Не удалось распарсить XML
      // Response text скрыт (лог отключён)
      throw parseErr;
    }
  }catch(e){ /* ошибка получения XML (лог отключён) */ throw e; }
}

function clearChildren(el){ while(el.firstChild) el.removeChild(el.firstChild); }

function populateInputs(){
  clearChildren(inputSelect);
  const inputs = Array.from(vmixDoc.querySelectorAll('inputs > input'));
  inputs.forEach(inp =>{
    const number = inp.getAttribute('number') || '';
    const title = inp.getAttribute('title') || inp.textContent.trim();
    const opt = document.createElement('option');
    opt.value = number; // используем номер для обращения к API (стабильнее)
    opt.dataset.title = title;
    opt.textContent = `${number} — ${title}`;
    inputSelect.appendChild(opt);
  });
  if(inputs.length===0){ const opt = document.createElement('option'); opt.textContent = 'Inputs не найдены'; inputSelect.appendChild(opt); }
}

// Найти input, который является таблом: ищем type=GT и title содержит 'табло'
function findScoreboardInput(){
  const inputs = Array.from(vmixDoc.querySelectorAll('inputs > input'));
  // ищем GT input, в названии которого встречается 'табло' (без учёта регистра)
  let found = inputs.find(i => (i.getAttribute('type')||'').toLowerCase()==='gt' && ((i.getAttribute('title')||'').toLowerCase().includes('табло')));
  if(!found){ // если не нашли по названию — берём первый GT input
    found = inputs.find(i => (i.getAttribute('type')||'').toLowerCase()==='gt');
  }
  return found || null;
}

function detectScoreFields(target){
  // reset
  scoreboard = {
    inputNumber: target.getAttribute('number'),
    inputKey: target.getAttribute('key'),
    homeFieldName: null,
    awayFieldName: null,
    homeTeamNameField: null,
    awayTeamNameField: null,
    homeColorField: null,
    awayColorField: null,
    halfFieldName: null,
    homeFoulsField: null,
    awayFoulsField: null,
    timeFieldName: null,
    foulImages: {home:{}, away:{}}
  };
  const texts = Array.from(target.querySelectorAll('text'));
  // try to detect by name
  texts.forEach(t =>{
    const name = t.getAttribute('name') || '';
    const nLower = name.toLowerCase();
    if(nLower.includes('счет') && (nLower.includes('гост') || nLower.includes('гости') || nLower.includes('гость'))){ scoreboard.awayFieldName = name; }
    else if(nLower.includes('счет') && (nLower.includes('дом') || nLower.includes('дома') || nLower.includes('дом ' ) || nLower.includes('дом.' ) )){ scoreboard.homeFieldName = name; }
    else if(nLower.includes('команда') && (nLower.includes('гост') || nLower.includes('гости') || nLower.includes('гость'))){ scoreboard.awayTeamNameField = name; }
    else if(nLower.includes('команда') && (nLower.includes('дом') || nLower.includes('дома') || nLower.includes('дом '))){ scoreboard.homeTeamNameField = name; }
  });
  // fallback heuristics: if not found, try indices common in user's XML
  if(!scoreboard.awayFieldName){ const t = texts.find(x=>x.getAttribute('index')==='2'); if(t) scoreboard.awayFieldName = t.getAttribute('name') || null; }
  if(!scoreboard.homeFieldName){ const t = texts.find(x=>x.getAttribute('index')==='3'); if(t) scoreboard.homeFieldName = t.getAttribute('name') || null; }
  if(!scoreboard.homeTeamNameField){ const t = texts.find(x=>x.getAttribute('index')==='7' || x.getAttribute('index')==='3'); if(t) scoreboard.homeTeamNameField = t.getAttribute('name') || null; }
  if(!scoreboard.awayTeamNameField){ const t = texts.find(x=>x.getAttribute('index')==='6' || x.getAttribute('index')==='2'); if(t) scoreboard.awayTeamNameField = t.getAttribute('name') || null; }
  // fouls by name / index
  // try to detect fouls by name (preferred). Fallback to common indices used in templates.
  // Note: indexes changed in user's XML — time moved to index 0, fouls are now index 1 (away) and 2 (home).
  const foulHome = texts.find(x => (x.getAttribute('name')||'').toLowerCase().includes('фолы дом') || x.getAttribute('index')==='2');
  const foulAway = texts.find(x => (x.getAttribute('name')||'').toLowerCase().includes('фолы гост') || x.getAttribute('index')==='1');
  if(foulHome) scoreboard.homeFoulsField = foulHome.getAttribute('name');
  if(foulAway) scoreboard.awayFoulsField = foulAway.getAttribute('name');
  // time field
  const timeField = texts.find(x => (x.getAttribute('name')||'').toLowerCase().includes('время')) || texts.find(x=>x.getAttribute('index')==='0');
  if(timeField) scoreboard.timeFieldName = timeField.getAttribute('name');
  const halfField = texts.find(x => (x.getAttribute('name')||'').toLowerCase().includes('тайм')) || texts.find(x => x.getAttribute('index')==='5');
  if(halfField) scoreboard.halfFieldName = halfField.getAttribute('name');
  // collect foul images (images named like 'фол 1 ДОМ.Source')
  const images = Array.from(target.querySelectorAll('image'));
  images.forEach(img =>{
    const name = (img.getAttribute('name')||'').toLowerCase();
    const idx = img.getAttribute('index');
    if(name.includes('фол') && name.includes('дом')){
      // try to parse number after 'фол '
      const m = name.match(/фол\s*(\d+)/);
      if(m) scoreboard.foulImages.home[Number(m[1])] = idx;
    }
    if(name.includes('фол') && name.includes('гост')){
      const m = name.match(/фол\s*(\d+)/);
      if(m) scoreboard.foulImages.away[Number(m[1])] = idx;
    }
  });
  const colors = Array.from(target.querySelectorAll('color'));
  colors.forEach(colorEl =>{
    const name = (colorEl.getAttribute('name')||'').toLowerCase();
    if(name.includes('дом') && name.includes('цвет')){
      scoreboard.homeColorField = colorEl.getAttribute('name');
    }
    if(name.includes('гост') && name.includes('цвет')){
      scoreboard.awayColorField = colorEl.getAttribute('name');
    }
  });
}

function updateScoreboardUI(target){
  if(!target) return;
  const texts = Array.from(target.querySelectorAll('text'));
  const colors = Array.from(target.querySelectorAll('color'));
  function findByName(name){ return texts.find(t => (t.getAttribute('name')||'')===name); }
  function findColorByName(name){ return colors.find(c => (c.getAttribute('name')||'')===name); }
  // team names — update only the text span so the edit button is preserved
  if(scoreboard.homeTeamNameField && editingTeam !== 'home'){ const el = findByName(scoreboard.homeTeamNameField); if(el && homeNameTextEl) homeNameTextEl.textContent = el.textContent || homeNameTextEl.textContent; }
  if(scoreboard.awayTeamNameField && editingTeam !== 'away'){ const el = findByName(scoreboard.awayTeamNameField); if(el && awayNameTextEl) awayNameTextEl.textContent = el.textContent || awayNameTextEl.textContent; }
  // scores
  if(scoreboard.homeFieldName){ const el = findByName(scoreboard.homeFieldName); if(el) homeScoreEl.textContent = (el.textContent||'0'); }
  if(scoreboard.awayFieldName){ const el = findByName(scoreboard.awayFieldName); if(el) awayScoreEl.textContent = (el.textContent||'0'); }
  // fouls
  if(scoreboard.homeFoulsField){ const el = findByName(scoreboard.homeFoulsField); if(el){
      const raw = (el.textContent||'').trim();
      let uiNum = 0;
      if(raw === '') uiNum = 0;
      else if(/^[-]+$/.test(raw)) uiNum = raw.length; // '-' ->1, '--'->2
      else if(/^\d+$/.test(raw)) uiNum = Number(raw);
      else uiNum = 0;
      homeFoulsEl.textContent = String(uiNum);
    }
  }
  if(scoreboard.awayFoulsField){ const el = findByName(scoreboard.awayFoulsField); if(el){
      const raw = (el.textContent||'').trim();
      let uiNum = 0;
      if(raw === '') uiNum = 0;
      else if(/^[-]+$/.test(raw)) uiNum = raw.length;
      else if(/^\d+$/.test(raw)) uiNum = Number(raw);
      else uiNum = 0;
      awayFoulsEl.textContent = String(uiNum);
    }
  }
  // time — не перезаписываем локально запущенный таймер чтобы избежать мерцания
  if(!timerState.intervalId){
    if(scoreboard.timeFieldName){ const el = findByName(scoreboard.timeFieldName); if(el) matchTimerEl.textContent = (el.textContent||'00:00:00'); }
  }
  if(scoreboard.homeColorField){
    const colorEl = findColorByName(scoreboard.homeColorField);
    if(colorEl){
      const colorVal = (colorEl.textContent||'#000000').trim();
      previewTeamColor('home', colorVal);
      try{
        const srcInput = target.getAttribute('number');
        lastSeenColors[srcInput] = lastSeenColors[srcInput] || {};
        const seenKey = `${srcInput}::${scoreboard.homeColorField}`;
        if(lastSeenColors[srcInput][scoreboard.homeColorField] !== colorVal){
          lastSeenColors[srcInput][scoreboard.homeColorField] = colorVal;
          // Mirror only when change is on primary scoreboard input
          const primary = String(scoreboard.inputNumber);
          if(String(srcInput) === primary){
            const targetName = findColorFieldNameForInput(BIG_SCOREBOARD_INPUT_NUMBER, scoreboard.homeColorField);
            if(targetName){
              const sendKey = `${BIG_SCOREBOARD_INPUT_NUMBER}::${targetName}`;
              if(lastSentColor[sendKey] !== colorVal){
                setTimeout(()=>{
                  const parts = [`Function=SetColor`, `Input=${encodeURIComponent(BIG_SCOREBOARD_INPUT_NUMBER)}`, `SelectedName=${encodeURIComponent(targetName)}`, `Value=${encodeURIComponent(colorVal)}`];
                  sendCommandParts(parts).then(()=>{ lastSentColor[sendKey] = colorVal; }).catch(()=>{/* ignore */});
                }, 1000);
              }
            }
          }
        }
      }catch(e){ /* ignore mirror errors */ }
    }
  }
  if(scoreboard.awayColorField){
    const colorEl = findColorByName(scoreboard.awayColorField);
    if(colorEl){
      const colorVal = (colorEl.textContent||'#000000').trim();
      previewTeamColor('away', colorVal);
      try{
        const srcInput = target.getAttribute('number');
        lastSeenColors[srcInput] = lastSeenColors[srcInput] || {};
        const seenKey = `${srcInput}::${scoreboard.awayColorField}`;
        if(lastSeenColors[srcInput][scoreboard.awayColorField] !== colorVal){
          lastSeenColors[srcInput][scoreboard.awayColorField] = colorVal;
          const primary = String(scoreboard.inputNumber);
          if(String(srcInput) === primary){
            const targetName = findColorFieldNameForInput(BIG_SCOREBOARD_INPUT_NUMBER, scoreboard.awayColorField);
            if(targetName){
              const sendKey = `${BIG_SCOREBOARD_INPUT_NUMBER}::${targetName}`;
              if(lastSentColor[sendKey] !== colorVal){
                setTimeout(()=>{
                  const parts = [`Function=SetColor`, `Input=${encodeURIComponent(BIG_SCOREBOARD_INPUT_NUMBER)}`, `SelectedName=${encodeURIComponent(targetName)}`, `Value=${encodeURIComponent(colorVal)}`];
                  sendCommandParts(parts).then(()=>{ lastSentColor[sendKey] = colorVal; }).catch(()=>{/* ignore */});
                }, 1000);
              }
            }
          }
        }
      }catch(e){ /* ignore mirror errors */ }
    }
  }
  if(scoreboard.halfFieldName){ const el = findByName(scoreboard.halfFieldName); if(el) updateHalfSelectFromValue(el.textContent || '1Т'); }
}

async function sendFetch(url){
  try{
    const res = await fetch(url);
    const text = await res.text();
    if(!res.ok){
      // include response body for diagnostics
      const msg = res.status + ' ' + res.statusText + (text? ' - ' + text : '');
      log('Ошибка запроса: '+msg, true);
      throw new Error(msg);
    }
    return text;
  }catch(e){ /* ошибка запроса (лог отключён) */ throw e }
}

function sendCommandParts(parts){ const url = API_BASE + '?' + parts.join('&'); log('Отправка: '+url); return sendFetch(url); }

function findTextFieldNameForInput(inputNumber, selectedName){
  if(!vmixDoc || !inputNumber || !selectedName) return null;
  const normalized = String(selectedName).trim().toLowerCase();
  if(!normalized) return null;
  const inputEl = vmixDoc.querySelector(`inputs > input[number="${inputNumber}"]`);
  if(!inputEl) return null;
  const match = Array.from(inputEl.querySelectorAll('text')).find(t => {
    const name = t.getAttribute('name') || '';
    return name.trim().toLowerCase() === normalized;
  });
  return match ? (match.getAttribute('name') || null) : null;
}

function findColorFieldNameForInput(inputNumber, selectedName){
  if(!vmixDoc || !inputNumber || !selectedName) return null;
  const normalized = String(selectedName).trim().toLowerCase();
  if(!normalized) return null;
  const inputEl = vmixDoc.querySelector(`inputs > input[number="${inputNumber}"]`);
  if(!inputEl) return null;
  const match = Array.from(inputEl.querySelectorAll('color')).find(c => {
    const name = c.getAttribute('name') || '';
    return name.trim().toLowerCase() === normalized;
  });
  return match ? (match.getAttribute('name') || null) : null;
}

function mapHalfTextForBigScore(value){
  const normalized = (value || '').trim().toUpperCase();
  if(normalized === '1Т') return 'ПОСЛЕ ПЕРВОГО ТАЙМА';
  if(normalized === '2Т') return 'КОНЕЦ МАТЧА';
  return value;
}

function sendSetTextByName(inputNumber, selectedName, value){
  // Попытка SetText (лог отключён)
  if(!inputNumber || !selectedName) { /* не настроено поле табло — проверьте обнаружение полей */ return Promise.reject(new Error('отсутствуют параметры')); }
  // avoid sending identical values repeatedly — use cache key per input+SelectedName
  const cacheKey = `${inputNumber}::${selectedName}`;
  try{
    if(lastSentText[cacheKey] !== undefined && String(lastSentText[cacheKey]) === String(value)){
      // пропуск дубликата отправки
      return Promise.resolve('skipped-duplicate');
    }
  }catch(e){ /* ignore */ }
  const parts = [`Function=SetText`, `Input=${encodeURIComponent(inputNumber)}`, `SelectedName=${encodeURIComponent(selectedName)}`, `Value=${encodeURIComponent(value)}`];
  // Формируем URL для SetText (лог отключён)
  return sendCommandParts(parts).then(()=> {
    lastSentText[cacheKey] = value;
    log(`SetText ${selectedName}=${value} OK`);

    // Mirror certain fields from the main scoreboard to the big scoreboard input.
    try{
      const srcInput = String(inputNumber);
      const primaryScoreInput = (scoreboard && scoreboard.inputNumber) ? String(scoreboard.inputNumber) : '2';
      const normalizedSelected = (String(selectedName || '').trim()).toLowerCase();
      if(srcInput === primaryScoreInput && normalizedSelected){
        const roles = [
          scoreboard.homeFieldName,
          scoreboard.awayFieldName,
          scoreboard.homeTeamNameField,
          scoreboard.awayTeamNameField
        ];
        const normalizedRoles = roles.map(name => name ? name.trim().toLowerCase() : '').filter(Boolean);
        if(normalizedRoles.includes(normalizedSelected)){
          const targetName = findTextFieldNameForInput(BIG_SCOREBOARD_INPUT_NUMBER, selectedName);
          if(targetName){
            setTimeout(()=>{
              sendSetTextByName(BIG_SCOREBOARD_INPUT_NUMBER, targetName, value).catch(()=>{/* ignore */});
            }, 2000);
          }
        }
        const halfNameNorm = (scoreboard.halfFieldName || '').trim().toLowerCase();
        if(halfNameNorm && normalizedSelected === halfNameNorm){
          const targetName = findTextFieldNameForInput(BIG_SCOREBOARD_INPUT_NUMBER, scoreboard.halfFieldName);
          if(targetName){
            const mappedValue = mapHalfTextForBigScore(value);
            setTimeout(()=>{
              sendSetTextByName(BIG_SCOREBOARD_INPUT_NUMBER, targetName, mappedValue).catch(()=>{/* ignore */});
            }, 1000);
          }
        }
      }
    }catch(e){ /* ignore scheduling errors */ }

  }).catch((err)=>{ /* ошибка SetText (лог отключён) */ });
}

function sendSetImageVisibleByIndex(inputNumber, imageIndex, visible){
  if(!inputNumber || imageIndex===undefined || imageIndex===null) { return Promise.reject(new Error('отсутствуют параметры')); }
  const parts = [`Function=SetImageVisible`, `Input=${encodeURIComponent(inputNumber)}`, `Index=${encodeURIComponent(imageIndex)}`, `Value=${encodeURIComponent(visible? 'True':'False')}`];
  // Отправка SetImageVisible (лог отключён)
  return sendCommandParts(parts).then(()=> {/* ok */}).catch((err)=>{ /* ошибка SetImageVisible (лог отключён) */ });
}

function isHexColor(value){ return /^#([0-9A-F]{6})$/i.test(value || ''); }
function previewTeamColor(team, value){
  const colorValue = isHexColor(value) ? value.toUpperCase() : '#000000';
  pendingColors[team] = colorValue;
  const btn = team === 'home' ? homeColorBtn : awayColorBtn;
  const input = team === 'home' ? homeColorInput : awayColorInput;
  if(btn) btn.style.background = colorValue;
  if(input) input.value = colorValue;
}
function applyTeamColor(team){
  const colorValue = pendingColors[team];
  const fieldName = team === 'home' ? scoreboard.homeColorField : scoreboard.awayColorField;
  const inputNumber = scoreboard.inputNumber || scoreboard.inputKey;
  if(!colorValue || !isHexColor(colorValue) || !fieldName || !inputNumber){
    if(logEl) logEl.textContent = 'Нельзя применить цвет (недостаточно данных)';
    return;
  }
  const parts = [`Function=SetColor`, `Input=${encodeURIComponent(inputNumber)}`, `SelectedName=${encodeURIComponent(fieldName)}`, `Value=${encodeURIComponent(colorValue)}`];
  const cacheKey = `${inputNumber}::${fieldName}`;
  sendCommandParts(parts).then(()=>{
    lastSentColor[cacheKey] = colorValue;
    if(logEl) logEl.textContent = `${team === 'home' ? 'Дом' : 'Гости'}: цвет применён`;
    // Mirror to big scoreboard after short delay
    try{
      const targetName = findColorFieldNameForInput(BIG_SCOREBOARD_INPUT_NUMBER, fieldName);
      if(targetName){
        const targetKey = `${BIG_SCOREBOARD_INPUT_NUMBER}::${targetName}`;
        // avoid duplicate send
        if(lastSentColor[targetKey] !== colorValue){
          setTimeout(()=>{
            const mirrorParts = [`Function=SetColor`, `Input=${encodeURIComponent(BIG_SCOREBOARD_INPUT_NUMBER)}`, `SelectedName=${encodeURIComponent(targetName)}`, `Value=${encodeURIComponent(colorValue)}`];
            sendCommandParts(mirrorParts).then(()=>{ lastSentColor[targetKey] = colorValue; }).catch(()=>{/* ignore */});
          }, 1000);
        }
      }
    }catch(e){ /* ignore mirror errors */ }
  }).catch(()=>{
    if(logEl) logEl.textContent = 'Сбой при применении цвета';
  });
}
function normalizeHalfValue(value){
  if(!value) return '1Т';
  const cleaned = value.trim().toUpperCase().replace(/T/g, 'Т');
  if(/2/.test(cleaned)) return '2Т';
  return '1Т';
}
function updateHalfSelectFromValue(value){
  if(!halfSelect) return;
  const normalized = normalizeHalfValue(value);
  if(halfSelect.value === normalized) return;
  ignoreHalfSelectChange = true;
  halfSelect.value = normalized;
  setTimeout(()=>{ ignoreHalfSelectChange = false; }, 0);
}

// send timer-related vMix command: StartTimer / StopTimer / ResetTimer
function sendTimerCommand(cmd, inputNumber, index){
  if(!inputNumber || index===undefined || index===null){
    return Promise.reject(new Error('отсутствуют параметры'));
  }
  // try primary command, if vMix returns 500 try fallbacks commonly used for GT timers
  const fallbacks = {
    // include common variants and exact-casing variants (vMix is picky)
    'StartTimer': ['StartTimer','StartCountDown','StartCountdown','StartCountdown','PlayTimer','StartClock'],
    'StopTimer': ['StopTimer','StopCountDown','StopCountdown','PauseCountDown','PauseCountdown','StopClock'],
    'ResetTimer': ['ResetTimer','ResetCountDown','ResetCountdown']
  };
  // also include the originally requested cmd at the front
  const candidates = ((fallbacks[cmd]||[]).indexOf(cmd)===-1 ? [cmd].concat(fallbacks[cmd]||[]) : (fallbacks[cmd]||[]));

  // Try commands sequentially until one succeeds
  const tryOne = async (c) => {
    // Try three forms: Input+Value, Input only, Value only
    const attempts = [
      [`Function=${c}`, `Input=${encodeURIComponent(inputNumber)}`, `Value=${encodeURIComponent(index)}`],
      [`Function=${c}`, `Input=${encodeURIComponent(inputNumber)}`],
      [`Function=${c}`, `Value=${encodeURIComponent(index)}`]
    ];
    for(const parts of attempts){
      try{
        const res = await sendCommandParts(parts);
        return {ok:true, cmd:c, res, parts};
      }catch(err){
        // попытка не удалась — пробуем следующий вариант
      }
    }
    return {ok:false, cmd:c};
  };

  return (async ()=>{
    for(const c of candidates){
      const r = await tryOne(c);
      if(r.ok) return r;
    }
    // все варианты не прошли
    const last = candidates[candidates.length-1];
    throw new Error('не удалось выполнить команды таймера для input='+inputNumber+' index='+index+' (последняя попытка '+last+')');
  })();
}

// Helper tailored for GT countdown functions (as listed in Shortcut Function Reference)
// Uses exact function names: StartCountdown, PauseCountdown, StopCountdown, SetCountdown, AdjustCountdown
function sendCountdownCommand(fnName, inputNumber, value){
  if(!inputNumber){ return Promise.reject(new Error('отсутствует inputNumber')); }
  const parts = [`Function=${fnName}`, `Input=${encodeURIComponent(inputNumber)}`];
  if(value !== undefined && value !== null){ parts.push(`Value=${encodeURIComponent(value)}`); }
  // Отправка команды для таймера (лог отключён)
  return sendCommandParts(parts).then(res => { return res; }).catch(err => { throw err; });
}

// fouls handlers try to set text and show image if mapped
function changeHomeFouls(delta){
  const cur = Number(homeFoulsEl.textContent)||0;
  const next = Math.max(0, cur+delta);
  homeFoulsEl.textContent = String(next);
  // Represent fouls as dashes in the text field: 1 -> '-', 2 -> '--', 0 -> ''
  const textVal = next > 0 ? '-'.repeat(next) : '';
  if(scoreboard.homeFoulsField) sendSetTextByName(scoreboard.inputNumber, scoreboard.homeFoulsField, textVal);
}
function changeAwayFouls(delta){
  const cur = Number(awayFoulsEl.textContent)||0;
  const next = Math.max(0, cur+delta);
  awayFoulsEl.textContent = String(next);
  const textVal = next > 0 ? '-'.repeat(next) : '';
  if(scoreboard.awayFoulsField) sendSetTextByName(scoreboard.inputNumber, scoreboard.awayFoulsField, textVal);
}

// timer functions
function formatMMSS(s){ const mm = String(Math.floor(s/60)).padStart(2,'0'); const ss = String(s%60).padStart(2,'0'); return `${mm}:${ss}`; }
function formatHHMMSS(s){ const hh = String(Math.floor(s/3600)).padStart(2,'0'); const mm = String(Math.floor((s%3600)/60)).padStart(2,'0'); const ss = String(s%60).padStart(2,'0'); return `${hh}:${mm}:${ss}`; }
function startTimer(){
  if(timerState.intervalId) return;
  if(timerState.secondsRemaining <= 0) timerState.secondsRemaining = TIMER_DEFAULT_SECONDS;
  timerState.tickCounter = 0;
  // pause auto-poll while timer running to avoid UI overwrite and duplicate sends
  if(autoPollCheckbox && autoPollCheckbox.checked){
    autoPollPaused = true;
    clearInterval(pollTimer);
    pollTimer = null;
  }

  // disable manual refresh / toggling while timer is running to avoid accidental overwrite
  if(btnRefresh) btnRefresh.disabled = true;
  if(autoPollCheckbox) autoPollCheckbox.disabled = true;

  // If vMix GT Countdown is configured, tell vMix to start its internal countdown
  if(TIMER_INDEX && scoreboard.inputNumber){
    sendCountdownCommand('StartCountdown', scoreboard.inputNumber).catch(()=>{/* logged */});
    // local UI tick only — do not send SetText each second when using built-in vMix timer
    timerState.intervalId = setInterval(()=>{
      if(timerState.secondsRemaining <= 0){ stopTimer(); return; }
      timerState.secondsRemaining--;
      matchTimerEl.textContent = formatMMSS(timerState.secondsRemaining);
    }, 1000);
  } else {
    // fallback: update UI and PUSH SetText to vMix every `sendEvery` seconds
    timerState.intervalId = setInterval(()=>{
      if(timerState.secondsRemaining <= 0){ stopTimer(); return; }
      timerState.secondsRemaining--;
      timerState.tickCounter++;
      matchTimerEl.textContent = formatMMSS(timerState.secondsRemaining);
      if(scoreboard.timeFieldName && timerState.sendEvery > 0 && (timerState.tickCounter % timerState.sendEvery === 0)){
        sendSetTextByName(scoreboard.inputNumber, scoreboard.timeFieldName, matchTimerEl.textContent);
      }
    }, 1000);
  }
  log('Таймер запущен');
}
function stopTimer(){
  if(timerState.intervalId){
    clearInterval(timerState.intervalId);
    timerState.intervalId = null;
    log('Таймер остановлен');
    // if using vMix GT Countdown, send PauseCountdown (toggle pause/resume). If not available, fall back to sending SetText
    if(TIMER_INDEX && scoreboard.inputNumber){
      sendCountdownCommand('PauseCountdown', scoreboard.inputNumber).catch(()=>{/* logged */});
    } else if(scoreboard.timeFieldName){
      sendSetTextByName(scoreboard.inputNumber, scoreboard.timeFieldName, matchTimerEl.textContent);
    }
    // restore auto-poll if it was paused
    if(autoPollPaused){ autoPollPaused = false; if(autoPollCheckbox) { autoPollCheckbox.checked = true; pollTimer = setInterval(refreshAll, 3000); } }
    // re-enable manual controls
    if(btnRefresh) btnRefresh.disabled = false;
    if(autoPollCheckbox) autoPollCheckbox.disabled = false;
  }
}
function resetTimer(){
  timerState.secondsRemaining = TIMER_DEFAULT_SECONDS;
  matchTimerEl.textContent = formatMMSS(timerState.secondsRemaining);
  if(TIMER_INDEX && scoreboard.inputNumber){
    // set countdown to default value and stop (StopCountdown also resets in vMix)
    const hhmmss = formatHHMMSS(timerState.secondsRemaining);
    // First set desired time, then ensure stopped/reset
    sendCountdownCommand('SetCountdown', scoreboard.inputNumber, hhmmss).catch(()=>{/* logged */});
    sendCountdownCommand('StopCountdown', scoreboard.inputNumber).catch(()=>{/* logged */});
  } else if(scoreboard.timeFieldName){
    sendSetTextByName(scoreboard.inputNumber, scoreboard.timeFieldName, matchTimerEl.textContent);
  }
  log('Таймер сброшен');
}

function resetScoreAndFouls(){ homeScoreEl.textContent = '0'; awayScoreEl.textContent = '0'; homeFoulsEl.textContent='0'; awayFoulsEl.textContent='0';
  if(scoreboard.homeFieldName) sendSetTextByName(scoreboard.inputNumber, scoreboard.homeFieldName, '0');
  if(scoreboard.awayFieldName) sendSetTextByName(scoreboard.inputNumber, scoreboard.awayFieldName, '0');
  // For fouls we send an empty string to vMix (no text) because fouls are represented as dashes '-','--' etc.
  if(scoreboard.homeFoulsField) sendSetTextByName(scoreboard.inputNumber, scoreboard.homeFoulsField, '');
  if(scoreboard.awayFoulsField) sendSetTextByName(scoreboard.inputNumber, scoreboard.awayFoulsField, '');
  log('Счёт и фолы сброшены');
}

// Attach score buttons
function attachScoreButtons(){
  homePlus.addEventListener('click', ()=> changeHomeScore(1));
  homeMinus.addEventListener('click', ()=> changeHomeScore(-1));
  awayPlus.addEventListener('click', ()=> changeAwayScore(1));
  awayMinus.addEventListener('click', ()=> changeAwayScore(-1));
  // fouls
  if(homeFoulPlus) homeFoulPlus.addEventListener('click', ()=> changeHomeFouls(1));
  if(homeFoulMinus) homeFoulMinus.addEventListener('click', ()=> changeHomeFouls(-1));
  if(awayFoulPlus) awayFoulPlus.addEventListener('click', ()=> changeAwayFouls(1));
  if(awayFoulMinus) awayFoulMinus.addEventListener('click', ()=> changeAwayFouls(-1));
  // timer
  if(timerStartBtn) timerStartBtn.addEventListener('click', ()=> startTimer());
  if(timerStopBtn) timerStopBtn.addEventListener('click', ()=> stopTimer());
  if(timerResetBtn) timerResetBtn.addEventListener('click', ()=> resetTimer());
  if(resetScoreBtn) resetScoreBtn.addEventListener('click', ()=> resetScoreAndFouls());
}

// Создаёт inline-редактор для названия команды
function createNameEditor(team){
  // team: 'home' or 'away'
  const container = team === 'home' ? homeNameEl : awayNameEl;
  const textSpan = team === 'home' ? homeNameTextEl : awayNameTextEl;
  const fieldName = team === 'home' ? scoreboard.homeTeamNameField : scoreboard.awayTeamNameField;
  if(editingTeam) return; // уже редактируется
  editingTeam = team;

  const current = (textSpan && textSpan.textContent) ? textSpan.textContent : '';
  // сохраняем и временно удаляем кнопку редактирования (если была), затем заменим span
  const editBtnEl = container.querySelector('.edit-btn');
  if(editBtnEl) editBtnEl.remove();
  if(textSpan) textSpan.remove();

  const input = document.createElement('input');
  input.type = 'text';
  input.value = current;
  input.className = 'team-edit-input';
  input.style.minWidth = '120px';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn';
  saveBtn.textContent = 'Save';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = 'Cancel';
  container.appendChild(input);
  container.appendChild(saveBtn);
  container.appendChild(cancelBtn);

  input.focus();
  input.select();

  const finish = (apply)=>{
    const newVal = input.value.trim();
    // restore span + edit button
    const newSpan = document.createElement('span');
    newSpan.className = 'team-name-text';
    newSpan.id = team === 'home' ? 'homeNameText' : 'awayNameText';
    newSpan.textContent = newVal || current || '';
    // remove input & buttons
    input.remove(); saveBtn.remove(); cancelBtn.remove();
    container.appendChild(newSpan);
    if(editBtnEl) container.appendChild(editBtnEl);
    // update references so future edits use the fresh span element
    if(team === 'home') homeNameTextEl = document.getElementById('homeNameText');
    else awayNameTextEl = document.getElementById('awayNameText');
    editingTeam = null;
    if(apply && fieldName){
      // отправляем SetText в vMix для соответствующего поля
      sendSetTextByName(scoreboard.inputNumber, fieldName, newVal).catch(()=>{/* ignore */});
    }
  };

  saveBtn.addEventListener('click', ()=> finish(true));
  cancelBtn.addEventListener('click', ()=> finish(false));
  input.addEventListener('keydown', (ev)=>{
    if(ev.key === 'Enter') { finish(true); }
    else if(ev.key === 'Escape') { finish(false); }
  });
}

function attachNameEditButtons(){
  if(homeEditBtn) homeEditBtn.addEventListener('click', (e)=>{ e.preventDefault(); createNameEditor('home'); });
  if(awayEditBtn) awayEditBtn.addEventListener('click', (e)=>{ e.preventDefault(); createNameEditor('away'); });
}

function attachColorControls(){
  if(homeColorBtn && homeColorInput){
    homeColorBtn.addEventListener('click', ()=> homeColorInput.click());
    homeColorInput.addEventListener('input', ()=> previewTeamColor('home', homeColorInput.value));
  }
  if(awayColorBtn && awayColorInput){
    awayColorBtn.addEventListener('click', ()=> awayColorInput.click());
    awayColorInput.addEventListener('input', ()=> previewTeamColor('away', awayColorInput.value));
  }
  if(homeColorApply) homeColorApply.addEventListener('click', ()=> applyTeamColor('home'));
  if(awayColorApply) awayColorApply.addEventListener('click', ()=> applyTeamColor('away'));
}

function attachHalfSelect(){
  if(!halfSelect) return;
  halfSelect.addEventListener('change', ()=>{
    if(ignoreHalfSelectChange) return;
    const normalized = normalizeHalfValue(halfSelect.value);
    halfSelect.value = normalized;
    if(scoreboard.halfFieldName && scoreboard.inputNumber){
      sendSetTextByName(scoreboard.inputNumber, scoreboard.halfFieldName, normalized).catch(()=>{/* ignore */});
    }
  });
}

function triggerReplayMark(){
  const parts = [`Function=ReplayMarkInOutLive`, `Value=9`, `Input=${encodeURIComponent(REPLAY_INPUT_NUMBER)}`];
  return sendCommandParts(parts).then(()=>{
    if(logEl) logEl.textContent = 'Replay: отметка добавлена';
  }).catch(()=>{
    if(logEl) logEl.textContent = 'Не удалось пометить повторы';
  });
}

function toggleReplayRecording(){
  if(!recBtn) return;
  recBtn.disabled = true;
  sendCommandParts([`Function=ReplayStartStopRecording`]).then(()=>{
    replayRecordingActive = !replayRecordingActive;
    recBtn.classList.toggle('rec-active', replayRecordingActive);
    if(logEl) logEl.textContent = `REC: запись ${replayRecordingActive ? 'запущена' : 'остановлена'}`;
  }).catch(()=>{
    if(logEl) logEl.textContent = 'REC: не удалось переключить запись';
  }).finally(()=>{
    recBtn.disabled = false;
  });
}

function triggerVarMoment(){
  const markParts = [`Function=ReplayMarkInOutLive`, `Value=10`, `Input=${encodeURIComponent(REPLAY_INPUT_NUMBER)}`];
  sendCommandParts(markParts).then(()=>{
    if(logEl) logEl.textContent = 'VAR: сохранён 10-секундный момент';
    setTimeout(()=>{
      const moveParts = [`Function=ReplayMoveLastEvent`, `Value=4`];
      sendCommandParts(moveParts).then(()=>{
        if(logEl) logEl.textContent = 'VAR: момент перемещён в лист 4';
      }).catch(()=>{
        if(logEl) logEl.textContent = 'VAR: не удалось переместить момент в лист 4';
      });
    }, 1000);
  }).catch(()=>{
    if(logEl) logEl.textContent = 'VAR: не удалось сохранить момент';
  });
}


function triggerGoalMoment(){
  // Отправляем пометку повтора (как для кнопки Отметить)
  const markParts = [`Function=ReplayMarkInOutLive`, `Value=9`, `Input=${encodeURIComponent(REPLAY_INPUT_NUMBER)}`];
  sendCommandParts(markParts).then(()=>{
    if(logEl) logEl.textContent = 'Replay A отметка добавлена';
  }).catch(()=>{
    if(logEl) logEl.textContent = 'Гол: не удалось пометить повторы';
  });

  // Через 2 секунды проигрываем последний евент на выход (существующая логика)
  setTimeout(()=>{
    const parts = [`Function=ReplayPlayLastEventToOutput`, `Channel=${encodeURIComponent(REPLAY_CHANNEL)}`];
    sendCommandParts(parts).then(()=>{
      if(logEl) logEl.textContent = 'Гол: момент проигрывается';
    }).catch(()=>{
      if(logEl) logEl.textContent = 'Гол: проигрывание не удалось';
    });
  }, 2000);
}

async function playBetweenHalvesReplays(){
  if(!betweenHalvesBtn) return;
  betweenHalvesBtn.disabled = true;
  const channelParam = `Channel=${encodeURIComponent(REPLAY_CHANNEL)}`;
  try{
    if(logEl) logEl.textContent = 'ПОВТОРЫ МЕЖДУ ТАЙМАМИ: активируем лист 1';
    await sendCommandParts([`Function=ReplaySelectEvents1`, channelParam]);
    await sendCommandParts([`Function=ReplayPlayAllEventsToOutput`, channelParam]);
    if(logEl) logEl.textContent = 'ПОВТОРЫ МЕЖДУ ТАЙМАМИ: лист 1 проигрывается полностью';
    setTimeout(()=>{
      sendCommandParts([`Function=LoopOn`, `Input=${encodeURIComponent(REPLAY_INPUT_NUMBER)}`]).then(()=>{
        if(logEl) logEl.textContent = 'ПОВТОРЫ МЕЖДУ ТАЙМАМИ: loop Input 8 включён';
      }).catch(()=>{
        if(logEl) logEl.textContent = 'ПОВТОРЫ МЕЖДУ ТАЙМАМИ: не удалось включить loop для Input 8';
      });
      sendCommandParts([`Function=AudioOn`, `Input=${encodeURIComponent(REPLAY_INPUT_NUMBER)}`]).then(()=>{
        if(logEl) logEl.textContent = 'ПОВТОРЫ МЕЖДУ ТАЙМАМИ: звук Input 8 включён';
      }).catch(()=>{
        if(logEl) logEl.textContent = 'ПОВТОРЫ МЕЖДУ ТАЙМАМИ: не удалось включить звук на Input 8';
      });
    }, 1000);
    setTimeout(()=>{
      setOverlay4Input(LOWER_TAB_INPUT_NUMBER).then(ok=>{
        if(ok){
          lowerTabVisible = true;
          if(lowerTabBtn) lowerTabBtn.classList.add('active');
          penaltyVisible = false; if(penaltyBtn) penaltyBtn.classList.remove('active');
          bigTabVisible = false; if(bigTabBtn) bigTabBtn.classList.remove('active');
          if(logEl) logEl.textContent = 'ПОВТОРЫ: overlay4 показан input 5';
        } else {
          if(logEl) logEl.textContent = 'ПОВТОРЫ: не удалось показать overlay4 input 5';
        }
      });
    }, 2000);
  }catch(err){
    if(logEl) logEl.textContent = 'ПОВТОРЫ МЕЖДУ ТАЙМАМИ: не удалось запустить лист 3';
  }finally{
    betweenHalvesBtn.disabled = false;
  }
}

function attachReplayControls(){
  if(replayMarkBtn) replayMarkBtn.addEventListener('click', ()=> triggerReplayMark());
  if(goalMomentBtn) goalMomentBtn.addEventListener('click', ()=> triggerGoalMoment());
  if(varBtn) varBtn.addEventListener('click', ()=> triggerVarMoment());
  if(recBtn) recBtn.addEventListener('click', ()=> toggleReplayRecording());
}

// Очистить все события в листе 1 (select list 1 -> select all -> delete selected)
async function deleteSelectedEventsLoop(channel){
  let deletedCount = 0;
  let lastError = null;
  for(let i = 0; i < REPLAY_DELETE_LOOP_LIMIT; i++){
    try{
      await sendCommandParts([`Function=ReplayDeleteSelectedEvent`, `Channel=${encodeURIComponent(channel)}`]);
      deletedCount++;
    }catch(err){
      lastError = err;
      break;
    }
  }
  return {deletedCount, lastError};
}

async function clearAllEventsList1(){
  if(!clearEventsBtn) return;
  clearEventsBtn.disabled = true;
  try{
    if(logEl) logEl.textContent = 'Удаление: выбираем лист 1';
    await sendCommandParts([`Function=ReplaySelectEvents1`, `Channel=${encodeURIComponent(REPLAY_CHANNEL)}`]);
    await sendCommandParts([`Function=ReplaySelectAllEvents`]);
    const {deletedCount, lastError} = await deleteSelectedEventsLoop(REPLAY_CHANNEL);
    if(lastError && deletedCount === 0) throw lastError;
    if(logEl){
      if(deletedCount > 0) logEl.textContent = `Удаление: ${deletedCount} событий в листе 1 удалено`;
      else logEl.textContent = 'Удаление: лист 1 пуст или событий нет';
    }
  }catch(e){
    if(logEl) logEl.textContent = 'Удаление: ошибка при очистке листа 1';
  }finally{
    clearEventsBtn.disabled = false;
  }
}

function attachAfterMatchControls(){
  if(betweenHalvesBtn) betweenHalvesBtn.addEventListener('click', ()=> playBetweenHalvesReplays());
  if(clearEventsBtn) clearEventsBtn.addEventListener('click', ()=>{
    try{
      if(confirm && !confirm('Удалить все события в листе 1?')) return;
    }catch(e){ /* ignore if confirm unavailable */ }
    clearAllEventsList1();
  });
}

function changeHomeScore(delta){
  const cur = Number(homeScoreEl.textContent)||0; const next = Math.max(0, cur+delta); homeScoreEl.textContent = String(next);
  return sendSetTextByName(scoreboard.inputNumber, scoreboard.homeFieldName, String(next)).catch(()=>{/* already logged */});
}
function changeAwayScore(delta){
  const cur = Number(awayScoreEl.textContent)||0; const next = Math.max(0, cur+delta); awayScoreEl.textContent = String(next);
  return sendSetTextByName(scoreboard.inputNumber, scoreboard.awayFieldName, String(next)).catch(()=>{/* already logged */});
}

// Keep previous generic actions working (Play/Pause/Stop/Cut/Fade)
function sendGeneric(fn, inputNumber){ const parts = [`Function=${fn}`]; if(inputNumber) parts.push(`Input=${encodeURIComponent(inputNumber)}`); return sendCommandParts(parts); }

function attachActionButtons(){
  const playEl = document.getElementById('playBtn');
  if(playEl) playEl.addEventListener('click', ()=> sendGeneric('Play', inputSelect.value).then(()=>log('Play отправлен')));
  const pauseEl = document.getElementById('pauseBtn');
  if(pauseEl) pauseEl.addEventListener('click', ()=> sendGeneric('Pause', inputSelect.value).then(()=>log('Pause отправлен')));
  const stopEl = document.getElementById('stopBtn');
  if(stopEl) stopEl.addEventListener('click', ()=> sendGeneric('Stop', inputSelect.value).then(()=>log('Stop отправлен')));
  const cutEl = document.getElementById('cutBtn');
  if(cutEl) cutEl.addEventListener('click', ()=> sendGeneric('Cut').then(()=>log('Cut')));
  const fadeEl = document.getElementById('fadeBtn');
  if(fadeEl) fadeEl.addEventListener('click', ()=> sendGeneric('Fade').then(()=>log('Fade')));
}

// Use the exact shortcut you provided: OverlayInput4
// This endpoint toggles overlay #4 when called with Input=<N> (N = input number or 0 to clear)
async function setOverlay4Input(inputNumber){
  try{
    // Use the exact function name as provided by the user
    await sendCommandParts([`Function=OverlayInput4`, `Input=${encodeURIComponent(inputNumber)}`]);
    return true;
  }catch(e){
    return false;
  }
}

// Generic overlay N toggle via Function=OverlayInputN
async function setOverlayNInput(overlayIndex, inputNumber){
  try{
    const fn = `OverlayInput${overlayIndex}`;
    await sendCommandParts([`Function=${fn}`, `Input=${encodeURIComponent(inputNumber)}`]);
    return true;
  }catch(e){
    return false;
  }
}

async function toggleLowerTab(){
  // toggle overlay4 for input 5 using the exact API: Function=OverlayInput4&Input=...
  if(!lowerTabVisible){
    const ok = await setOverlay4Input(LOWER_TAB_INPUT_NUMBER);
    if(ok){
      lowerTabVisible = true;
      if(lowerTabBtn) lowerTabBtn.classList.add('active');
      // ensure other overlay buttons are not marked active
      penaltyVisible = false; if(penaltyBtn) penaltyBtn.classList.remove('active');
      bigTabVisible = false; if(bigTabBtn) bigTabBtn.classList.remove('active');
      if(logEl) logEl.textContent = 'НИЖТАБ: показан (overlay4 -> input ' + LOWER_TAB_INPUT_NUMBER + ')';
    } else {
      if(logEl) logEl.textContent = 'НИЖТАБ: не удалось показать (попробуйте вручную команду в браузере)';
    }
  } else {
    // use same API (toggle) to hide as well — call with same input number
    const ok = await setOverlay4Input(LOWER_TAB_INPUT_NUMBER);
    if(ok){
      lowerTabVisible = false;
      if(lowerTabBtn) lowerTabBtn.classList.remove('active');
      // clearing overlay -> ensure all related flags cleared
      penaltyVisible = false; if(penaltyBtn) penaltyBtn.classList.remove('active');
      bigTabVisible = false; if(bigTabBtn) bigTabBtn.classList.remove('active');
      if(logEl) logEl.textContent = 'НИЖТАБ: скрыт (overlay4 toggled with input ' + LOWER_TAB_INPUT_NUMBER + ')';
    } else {
      if(logEl) logEl.textContent = 'НИЖТАБ: не удалось скрыть (попробуйте вручную команду в браузере)';
    }
  }
}

function attachLowerTabButton(){ if(lowerTabBtn) lowerTabBtn.addEventListener('click', ()=> toggleLowerTab()); }

async function togglePenalty(){
  // toggle overlay4 for input 6 (ПЕНАЛЬТИ)
  if(!penaltyVisible){
    const ok = await setOverlay4Input(PENALTY_INPUT_NUMBER);
    if(ok){
      penaltyVisible = true;
      if(penaltyBtn) penaltyBtn.classList.add('active');
      // ensure other overlay buttons are not marked active
      lowerTabVisible = false; if(lowerTabBtn) lowerTabBtn.classList.remove('active');
      bigTabVisible = false; if(bigTabBtn) bigTabBtn.classList.remove('active');
      if(logEl) logEl.textContent = 'ПЕНАЛЬТИ: показан (overlay4 -> input ' + PENALTY_INPUT_NUMBER + ')';
    } else {
      if(logEl) logEl.textContent = 'ПЕНАЛЬТИ: не удалось показать (попробуйте вручную команду)';
    }
  } else {
    const ok = await setOverlay4Input(PENALTY_INPUT_NUMBER);
    if(ok){
      penaltyVisible = false;
      if(penaltyBtn) penaltyBtn.classList.remove('active');
      // clearing overlay -> ensure all related flags cleared
      lowerTabVisible = false; if(lowerTabBtn) lowerTabBtn.classList.remove('active');
      bigTabVisible = false; if(bigTabBtn) bigTabBtn.classList.remove('active');
      if(logEl) logEl.textContent = 'ПЕНАЛЬТИ: скрыт (overlay4 toggled with input ' + PENALTY_INPUT_NUMBER + ')';
    } else {
      if(logEl) logEl.textContent = 'ПЕНАЛЬТИ: не удалось скрыть (попробуйте вручную команду)';
    }
  }
}

function attachPenaltyButton(){ if(penaltyBtn) penaltyBtn.addEventListener('click', ()=> togglePenalty()); }

async function toggleBigTab(){
  // toggle overlay4 for input 7 (БОЛТАБ)
  if(!bigTabVisible){
    const ok = await setOverlay4Input(BIGTAB_INPUT_NUMBER);
    if(ok){
      bigTabVisible = true;
      if(bigTabBtn) bigTabBtn.classList.add('active');
      // ensure other overlay buttons are not marked active
      lowerTabVisible = false; if(lowerTabBtn) lowerTabBtn.classList.remove('active');
      penaltyVisible = false; if(penaltyBtn) penaltyBtn.classList.remove('active');
      if(logEl) logEl.textContent = 'БОЛТАБ: показан (overlay4 -> input ' + BIGTAB_INPUT_NUMBER + ')';
    } else {
      if(logEl) logEl.textContent = 'БОЛТАБ: не удалось показать (попробуйте вручную команду)';
    }
  } else {
    const ok = await setOverlay4Input(BIGTAB_INPUT_NUMBER);
    if(ok){
      bigTabVisible = false;
      if(bigTabBtn) bigTabBtn.classList.remove('active');
      // clearing overlay -> ensure all related flags cleared
      lowerTabVisible = false; if(lowerTabBtn) lowerTabBtn.classList.remove('active');
      penaltyVisible = false; if(penaltyBtn) penaltyBtn.classList.remove('active');
      if(logEl) logEl.textContent = 'БОЛТАБ: скрыт (overlay4 toggled with input ' + BIGTAB_INPUT_NUMBER + ')';
    } else {
      if(logEl) logEl.textContent = 'БОЛТАБ: не удалось скрыть (попробуйте вручную команду)';
    }
  }
}

function attachBigTabButton(){ if(bigTabBtn) bigTabBtn.addEventListener('click', ()=> toggleBigTab()); }

async function toggleCenterTab(){
  // toggle overlay2 for input 2 (ТАБЛО на 2 overlay)
  if(!centerTabVisible){
    const ok = await setOverlayNInput(2, CENTER_TAB_INPUT_NUMBER);
    if(ok){
      centerTabVisible = true;
      if(centerTabBtn) centerTabBtn.classList.add('active');
      // turn off others
      lowerTabVisible = false; if(lowerTabBtn) lowerTabBtn.classList.remove('active');
      penaltyVisible = false; if(penaltyBtn) penaltyBtn.classList.remove('active');
      bigTabVisible = false; if(bigTabBtn) bigTabBtn.classList.remove('active');
      if(logEl) logEl.textContent = 'ТАБЛО: показан (overlay2 -> input ' + CENTER_TAB_INPUT_NUMBER + ')';
    } else {
      if(logEl) logEl.textContent = 'ТАБЛО: не удалось показать (попробуйте вручную команду)';
    }
  } else {
    const ok = await setOverlayNInput(2, CENTER_TAB_INPUT_NUMBER);
    if(ok){
      centerTabVisible = false;
      if(centerTabBtn) centerTabBtn.classList.remove('active');
      if(logEl) logEl.textContent = 'ТАБЛО: скрыт (overlay2 toggled with input ' + CENTER_TAB_INPUT_NUMBER + ')';
    } else {
      if(logEl) logEl.textContent = 'ТАБЛО: не удалось скрыть (попробуйте вручную команду)';
    }
  }
}

function attachCenterTabButton(){ if(centerTabBtn) centerTabBtn.addEventListener('click', ()=> toggleCenterTab()); }

function attachMainButton(){
  if(!mainBtn) return;
  mainBtn.addEventListener('click', async ()=>{
    // Отправляем Fade для Input=1 (главный источник)
    try{
      mainBtn.disabled = true;
      await sendGeneric('Fade', '1');
      if(logEl) logEl.textContent = 'ГЛАВНАЯ: отправлен Fade для input 1';
    }catch(e){
      if(logEl) logEl.textContent = 'ГЛАВНАЯ: не удалось отправить команду';
    }finally{
      setTimeout(()=>{ if(mainBtn) mainBtn.disabled = false; }, 300);
      setTimeout(()=>{
        sendCommandParts([`Function=LoopOff`, `Input=${encodeURIComponent(REPLAY_INPUT_NUMBER)}`]).then(()=>{
          if(logEl) logEl.textContent = 'ГЛАВНАЯ: loop Input 8 выключен';
        }).catch(()=>{
          if(logEl) logEl.textContent = 'ГЛАВНАЯ: не удалось выключить loop у Input 8';
        });
        sendCommandParts([`Function=ReplaySelectEvents1`, `Channel=${encodeURIComponent(REPLAY_CHANNEL)}`]).then(()=>{
          if(logEl) logEl.textContent = 'ГЛАВНАЯ: выбран лист событий 1';
        }).catch(()=>{
          if(logEl) logEl.textContent = 'ГЛАВНАЯ: не удалось выбрать лист событий 1';
        });
        sendCommandParts([`Function=AudioOff`, `Input=${encodeURIComponent(REPLAY_INPUT_NUMBER)}`]).then(()=>{
          if(logEl) logEl.textContent = 'ГЛАВНАЯ: звук Input 8 выключен';
        }).catch(()=>{
          if(logEl) logEl.textContent = 'ГЛАВНАЯ: не удалось выключить звук у Input 8';
        });
      }, 1000);
    }
  });
}

async function refreshAll(){
  try{
    await fetchXml();
    populateInputs();
    updateStreamingIndicatorFromXml();
    // find scoreboard input
    const target = findScoreboardInput();
    if(target){
      detectScoreFields(target);
      updateScoreboardUI(target);
        // if detection failed for main fields, apply safe defaults based on common names in your XML
        if(!scoreboard.homeFieldName) scoreboard.homeFieldName = scoreboard.homeFieldName || 'Счет дом.Text';
        if(!scoreboard.awayFieldName) scoreboard.awayFieldName = scoreboard.awayFieldName || 'Счет Гости.Text';
        if(!scoreboard.homeFoulsField) scoreboard.homeFoulsField = scoreboard.homeFoulsField || 'Фолы дом.Text';
        if(!scoreboard.awayFoulsField) scoreboard.awayFoulsField = scoreboard.awayFoulsField || 'Фолы Гости.Text';
        if(!scoreboard.timeFieldName) scoreboard.timeFieldName = scoreboard.timeFieldName || 'Время.Text';
        if(!scoreboard.homeColorField) scoreboard.homeColorField = scoreboard.homeColorField || 'Цвет Дом.Fill.Color';
        if(!scoreboard.awayColorField) scoreboard.awayColorField = scoreboard.awayColorField || 'Цвет Гости.Fill.Color';
        if(!scoreboard.halfFieldName) scoreboard.halfFieldName = scoreboard.halfFieldName || 'ТАЙМ.Text';
        if(!scoreboard.inputKey) scoreboard.inputKey = target.getAttribute('key');
      // select input in dropdown
      const number = target.getAttribute('number');
      if(number){ inputSelect.value = number; }
      log('Табло обнаружено: Input #' + scoreboard.inputNumber);
    } else {
      log('Табло не найдено — откройте XML и убедитесь, что есть GT input', true);
    }
  }catch(e){ /* ошибки уже залогированы */ }
}

// events
inputSelect.addEventListener('change', ()=>{});
btnRefresh.addEventListener('click', ()=> refreshAll());
autoPollCheckbox.addEventListener('change', ()=>{
  if(autoPollCheckbox.checked){ pollTimer = setInterval(refreshAll, 3000); log('Автообновление включено'); }
  else { clearInterval(pollTimer); pollTimer = null; log('Автообновление выключено'); }
});

// init
attachActionButtons();
attachScoreButtons();
attachNameEditButtons();
attachColorControls();
attachHalfSelect();
attachLowerTabButton();
attachPenaltyButton();
attachBigTabButton();
attachCenterTabButton();
attachMainButton();
attachReplayControls();
attachStreamingControls();
attachAfterMatchControls();
loadStreamingKeyFromStorage();
setStreamingIndicator(false);
refreshAll();

// Mobile menu toggle
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const topHeader = document.querySelector('.top');

if (mobileMenuToggle && topHeader) {
  mobileMenuToggle.addEventListener('click', () => {
    topHeader.classList.toggle('visible');
    const iconUse = mobileMenuToggle.querySelector('use');
    if (topHeader.classList.contains('visible')) {
      iconUse.setAttribute('href', '#icon-close');
    } else {
      iconUse.setAttribute('href', '#icon-menu');
    }
  });
}

// --- Перемещение отдельных кнопок повтора в панель действий при альбомной ориентации мобильного устройства ---
const movedContainer = document.getElementById('movedReplayActions');
let _moveState = {moved: false, backups: []};

function moveReplayButtonsToPanel(){
  if(!movedContainer) return;
  if(_moveState.moved) return;
  // Найдём все кнопки внутри replay-actions блоков
  const btns = Array.from(document.querySelectorAll('.replay-block .replay-actions > .btn, .after-match-block .replay-actions > .btn'));
  if(btns.length === 0) return;
  btns.forEach(btn => {
    // Save original parent & nextSibling for restore
    _moveState.backups.push({el: btn, parent: btn.parentNode, next: btn.nextSibling});
    // Move the button node into destination container
    movedContainer.appendChild(btn);
    // mark as moved for styling if needed
    btn.classList.add('moved-to-panel');
  });
  // Show container
  movedContainer.setAttribute('aria-hidden', 'false');
  _moveState.moved = true;
}

function restoreReplayButtons(){
  if(!_moveState.moved) return;
  // Restore buttons to their original parents in original order
  _moveState.backups.forEach(b => {
    try{
      if(b.parent){
        b.parent.insertBefore(b.el, b.next || null);
        b.el.classList.remove('moved-to-panel');
      }
    }catch(e){ /* ignore */ }
  });
  // clear backup list
  _moveState.backups = [];
  if(movedContainer) movedContainer.setAttribute('aria-hidden', 'true');
  _moveState.moved = false;
}

// Detect phone-like landscape by checking window dimensions (more reliable on devices)
function isPhoneLandscape(){
  try{
    const w = window.innerWidth || document.documentElement.clientWidth;
    const h = window.innerHeight || document.documentElement.clientHeight;
    // landscape when width > height and height is small (phone height in landscape)
    return (w > h) && (h <= 560); // 560px covers many phones in landscape
  }catch(e){ return false; }
}

function _onOrientationOrResize(){
  if(isPhoneLandscape()) moveReplayButtonsToPanel();
  else restoreReplayButtons();
}

window.addEventListener('resize', _onOrientationOrResize);
window.addEventListener('orientationchange', _onOrientationOrResize);
// Run initial check on load
setTimeout(_onOrientationOrResize, 50);
