// ─── CURSOR ───
const cursor = document.getElementById('cursor');
document.addEventListener('mousemove', e => { cursor.style.left=e.clientX+'px'; cursor.style.top=e.clientY+'px'; });
function updateCursorTargets() {
  document.querySelectorAll('a,button,input,select,.answer-btn').forEach(el => {
    el.addEventListener('mouseenter', () => { cursor.style.width='20px'; cursor.style.height='20px'; });
    el.addEventListener('mouseleave', () => { cursor.style.width='8px'; cursor.style.height='8px'; });
  });
}
updateCursorTargets();

// ─── FADE IN ───
const obs = new IntersectionObserver(entries => entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); }), { threshold: 0.06 });
document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));

// ─── API LOG ───
function setApiLog(url, status) {
  document.getElementById('apiLogUrl').textContent = url;
  const s = document.getElementById('apiLogStatus');
  if (status === 'pending') s.innerHTML = '<span class="status-loading">PENDING</span>';
  else if (status === 'ok')  s.innerHTML = '<span class="status-ok">200 OK</span>';
  else                       s.innerHTML = '<span class="status-err">ERROR</span>';
}

// ─── HTML DECODE ───
function decode(str) {
  const el = document.getElementById('htmlDecoder');
  el.innerHTML = str;
  return el.value;
}

// ─── SHUFFLE ───
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── STATE ───
let questions = [];
let current = 0;
let score = 0;
let correct = 0;
let wrong = 0;
let total = 0;
let answered = false;
let timerInterval = null;
let timeLeft = 15;
const TIMER_MAX = 15;

// ─── POINTS BY DIFFICULTY ───
const POINTS = { easy: 10, medium: 20, hard: 30 };

// ─── START ───
async function startGame() {
  const cat   = document.getElementById('categorySelect').value;
  const diff  = document.getElementById('difficultySelect').value;
  const amount = document.getElementById('amountSelect').value;

  document.getElementById('startBtn').disabled = true;
  document.getElementById('startBtn').textContent = 'LOADING...';

  let url = `https://opentdb.com/api.php?amount=${amount}&type=multiple`;
  if (cat)  url += `&category=${cat}`;
  if (diff) url += `&difficulty=${diff}`;

  setApiLog(url, 'pending');

  document.getElementById('gameArea').innerHTML = `
    <div class="screen">
      <div class="loading-dots"><span></span><span></span><span></span></div>
      <div style="font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:1rem;">Fetching questions from OpenTDB...</div>
    </div>`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      throw new Error('No questions returned — try a different category/difficulty combo.');
    }

    setApiLog(url, 'ok');
    questions = data.results;
    current = 0; score = 0; correct = 0; wrong = 0;
    total = questions.length;

    document.getElementById('scoreboard').style.display = 'flex';
    document.getElementById('timerBarWrap').style.display = 'block';
    updateScoreboard();
    showQuestion();

  } catch(err) {
    setApiLog(url, 'error');
    document.getElementById('gameArea').innerHTML = `
      <div class="screen">
        <div class="screen-icon">⚠️</div>
        <div class="screen-title" style="font-size:1rem;">Fetch Failed</div>
        <div class="screen-sub">${err.message || 'Could not load questions. Check your connection and try again.'}</div>
      </div>`;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('startBtn').textContent = 'START QUIZ →';
  }
}

// ─── SHOW QUESTION ───
function showQuestion() {
  clearTimer();
  answered = false;

  const q = questions[current];
  const answers = shuffle([...q.incorrect_answers, q.correct_answer]);
  const keys = ['A', 'B', 'C', 'D'];
  const diff = q.difficulty;

  document.getElementById('gameArea').innerHTML = `
    <div class="question-area">
      <div class="q-meta">
        <span class="q-num">Q${current + 1} / ${total}</span>
        <span class="q-category">${decode(q.category)}</span>
        <span class="q-difficulty ${diff}">${diff.toUpperCase()}</span>
        <span style="margin-left:auto;color:var(--accent2);">+${POINTS[diff] || 10} pts</span>
      </div>
      <div class="question-text">${decode(q.question)}</div>
    </div>
    <div class="answers-grid" id="answersGrid">
      ${answers.map((a, i) => `
        <button class="answer-btn" onclick="selectAnswer(this, '${escAttr(a)}', '${escAttr(q.correct_answer)}', '${diff}')">
          <span class="answer-key">${keys[i]}</span>
          <span>${decode(a)}</span>
        </button>`).join('')}
    </div>
    <div class="feedback" id="feedback"></div>
    <div class="next-row" id="nextRow" style="display:none;">
      <button class="next-btn" onclick="nextQuestion()">${current + 1 < total ? 'NEXT QUESTION →' : 'SEE RESULTS →'}</button>
    </div>`;

  updateCursorTargets();
  startTimer(diff);
}

function escAttr(str) {
  return str.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

// ─── TIMER ───
function startTimer(diff) {
  timeLeft = TIMER_MAX;
  updateTimerUI();
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerUI();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      if (!answered) timeOut(diff);
    }
  }, 1000);
}

function clearTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function updateTimerUI() {
  document.getElementById('scoreTimer').textContent = timeLeft;
  const bar = document.getElementById('timerBar');
  const pct = (timeLeft / TIMER_MAX) * 100;
  bar.style.width = pct + '%';
  bar.className = 'timer-bar' + (pct <= 30 ? ' danger' : pct <= 55 ? ' warning' : '');
}

function timeOut(diff) {
  answered = true;
  wrong++;
  updateScoreboard();
  disableAnswers();
  revealCorrect(diff);
  const fb = document.getElementById('feedback');
  if (fb) { fb.className = 'feedback wrong'; fb.innerHTML = '<span class="feedback-icon">⏰</span> Time\'s up! No points awarded.'; }
  document.getElementById('nextRow').style.display = 'flex';
}

// ─── SELECT ANSWER ───
function selectAnswer(btn, selected, correctRaw, diff) {
  if (answered) return;
  answered = true;
  clearTimer();

  const correct_answer = decode(correctRaw);
  const is_correct = decode(selected) === correct_answer;

  disableAnswers();

  if (is_correct) {
    btn.classList.add('correct');
    const pts = POINTS[diff] || 10;
    score += pts;
    correct++;
    const fb = document.getElementById('feedback');
    if (fb) { fb.className = 'feedback correct'; fb.innerHTML = `<span class="feedback-icon">✓</span> Correct! +${pts} points`; }
  } else {
    btn.classList.add('wrong');
    wrong++;
    revealCorrect(diff);
    const fb = document.getElementById('feedback');
    if (fb) { fb.className = 'feedback wrong'; fb.innerHTML = `<span class="feedback-icon">✗</span> Wrong — no points.`; }
  }

  updateScoreboard();
  document.getElementById('nextRow').style.display = 'flex';
}

function disableAnswers() {
  document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
}

function revealCorrect(diff) {
  // Highlight the correct answer button
  const q = questions[current];
  const correctDecoded = decode(q.correct_answer);
  document.querySelectorAll('.answer-btn').forEach(btn => {
    const btnText = btn.querySelector('span:last-child').textContent;
    if (btnText === correctDecoded) btn.classList.add('reveal');
  });
}

// ─── NEXT ───
function nextQuestion() {
  current++;
  if (current >= total) {
    showResults();
  } else {
    updateScoreboard();
    showQuestion();
  }
}

// ─── SCOREBOARD ───
function updateScoreboard() {
  document.getElementById('scoreQ').textContent       = `${current + 1} / ${total}`;
  document.getElementById('scorePoints').textContent  = score;
  document.getElementById('scoreCorrect').textContent = correct;
  document.getElementById('scoreWrong').textContent   = wrong;
}

// ─── RESULTS ───
function showResults() {
  clearTimer();
  document.getElementById('scoreboard').style.display = 'none';
  document.getElementById('timerBarWrap').style.display = 'none';

  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const maxScore = questions.reduce((sum, q) => sum + (POINTS[q.difficulty] || 10), 0);
  const grade = pct >= 90 ? '🏆 Perfect!' : pct >= 70 ? '⭐ Great job!' : pct >= 50 ? '👍 Not bad!' : '📚 Keep practicing!';

  document.getElementById('gameArea').innerHTML = `
    <div class="screen">
      <div class="screen-icon">${grade.split(' ')[0]}</div>
      <div class="screen-title">${grade.slice(grade.indexOf(' ')+1)}</div>
      <div class="screen-score">${score}<span style="font-size:1rem;color:var(--muted);"> / ${maxScore}</span></div>
      <div class="screen-breakdown">
        <span>${correct}</span> correct &nbsp;·&nbsp; <span>${wrong}</span> wrong &nbsp;·&nbsp; <span>${pct}%</span> accuracy
      </div>
      <button class="play-again-btn" onclick="resetGame()">PLAY AGAIN →</button>
    </div>`;

  updateCursorTargets();
  setApiLog('https://opentdb.com/api.php', 'ok');
}

// ─── RESET ───
function resetGame() {
  questions = []; current = 0; score = 0; correct = 0; wrong = 0;
  document.getElementById('gameArea').innerHTML = `
    <div class="screen" id="idleScreen">
      <div class="screen-icon">🧠</div>
      <div class="screen-title">Ready to play?</div>
      <div class="screen-sub">Pick a category, difficulty, and number of questions above — then hit START to fetch your quiz.</div>
    </div>`;
  document.getElementById('startBtn').disabled = false;
  document.getElementById('startBtn').textContent = 'START QUIZ →';
  setApiLog('https://opentdb.com/api.php', 'waiting');
  document.getElementById('apiLogStatus').innerHTML = '<span class="status-loading">WAITING</span>';
}
