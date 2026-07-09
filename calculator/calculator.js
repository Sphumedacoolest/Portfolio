// ─── CURSOR ───
const cursor = document.getElementById('cursor');
document.addEventListener('mousemove', e => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';
});
document.querySelectorAll('a, button').forEach(el => {
  el.addEventListener('mouseenter', () => { cursor.style.width='20px'; cursor.style.height='20px'; });
  el.addEventListener('mouseleave', () => { cursor.style.width='8px'; cursor.style.height='8px'; });
});

// ─── FADE IN ───
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.08 });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ─── RIPPLE ───
function addRipple(el, e) {
  if (!e) return;
  const r = document.createElement('span');
  r.classList.add('ripple');
  const rect = el.getBoundingClientRect();
  r.style.left = (e.clientX - rect.left) + 'px';
  r.style.top  = (e.clientY - rect.top) + 'px';
  el.appendChild(r);
  setTimeout(() => r.remove(), 500);
}

// ─── CALCULATOR STATE ───
let current = '0';
let expression = '';
let operator = null;
let prevValue = null;
let justCalc = false;
let history = [];
let mode = 'std';

const resultEl = document.getElementById('result');
const exprEl   = document.getElementById('expression');

function updateDisplay() {
  resultEl.textContent = formatNum(current);
  exprEl.textContent = expression;
}

function formatNum(n) {
  const num = parseFloat(n);
  if (isNaN(num)) return n;
  if (Math.abs(num) > 1e10 || (Math.abs(num) < 1e-6 && num !== 0))
    return num.toExponential(4);
  const str = parseFloat(num.toFixed(8)).toString();
  return str.length > 12 ? parseFloat(num.toPrecision(8)).toString() : str;
}

function inputNum(n, e) {
  if (e) addRipple(e.currentTarget, e);
  if (justCalc) { current = n; expression = ''; justCalc = false; }
  else current = (current === '0' && n !== '.') ? n : current + n;
  updateDisplay();
}

function inputDot(e) {
  if (e) addRipple(e.currentTarget, e);
  if (justCalc) { current = '0.'; justCalc = false; }
  else if (!current.includes('.')) current += '.';
  updateDisplay();
}

function inputOp(op, e) {
  if (e) addRipple(e.currentTarget, e);
  justCalc = false;
  expression = (expression || current) + ' ' + op + ' ';
  prevValue = parseFloat(current);
  operator = op;
  current = '0';
  updateDisplay();
}

function clearCalc(e) {
  if (e) addRipple(e.currentTarget, e);
  current = '0'; expression = ''; operator = null; prevValue = null; justCalc = false;
  resultEl.classList.remove('accent');
  updateDisplay();
}

function toggleSign(e) {
  if (e) addRipple(e.currentTarget, e);
  current = String(parseFloat(current) * -1);
  updateDisplay();
}

function percent(e) {
  if (e) addRipple(e.currentTarget, e);
  current = String(parseFloat(current) / 100);
  updateDisplay();
}

function backspace() {
  if (current.length > 1) current = current.slice(0, -1);
  else current = '0';
  updateDisplay();
}

function insertConst(c) {
  current = String(Math.PI);
  updateDisplay();
}

function sciOp(op) {
  const n = parseFloat(current);
  const ops = {
    sin:  () => Math.sin(n * Math.PI / 180),
    cos:  () => Math.cos(n * Math.PI / 180),
    tan:  () => Math.tan(n * Math.PI / 180),
    log:  () => Math.log10(n),
    sqrt: () => Math.sqrt(n),
    pow2: () => Math.pow(n, 2),
    inv:  () => 1 / n,
  };
  const label = { sin:'sin', cos:'cos', tan:'tan', log:'log₁₀', sqrt:'√', pow2:'²', inv:'1/' };
  const prev = current;
  current = String(parseFloat(ops[op]().toFixed(10)));
  pushHistory(label[op] + '(' + prev + ')', current);
  resultEl.classList.add('accent');
  setTimeout(() => resultEl.classList.remove('accent'), 600);
  updateDisplay();
}

function calculate(e) {
  if (e) addRipple(e.currentTarget, e);
  if (!expression || current === '0' && !expression) return;

  const fullExpr = expression + current;
  let expr = fullExpr
    .replace(/÷/g, '/')
    .replace(/×/g, '*')
    .replace(/−/g, '-')
    .replace(/π/g, Math.PI);

  let result;
  try { result = eval(expr); } catch(err) { current = 'Error'; updateDisplay(); return; }

  if (!isFinite(result)) { current = 'Error'; updateDisplay(); return; }

  pushHistory(fullExpr, parseFloat(result.toFixed(10)));
  current = String(parseFloat(result.toFixed(10)));
  expression = '';
  operator = null;
  justCalc = true;

  resultEl.classList.add('accent');
  setTimeout(() => resultEl.classList.remove('accent'), 600);
  updateDisplay();
}

// ─── HISTORY ───
function pushHistory(expr, val) {
  history.unshift({ expr, val });
  if (history.length > 20) history.pop();
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');
  if (history.length === 0) {
    empty.style.display = 'block';
    list.querySelectorAll('.history-item').forEach(i => i.remove());
    return;
  }
  empty.style.display = 'none';
  list.querySelectorAll('.history-item').forEach(i => i.remove());
  history.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `<span class="history-expr">${item.expr}</span><span class="history-val">${formatNum(String(item.val))}</span>`;
    div.onclick = () => {
      current = String(item.val);
      expression = '';
      justCalc = true;
      resultEl.classList.add('accent');
      setTimeout(() => resultEl.classList.remove('accent'), 600);
      updateDisplay();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    list.appendChild(div);
  });
}

function clearHistory() {
  history = [];
  renderHistory();
}

// ─── KEYBOARD ───
document.addEventListener('keydown', e => {
  if (['0','1','2','3','4','5','6','7','8','9','.'].includes(e.key)) inputNum(e.key);
  else if (e.key === 'Enter' || e.key === '=') calculate();
  else if (e.key === 'Backspace') backspace();
  else if (e.key === 'Escape') clearCalc();
  else if (e.key === '+') inputOp('+');
  else if (e.key === '-') inputOp('−');
  else if (e.key === '*') inputOp('×');
  else if (e.key === '/') { e.preventDefault(); inputOp('÷'); }
  else if (e.key === '%') percent();
});

// ─── MODE SWITCH ───
function setMode(m) {
  mode = m;
  document.getElementById('modeStd').classList.toggle('active', m === 'std');
  document.getElementById('modeSci').classList.toggle('active', m === 'sci');
  document.getElementById('sciButtons').classList.toggle('visible', m === 'sci');
}
