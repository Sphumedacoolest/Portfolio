// ─── CURSOR ───
const cursor = document.getElementById('cursor');
document.addEventListener('mousemove', e => { cursor.style.left=e.clientX+'px'; cursor.style.top=e.clientY+'px'; });
document.querySelectorAll('a,button,input').forEach(el => {
  el.addEventListener('mouseenter', () => { cursor.style.width='20px'; cursor.style.height='20px'; });
  el.addEventListener('mouseleave', () => { cursor.style.width='8px'; cursor.style.height='8px'; });
});

// ─── FADE IN ───
const obs = new IntersectionObserver(entries => entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); }), { threshold: 0.06 });
document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));

// ─── WORD POOLS ───
const POOLS = {
  common: `the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us`.split(' '),

  code: `function return const let var if else for while do switch case break continue true false null undefined import export default class extends new this typeof typeof instanceof void async await try catch finally throw Promise fetch then console log error`.split(' '),

  quotes: `the quick brown fox jumps over the lazy dog pack my box with five dozen liquor jugs how vexingly quick daft zebras jump the five boxing wizards jump quickly sphinx of black quartz judge my vow`.split(' ')
};

// ─── STATE ───
let timeLimit   = 30;
let wordMode    = 'common';
let words       = [];
let wordIndex   = 0;
let charIndex   = 0;
let started     = false;
let finished    = false;
let timerLeft   = 30;
let timerTotal  = 30;
let timerInt    = null;
let correctChars = 0;
let totalChars   = 0;
let errorChars   = 0;
let rawChars     = 0;

const display   = document.getElementById('wordDisplay');
const input     = document.getElementById('typeInput');
const overlay   = document.getElementById('idleOverlay');

// ─── GENERATE WORDS ───
function generateWords(n = 80) {
  const pool = POOLS[wordMode];
  const out = [];
  for (let i = 0; i < n; i++) out.push(pool[Math.floor(Math.random() * pool.length)]);
  return out;
}

// ─── RENDER WORDS ───
function renderWords() {
  display.innerHTML = words.map((word, wi) =>
    `<span class="word" id="w${wi}">${[...word].map((ch, ci) =>
      `<span class="char pending" id="c${wi}-${ci}">${ch}</span>`
    ).join('')}</span>`
  ).join('');
  setCursor(0, 0);
}

function setCursor(wi, ci) {
  document.querySelectorAll('.char.cursor').forEach(el => el.classList.remove('cursor'));
  const target = document.getElementById(`c${wi}-${ci}`);
  if (target) {
    target.classList.add('cursor');
    // Scroll word into view
    const wordEl = document.getElementById(`w${wi}`);
    if (wordEl) wordEl.scrollIntoView({ block: 'nearest' });
  }
}

// ─── INIT ───
function init() {
  words = generateWords(80);
  wordIndex = 0; charIndex = 0;
  correctChars = 0; totalChars = 0; errorChars = 0; rawChars = 0;
  started = false; finished = false;
  timerLeft = timeLimit; timerTotal = timeLimit;
  if (timerInt) { clearInterval(timerInt); timerInt = null; }

  renderWords();
  input.value = '';
  input.disabled = false;
  input.classList.remove('error');

  document.getElementById('statWpm').textContent  = '—';
  document.getElementById('statAcc').textContent  = '—';
  document.getElementById('statErr').textContent  = '0';
  document.getElementById('statTime').textContent = timeLimit;
  document.getElementById('timerFill').style.width = '100%';
  document.getElementById('timerFill').className   = 'timer-fill';
  document.getElementById('resultsPanel').classList.remove('open');
  document.getElementById('modeLabel').textContent = timeLimit + 's';

  overlay.style.display = 'flex';
}

// ─── START TIMER ───
function startTimer() {
  timerInt = setInterval(() => {
    timerLeft--;
    const pct = (timerLeft / timerTotal) * 100;
    const fill = document.getElementById('timerFill');
    fill.style.width = pct + '%';
    fill.className = 'timer-fill' + (pct <= 20 ? ' danger' : pct <= 45 ? ' warning' : '');
    document.getElementById('statTime').textContent = timerLeft;
    updateLiveStats();
    if (timerLeft <= 0) endTest();
  }, 1000);
}

// ─── LIVE STATS ───
function updateLiveStats() {
  const elapsed = timerTotal - timerLeft;
  if (elapsed === 0) return;
  const wpm = Math.round((correctChars / 5) / (elapsed / 60));
  const acc = totalChars === 0 ? 100 : Math.round((correctChars / totalChars) * 100);
  document.getElementById('statWpm').textContent = wpm;
  document.getElementById('statAcc').textContent = acc + '%';
  document.getElementById('statErr').textContent = errorChars;
}

// ─── INPUT HANDLER ───
input.addEventListener('input', function(e) {
  if (finished) return;

  if (!started) {
    started = true;
    overlay.style.display = 'none';
    startTimer();
  }

  const val = this.value;

  // Space = submit word
  if (val.endsWith(' ')) {
    submitWord(val.trim());
    this.value = '';
    return;
  }

  // Live char comparison
  const target = words[wordIndex];
  const typed  = val;

  // Clear all chars for current word
  for (let i = 0; i < target.length; i++) {
    const el = document.getElementById(`c${wordIndex}-${i}`);
    if (el) el.className = 'char pending';
  }

  // Mark typed chars
  for (let i = 0; i < typed.length && i < target.length; i++) {
    const el = document.getElementById(`c${wordIndex}-${i}`);
    if (!el) continue;
    el.className = typed[i] === target[i] ? 'char correct' : 'char wrong';
  }

  // Cursor position
  const cIdx = Math.min(typed.length, target.length - 1);
  setCursor(wordIndex, cIdx);

  // Error flash if too many chars
  if (typed.length > target.length) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 200);
  } else {
    input.classList.remove('error');
  }
});

// ─── SUBMIT WORD ───
function submitWord(typed) {
  const target = words[wordIndex];

  // Count chars
  const maxLen = Math.max(typed.length, target.length);
  for (let i = 0; i < maxLen; i++) {
    totalChars++;
    rawChars++;
    if (i < target.length && i < typed.length && typed[i] === target[i]) {
      correctChars++;
    } else {
      errorChars++;
    }
  }

  // Mark word chars final
  for (let i = 0; i < target.length; i++) {
    const el = document.getElementById(`c${wordIndex}-${i}`);
    if (!el) continue;
    if (i < typed.length && typed[i] === target[i]) el.className = 'char correct';
    else el.className = 'char wrong';
  }

  wordIndex++;
  charIndex = 0;

  // Generate more words if running low
  if (wordIndex > words.length - 20) {
    const more = generateWords(40);
    words = words.concat(more);
    // Append spans for new words
    more.forEach((word, idx) => {
      const wi = words.length - more.length + idx;
      const span = document.createElement('span');
      span.className = 'word';
      span.id = `w${wi}`;
      span.innerHTML = [...word].map((ch, ci) =>
        `<span class="char pending" id="c${wi}-${ci}">${ch}</span>`
      ).join('');
      display.appendChild(span);
    });
  }

  setCursor(wordIndex, 0);
  updateLiveStats();
}

// ─── END TEST ───
function endTest() {
  clearInterval(timerInt);
  timerInt = null;
  finished = true;
  input.disabled = true;

  const elapsed = timerTotal;
  const wpm     = Math.round((correctChars / 5) / (elapsed / 60));
  const rawWpm  = Math.round((rawChars / 5) / (elapsed / 60));
  const acc     = totalChars === 0 ? 100 : Math.round((correctChars / totalChars) * 100);

  document.getElementById('resWpm').textContent = wpm;
  document.getElementById('resAcc').textContent = acc + '%';
  document.getElementById('resErr').textContent = errorChars;
  document.getElementById('resRaw').textContent = rawWpm;

  const grade = wpm >= 100 ? '🏆 Blazing fast!' : wpm >= 70 ? '⭐ Great speed!' : wpm >= 50 ? '👍 Above average!' : wpm >= 30 ? '📈 Keep practicing!' : '🐢 Just getting started!';
  document.getElementById('resultsMsg').innerHTML = `<strong>${grade}</strong> — ${acc}% accuracy over ${elapsed}s`;

  document.getElementById('resultsPanel').classList.add('open');
  setTimeout(() => document.getElementById('resultsPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
}

// ─── RESET ───
function resetTest() { init(); input.focus(); }

// ─── TIME MODE BUTTONS ───
document.querySelectorAll('[data-time]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-time]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    timeLimit = parseInt(btn.dataset.time);
    resetTest();
  });
});

// ─── WORD MODE BUTTONS ───
document.querySelectorAll('[data-words]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-words]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    wordMode = btn.dataset.words;
    resetTest();
  });
});

// ─── INIT ───
init();
input.focus();
