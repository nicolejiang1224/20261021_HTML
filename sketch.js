const ROSTER_STORAGE_KEY = 'classroom-lottery-roster';
const SPIN_DURATION = 2000;
const MAX_ROSTER_SIZE = 10000;

let app;
let modeTabs;
let numberPanel;
let namePanel;
let numberStartInput;
let numberEndInput;
let rosterInput;
let excludeInput;
let drawCountInput;
let noRepeatInput;
let remainingLabel;
let resultDisplay;
let resultHint;
let errorMessage;
let historyList;
let drawButton;
let statusMessage;

let pickedValues = new Set();
let historyEntries = [];
let spinState = null;
let confetti = [];
let audioContext;
let audioUnsupported = false;

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.position(0, 0);
  canvas.addClass('confetti-canvas');

  app = createDiv('');
  app.addClass('app-shell');
  app.html(`
    <header class="topbar">
      <div class="brand-mark" aria-hidden="true">✦</div>
      <div>
        <p class="eyebrow">CLASSROOM TOOL</p>
        <h1>歡迎來到抽籤時間</h1>
      </div>
      <div class="live-badge"><span></span> 課堂抽籤機</div>
    </header>

    <main class="layout">
      <section class="control-card panel-card" aria-labelledby="setup-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">先設定抽籤內容</p>
            <h2 id="setup-title">準備名單</h2>
          </div>
          <div class="step-number">01</div>
        </div>

        <div class="mode-tabs" role="tablist" aria-label="選擇抽籤模式">
          <button class="mode-tab active" type="button" data-mode="number" role="tab" aria-selected="true">
            <span class="tab-icon">#</span> 號碼模式
          </button>
          <button class="mode-tab" type="button" data-mode="name" role="tab" aria-selected="false">
            <span class="tab-icon">Aa</span> 姓名模式
          </button>
        </div>

        <div class="mode-panel number-panel">
          <div class="field-label-row">
            <label for="number-start">號碼範圍</label>
            <span class="field-note">最多 10,000 個號碼</span>
          </div>
          <div class="range-fields">
            <label class="number-field">
              <span>從</span>
              <input id="number-start" type="number" value="1" step="1" inputmode="numeric">
            </label>
            <span class="range-divider">—</span>
            <label class="number-field">
              <span>到</span>
              <input id="number-end" type="number" value="30" step="1" inputmode="numeric">
            </label>
          </div>
        </div>

        <div class="mode-panel name-panel" hidden>
          <div class="field-label-row">
            <label for="roster-input">班級名單</label>
            <span class="field-note">每行一位同學</span>
          </div>
          <textarea id="roster-input" rows="6" placeholder="王小明&#10;林小華&#10;陳同學"></textarea>
          <p class="helper-text">名單會自動儲存在這台裝置，下次開啟仍可使用。</p>
        </div>

        <div class="field-group">
          <div class="field-label-row">
            <label for="exclude-input">排除對象 <span class="optional-label">選填</span></label>
            <span class="field-note">以逗號分隔</span>
          </div>
          <input id="exclude-input" class="text-input" type="text" placeholder="例如：5, 12">
        </div>

        <div class="field-group">
          <div class="field-label-row">
            <label for="draw-count">一次抽出</label>
          </div>
          <div class="count-control">
            <button class="count-button" type="button" data-count-change="-1" aria-label="減少抽出人數">−</button>
            <input id="draw-count" type="number" min="1" max="10000" value="1" inputmode="numeric" aria-label="抽出人數">
            <span class="count-unit">位</span>
            <button class="count-button" type="button" data-count-change="1" aria-label="增加抽出人數">＋</button>
          </div>
        </div>

        <label class="toggle-row" for="no-repeat">
          <span class="toggle-copy">
            <strong>不重複抽籤</strong>
            <small>抽過的對象不會再次出現</small>
          </span>
          <span class="switch">
            <input id="no-repeat" type="checkbox" checked>
            <span class="switch-track"></span>
          </span>
        </label>

        <div class="remaining-card">
          <span class="remaining-icon" aria-hidden="true">✓</span>
          <span>剩餘可抽人數</span>
          <strong id="remaining-count">30</strong>
        </div>

        <p class="error-message" role="alert" aria-live="assertive" hidden></p>
        <button class="draw-button" type="button">
          <span class="draw-button-icon" aria-hidden="true">✦</span>
          開始抽籤
          <span class="draw-shortcut">抽出好運</span>
        </button>
        <p class="status-message" role="status" aria-live="polite"></p>
      </section>

      <section class="stage-column">
        <section class="draw-stage panel-card" aria-labelledby="stage-title">
          <div class="stage-topline">
            <div>
              <p class="eyebrow">輪到誰了呢？</p>
              <h2 id="stage-title">幸運同學是⋯⋯</h2>
            </div>
            <div class="stage-sparkle" aria-hidden="true">✳</div>
          </div>
          <div class="result-display" aria-live="polite">
            <p class="result-hint">準備好就按下開始吧</p>
            <div class="result-value">?</div>
          </div>
          <div class="stage-footer">
            <span class="stage-dot"></span>
            <span class="result-caption">每一次抽籤，都是一份小驚喜</span>
          </div>
        </section>

        <section class="history-card panel-card" aria-labelledby="history-title">
          <div class="history-heading">
            <div>
              <p class="eyebrow">今天抽出了誰</p>
              <h2 id="history-title">抽籤紀錄</h2>
            </div>
            <button class="reset-button" type="button"><span aria-hidden="true">↻</span> 重置紀錄</button>
          </div>
          <div class="history-list" aria-live="polite">
            <div class="empty-history">
              <span aria-hidden="true">☼</span>
              <p>還沒有抽籤紀錄<br><small>第一位幸運同學即將誕生！</small></p>
            </div>
          </div>
        </section>
      </section>
    </main>

    <footer class="page-footer">讓每一堂課，都多一點期待 <span>✦</span></footer>
  `);

  cacheElements();
  loadSavedRoster();
  bindEvents();
  refreshAvailability();
  noLoop();
}

function cacheElements() {
  modeTabs = Array.from(app.elt.querySelectorAll('.mode-tab'));
  numberPanel = app.elt.querySelector('.number-panel');
  namePanel = app.elt.querySelector('.name-panel');
  numberStartInput = app.elt.querySelector('#number-start');
  numberEndInput = app.elt.querySelector('#number-end');
  rosterInput = app.elt.querySelector('#roster-input');
  excludeInput = app.elt.querySelector('#exclude-input');
  drawCountInput = app.elt.querySelector('#draw-count');
  noRepeatInput = app.elt.querySelector('#no-repeat');
  remainingLabel = app.elt.querySelector('#remaining-count');
  resultDisplay = app.elt.querySelector('.result-display');
  resultHint = app.elt.querySelector('.result-hint');
  errorMessage = app.elt.querySelector('.error-message');
  historyList = app.elt.querySelector('.history-list');
  drawButton = app.elt.querySelector('.draw-button');
  statusMessage = app.elt.querySelector('.status-message');
}

function bindEvents() {
  modeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (spinState) return;
      setMode(tab.dataset.mode);
    });
  });

  [numberStartInput, numberEndInput, excludeInput, drawCountInput].forEach((input) => {
    input.addEventListener('input', refreshAvailability);
  });

  rosterInput.addEventListener('input', () => {
    saveRoster();
    refreshAvailability();
  });

  noRepeatInput.addEventListener('change', refreshAvailability);
  drawButton.addEventListener('click', startDraw);

  app.elt.querySelectorAll('.count-button').forEach((button) => {
    button.addEventListener('click', () => {
      if (spinState) return;
      const current = Number.parseInt(drawCountInput.value, 10) || 1;
      drawCountInput.value = String(Math.max(1, current + Number(button.dataset.countChange)));
      refreshAvailability();
    });
  });

  app.elt.querySelector('.reset-button').addEventListener('click', resetHistory);
}

function setMode(nextMode) {
  currentMode = nextMode;
  modeTabs.forEach((tab) => {
    const active = tab.dataset.mode === nextMode;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  numberPanel.hidden = nextMode !== 'number';
  namePanel.hidden = nextMode !== 'name';
  clearError();
  refreshAvailability();
}

let currentMode = 'number';

function loadSavedRoster() {
  try {
    const savedRoster = localStorage.getItem(ROSTER_STORAGE_KEY);
    if (savedRoster !== null) rosterInput.value = savedRoster;
  } catch (error) {
    statusMessage.textContent = '無法讀取本機名單，請確認瀏覽器允許使用本機儲存空間。';
    statusMessage.classList.add('status-warning');
  }
}

function saveRoster() {
  try {
    localStorage.setItem(ROSTER_STORAGE_KEY, rosterInput.value);
    statusMessage.textContent = '';
    statusMessage.classList.remove('status-warning');
  } catch (error) {
    statusMessage.textContent = '名單尚未儲存：瀏覽器目前無法使用本機儲存空間。';
    statusMessage.classList.add('status-warning');
  }
}

function getRoster() {
  if (currentMode === 'number') {
    const startText = numberStartInput.value.trim();
    const endText = numberEndInput.value.trim();
    if (!startText || !endText) throw new Error('請輸入號碼範圍的起始與結束號碼。');

    const start = Number(startText);
    const end = Number(endText);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
      throw new Error('起始號碼與結束號碼必須是有效的安全整數。');
    }
    if (start > end) throw new Error('起始號碼不能大於結束號碼。');
    if (end - start + 1 > MAX_ROSTER_SIZE) {
      throw new Error(`號碼範圍最多可設定 ${MAX_ROSTER_SIZE.toLocaleString()} 個號碼。`);
    }
    return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
  }

  const names = rosterInput.value
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);
  const uniqueNames = [...new Set(names)];
  if (uniqueNames.length > MAX_ROSTER_SIZE) {
    throw new Error(`名單最多可設定 ${MAX_ROSTER_SIZE.toLocaleString()} 位同學。`);
  }
  return uniqueNames;
}

function getExcludedValues() {
  const rawValues = excludeInput.value
    .split(currentMode === 'number' ? /[,\uFF0C;\uFF1B\n\r\t ]+/ : /[,\uFF0C;\uFF1B\n\r]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (currentMode === 'number') {
    const invalidValue = rawValues.find((value) =>
      !/^[+-]?\d+$/.test(value) || !Number.isSafeInteger(Number(value))
    );
    if (invalidValue !== undefined) {
      throw new Error(`排除號碼「${invalidValue}」不是有效的整數。`);
    }
    return new Set(rawValues.map((value) => String(Number(value))));
  }
  return new Set(rawValues);
}

function getAvailableRoster() {
  const roster = getRoster();
  const excluded = getExcludedValues();
  return roster.filter((value) => {
    const identity = getIdentity(value);
    return !excluded.has(value) && !(noRepeatInput.checked && pickedValues.has(identity));
  });
}

function getIdentity(value) {
  return `${currentMode}:${value}`;
}

function refreshAvailability() {
  try {
    const available = getAvailableRoster();
    remainingLabel.textContent = available.length.toLocaleString();
    clearError();
    drawButton.disabled = Boolean(spinState);
  } catch (error) {
    remainingLabel.textContent = '—';
    if (!spinState) drawButton.disabled = false;
    showError(error.message);
  }
}

function startDraw() {
  if (spinState) return;

  let available;
  let count;
  try {
    available = getAvailableRoster();
    count = Number(drawCountInput.value);
    if (!Number.isInteger(count) || count < 1) {
      throw new Error('請輸入至少 1 位的抽出人數。');
    }
    if (available.length === 0) {
      throw new Error('目前沒有可抽對象，請檢查名單或排除設定。');
    }
    if (count > available.length) {
      throw new Error(`可抽人數不足：目前只有 ${available.length} 位，無法抽出 ${count} 位。`);
    }
  } catch (error) {
    showError(error.message);
    return;
  }

  clearError();
  statusMessage.textContent = '';
  resultDisplay.classList.add('is-spinning');
  resultHint.textContent = '正在為大家抽出幸運同學⋯';
  resultDisplay.querySelector('.result-value').textContent = '✦';
  drawButton.disabled = true;
  setSettingsDisabled(true);
  spinState = {
    startedAt: millis(),
    available,
    count,
    nextUpdateAt: 0
  };
  loop();
  playStartSound();
}

function setSettingsDisabled(disabled) {
  [numberStartInput, numberEndInput, rosterInput, excludeInput, drawCountInput, noRepeatInput].forEach((input) => {
    input.disabled = disabled;
  });
  modeTabs.forEach((tab) => {
    tab.disabled = disabled;
  });
  app.elt.querySelectorAll('.count-button, .reset-button').forEach((button) => {
    button.disabled = disabled;
  });
}

function finishDraw() {
  const selected = sampleWithoutReplacement(spinState.available, spinState.count);
  selected.forEach((value) => pickedValues.add(getIdentity(value)));
  historyEntries.unshift({
    values: selected,
    mode: currentMode,
    time: new Date()
  });

  resultDisplay.classList.remove('is-spinning');
  resultHint.textContent = '恭喜以下幸運同學！';
  renderResults(selected);
  appendHistory(historyEntries[0]);
  launchConfetti();
  playWinSound();

  spinState = null;
  setSettingsDisabled(false);
  refreshAvailability();
  drawButton.disabled = false;
  statusMessage.textContent = audioUnsupported
    ? '抽籤完成！此瀏覽器不支援音效。'
    : '抽籤完成！';
}

function sampleWithoutReplacement(values, count) {
  const pool = [...values];
  const selected = [];
  for (let index = 0; index < count; index += 1) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(randomIndex, 1)[0]);
  }
  return selected;
}

function renderResults(values) {
  const resultValue = resultDisplay.querySelector('.result-value');
  resultValue.replaceChildren();
  values.forEach((value) => {
    const chip = document.createElement('span');
    chip.className = 'winner-chip';
    chip.textContent = value;
    resultValue.appendChild(chip);
  });
}

function appendHistory(entry) {
  const emptyState = historyList.querySelector('.empty-history');
  if (emptyState) emptyState.remove();

  const row = document.createElement('article');
  row.className = 'history-entry';

  const number = document.createElement('span');
  number.className = 'history-index';
  number.textContent = String(historyEntries.length).padStart(2, '0');

  const names = document.createElement('div');
  names.className = 'history-names';
  entry.values.forEach((value) => {
    const chip = document.createElement('span');
    chip.className = 'history-chip';
    chip.textContent = value;
    names.appendChild(chip);
  });

  const time = document.createElement('time');
  time.className = 'history-time';
  time.dateTime = entry.time.toISOString();
  time.textContent = entry.time.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });

  row.append(number, names, time);
  historyList.prepend(row);
}

function resetHistory() {
  if (spinState) return;
  pickedValues.clear();
  historyEntries = [];
  historyList.innerHTML = `
    <div class="empty-history">
      <span aria-hidden="true">☼</span>
      <p>還沒有抽籤紀錄<br><small>第一位幸運同學即將誕生！</small></p>
    </div>
  `;
  resultDisplay.classList.remove('is-spinning');
  resultHint.textContent = '準備好就按下開始吧';
  resultDisplay.querySelector('.result-value').textContent = '?';
  statusMessage.textContent = '抽籤紀錄與不重複狀態已重置。';
  refreshAvailability();
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
  errorMessage.classList.add('visible');
}

function clearError() {
  errorMessage.textContent = '';
  errorMessage.hidden = true;
  errorMessage.classList.remove('visible');
}

function playStartSound() {
  const context = getAudioContext();
  if (!context) return;
  playTone(context, 420, 0.07, 0.045, 'sine', 0);
  playTone(context, 560, 0.07, 0.04, 'sine', 0.12);
}

function playWinSound() {
  const context = getAudioContext();
  if (!context) return;
  [660, 880, 1100].forEach((frequency, index) => {
    playTone(context, frequency, 0.18, 0.07, 'sine', index * 0.12);
  });
}

function getAudioContext() {
  if (audioContext) {
    if (audioContext.state === 'suspended') audioContext.resume();
    return audioContext;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    audioUnsupported = true;
    return null;
  }
  audioContext = new AudioContextClass();
  return audioContext;
}

function playTone(context, frequency, duration, volume, type, delay) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startTime = context.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

function launchConfetti() {
  const colors = ['#f5a65b', '#ff7080', '#7bc5a4', '#88a9f5', '#c398e6', '#f1ce69'];
  for (let index = 0; index < 130; index += 1) {
    confetti.push({
      x: random(width),
      y: random(-height * 0.2, height * 0.25),
      size: random(5, 12),
      speed: random(2.2, 6.5),
      drift: random(-1.8, 1.8),
      rotation: random(TWO_PI),
      spin: random(-0.12, 0.12),
      color: random(colors),
      shape: random() > 0.25 ? 'rect' : 'circle',
      life: 1
    });
  }
  loop();
}

function draw() {
  clear();
  updateSpin();
  drawConfetti();
  if (!spinState && confetti.length === 0) noLoop();
}

function updateSpin() {
  if (!spinState) return;

  const elapsed = millis() - spinState.startedAt;
  if (elapsed >= SPIN_DURATION) {
    finishDraw();
    return;
  }

  if (elapsed >= spinState.nextUpdateAt) {
    const preview = spinState.available[Math.floor(random(spinState.available.length))];
    resultDisplay.querySelector('.result-value').textContent = preview;
    spinState.nextUpdateAt = elapsed + map(elapsed, 0, SPIN_DURATION, 55, 190);
  }
}

function drawConfetti() {
  for (let index = confetti.length - 1; index >= 0; index -= 1) {
    const piece = confetti[index];
    piece.x += piece.drift;
    piece.y += piece.speed;
    piece.rotation += piece.spin;
    piece.life -= 0.004;

    push();
    translate(piece.x, piece.y);
    rotate(piece.rotation);
    noStroke();
    const colorValue = color(piece.color);
    colorValue.setAlpha(255 * Math.max(0, piece.life));
    fill(colorValue);
    if (piece.shape === 'circle') {
      ellipse(0, 0, piece.size, piece.size);
    } else {
      rectMode(CENTER);
      rect(0, 0, piece.size, piece.size * 0.62, 2);
    }
    pop();

    if (piece.y > height + 20 || piece.life <= 0) confetti.splice(index, 1);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
