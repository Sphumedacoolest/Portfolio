// ─── CURSOR ───
const cursor = document.getElementById('cursor');
document.addEventListener('mousemove', e => { cursor.style.left = e.clientX+'px'; cursor.style.top = e.clientY+'px'; });
document.querySelectorAll('a,button,select,input').forEach(el => {
  el.addEventListener('mouseenter', () => { cursor.style.width='20px'; cursor.style.height='20px'; });
  el.addEventListener('mouseleave', () => { cursor.style.width='8px'; cursor.style.height='8px'; });
});

// ─── FADE IN ───
const obs = new IntersectionObserver(entries => entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); }), { threshold: 0.06 });
document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));

// ─── SPEED ───
const speedLabels = ['SLOW', 'LOW', 'MED', 'FAST', 'INSTANT'];
const speedDelays  = [80, 40, 16, 5, 0];
document.getElementById('speedSlider').addEventListener('input', function() {
  document.getElementById('speedLabel').textContent = speedLabels[this.value-1];
});
function getDelay() { return speedDelays[document.getElementById('speedSlider').value - 1]; }

// ─── GRID SETUP ───
const ROWS = 21, COLS = 35;
let grid = [], startNode, endNode;
let isRunning = false, mouseDown = false, mouseButton = 0;
let draggingNode = null; // 'start' | 'end'

function makeNode(row, col) {
  return { row, col, isWall: false, isStart: false, isEnd: false,
           g: Infinity, f: Infinity, parent: null, visited: false };
}

function buildGrid() {
  const g = document.getElementById('grid');
  g.style.gridTemplateColumns = `repeat(${COLS}, 22px)`;
  g.innerHTML = '';
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      const node = makeNode(r, c);
      grid[r][c] = node;
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.id = `cell-${r}-${c}`;
      cell.addEventListener('mousedown', e => { e.preventDefault(); onCellMouseDown(e, r, c); });
      cell.addEventListener('mouseenter', e => { if(mouseDown) onCellDrag(e, r, c); });
      cell.addEventListener('mouseup', () => { mouseDown = false; draggingNode = null; });
      g.appendChild(cell);
    }
  }
  // default start/end
  setStart(Math.floor(ROWS/2), 5);
  setEnd(Math.floor(ROWS/2), COLS-6);
}

function setStart(r, c) {
  if (startNode) { grid[startNode.row][startNode.col].isStart = false; updateCell(startNode.row, startNode.col); }
  startNode = grid[r][c];
  startNode.isStart = true; startNode.isWall = false;
  updateCell(r, c);
}
function setEnd(r, c) {
  if (endNode) { grid[endNode.row][endNode.col].isEnd = false; updateCell(endNode.row, endNode.col); }
  endNode = grid[r][c];
  endNode.isEnd = true; endNode.isWall = false;
  updateCell(r, c);
}

function updateCell(r, c) {
  const node = grid[r][c];
  const el = document.getElementById(`cell-${r}-${c}`);
  el.className = 'cell';
  if (node.isStart) { el.classList.add('start', 'start-node'); }
  else if (node.isEnd) { el.classList.add('end', 'end-node'); }
  else if (node.isWall) el.classList.add('wall');
}

function onCellMouseDown(e, r, c) {
  if (isRunning) return;
  mouseDown = true; mouseButton = e.button;
  const node = grid[r][c];
  if (node.isStart) { draggingNode = 'start'; return; }
  if (node.isEnd)   { draggingNode = 'end';   return; }
  toggleWall(r, c, mouseButton === 2);
}

function onCellDrag(e, r, c) {
  if (isRunning) return;
  if (draggingNode === 'start' && !grid[r][c].isEnd) { setStart(r, c); return; }
  if (draggingNode === 'end'   && !grid[r][c].isStart) { setEnd(r, c); return; }
  if (!draggingNode) toggleWall(r, c, mouseButton === 2);
}

function toggleWall(r, c, erase) {
  const node = grid[r][c];
  if (node.isStart || node.isEnd) return;
  node.isWall = !erase;
  updateCell(r, c);
}

document.addEventListener('mouseup', () => { mouseDown = false; draggingNode = null; });
document.getElementById('grid').addEventListener('contextmenu', e => e.preventDefault());

// ─── RESET / CLEAR ───
function resetGrid() {
  if (isRunning) return;
  buildGrid();
  resetStats();
  setStatus('IDLE');
}

function clearPath() {
  if (isRunning) return;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const node = grid[r][c];
      node.g = Infinity; node.f = Infinity; node.parent = null; node.visited = false;
      const el = document.getElementById(`cell-${r}-${c}`);
      if (el.classList.contains('visited') || el.classList.contains('path') || el.classList.contains('frontier')) {
        el.className = 'cell';
        if (node.isStart) el.classList.add('start','start-node');
        else if (node.isEnd) el.classList.add('end','end-node');
        else if (node.isWall) el.classList.add('wall');
      }
    }
  }
  resetStats(); setStatus('IDLE');
}

function resetStats() {
  document.getElementById('statVisited').textContent = '—';
  document.getElementById('statPath').textContent = '—';
  document.getElementById('statTime').textContent = '—';
  document.getElementById('statResult').textContent = '—';
  document.getElementById('statResult').className = 'stat-val';
}

function setStatus(s) { document.getElementById('statusLabel').textContent = s; }

// ─── MAZE GENERATORS ───
function generateMaze() {
  if (isRunning) return;
  clearPath();
  const type = document.getElementById('mazeSelect').value;
  if (type === 'none') return;
  // clear walls first
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (!grid[r][c].isStart && !grid[r][c].isEnd) { grid[r][c].isWall = false; updateCell(r,c); }
  }
  if (type === 'random') {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (grid[r][c].isStart || grid[r][c].isEnd) continue;
      if (Math.random() < 0.3) { grid[r][c].isWall = true; updateCell(r,c); }
    }
  } else if (type === 'recursive') {
    // border
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
      if (r===0||r===ROWS-1||c===0||c===COLS-1) { grid[r][c].isWall=true; updateCell(r,c); }
    }
    recursiveDivide(1,1,ROWS-2,COLS-2);
  }
}

function recursiveDivide(rStart, cStart, rEnd, cEnd) {
  if (rEnd - rStart < 2 || cEnd - cStart < 2) return;
  const horiz = (rEnd - rStart) < (cEnd - cStart) ? false : true;
  if (horiz) {
    const wallRow = rStart + 1 + Math.floor(Math.random() * Math.floor((rEnd - rStart - 1) / 2)) * 2;
    const passage = cStart + Math.floor(Math.random() * Math.floor((cEnd - cStart + 1) / 2)) * 2;
    for (let c = cStart; c <= cEnd; c++) {
      if (c !== passage && !grid[wallRow][c].isStart && !grid[wallRow][c].isEnd) {
        grid[wallRow][c].isWall = true; updateCell(wallRow, c);
      }
    }
    recursiveDivide(rStart, cStart, wallRow-1, cEnd);
    recursiveDivide(wallRow+1, cStart, rEnd, cEnd);
  } else {
    const wallCol = cStart + 1 + Math.floor(Math.random() * Math.floor((cEnd - cStart - 1) / 2)) * 2;
    const passage = rStart + Math.floor(Math.random() * Math.floor((rEnd - rStart + 1) / 2)) * 2;
    for (let r = rStart; r <= rEnd; r++) {
      if (r !== passage && !grid[r][wallCol].isStart && !grid[r][wallCol].isEnd) {
        grid[r][wallCol].isWall = true; updateCell(r, wallCol);
      }
    }
    recursiveDivide(rStart, cStart, rEnd, wallCol-1);
    recursiveDivide(rStart, wallCol+1, rEnd, cEnd);
  }
}

// ─── NEIGHBOURS ───
function getNeighbours(node) {
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  return dirs.map(([dr,dc]) => {
    const r = node.row+dr, c = node.col+dc;
    if (r<0||r>=ROWS||c<0||c>=COLS) return null;
    return grid[r][c];
  }).filter(n => n && !n.isWall);
}

function heuristic(a, b) { return Math.abs(a.row-b.row) + Math.abs(a.col-b.col); }

function tracePath(endN) {
  const path = []; let cur = endN;
  while (cur) { path.unshift(cur); cur = cur.parent; }
  return path;
}

// ─── RESET NODE STATE ───
function resetNodeState() {
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
    grid[r][c].g = Infinity; grid[r][c].f = Infinity;
    grid[r][c].parent = null; grid[r][c].visited = false;
  }
}

// ─── ALGORITHMS ───
function algoBFS(start, end) {
  const order = [], queue = [start];
  start.visited = true;
  while (queue.length) {
    const cur = queue.shift();
    order.push(cur);
    if (cur === end) return { order, path: tracePath(end) };
    for (const nb of getNeighbours(cur)) {
      if (!nb.visited) { nb.visited = true; nb.parent = cur; queue.push(nb); }
    }
  }
  return { order, path: null };
}

function algoDFS(start, end) {
  const order = [], stack = [start];
  start.visited = true;
  while (stack.length) {
    const cur = stack.pop();
    order.push(cur);
    if (cur === end) return { order, path: tracePath(end) };
    for (const nb of getNeighbours(cur)) {
      if (!nb.visited) { nb.visited = true; nb.parent = cur; stack.push(nb); }
    }
  }
  return { order, path: null };
}

function algoDijkstra(start, end) {
  const order = [], open = [start];
  start.g = 0;
  while (open.length) {
    open.sort((a,b) => a.g - b.g);
    const cur = open.shift();
    if (cur.visited) continue;
    cur.visited = true; order.push(cur);
    if (cur === end) return { order, path: tracePath(end) };
    for (const nb of getNeighbours(cur)) {
      const g = cur.g + 1;
      if (g < nb.g) { nb.g = g; nb.parent = cur; open.push(nb); }
    }
  }
  return { order, path: null };
}

function algoAStar(start, end) {
  const order = [], open = [start], closed = new Set();
  start.g = 0; start.f = heuristic(start, end);
  while (open.length) {
    open.sort((a,b) => a.f - b.f);
    const cur = open.shift();
    if (closed.has(cur)) continue;
    closed.add(cur); cur.visited = true; order.push(cur);
    if (cur === end) return { order, path: tracePath(end) };
    for (const nb of getNeighbours(cur)) {
      if (closed.has(nb)) continue;
      const g = cur.g + 1;
      if (g < nb.g) {
        nb.g = g; nb.f = g + heuristic(nb, end); nb.parent = cur;
        if (!open.includes(nb)) open.push(nb);
      }
    }
  }
  return { order, path: null };
}

// ─── ANIMATE ───
async function animate(order, path) {
  const delay = getDelay();
  for (const node of order) {
    if (node === startNode || node === endNode) continue;
    const el = document.getElementById(`cell-${node.row}-${node.col}`);
    el.className = 'cell visited';
    if (delay > 0) await sleep(delay);
  }
  if (!path) return false;
  for (const node of path) {
    if (node === startNode || node === endNode) continue;
    const el = document.getElementById(`cell-${node.row}-${node.col}`);
    el.className = 'cell path';
    if (delay > 0) await sleep(Math.max(delay, 20));
  }
  return true;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── RUN ───
async function runAlgo() {
  if (isRunning) return;
  clearPath();
  isRunning = true;
  document.getElementById('runBtn').disabled = true;
  setStatus('RUNNING');
  const algo = document.getElementById('algoSelect').value;
  document.getElementById('statAlgo').textContent = { astar:'A*', dijkstra:"Dijkstra's", bfs:'BFS', dfs:'DFS' }[algo];
  resetNodeState();
  const t0 = performance.now();
  const map = { astar: algoAStar, dijkstra: algoDijkstra, bfs: algoBFS, dfs: algoDFS };
  const { order, path } = map[algo](startNode, endNode);
  const t1 = performance.now();
  await animate(order, path);
  document.getElementById('statVisited').textContent = order.length;
  document.getElementById('statTime').textContent = (t1 - t0).toFixed(1);
  if (path) {
    document.getElementById('statPath').textContent = path.length - 2;
    document.getElementById('statResult').textContent = 'PATH FOUND';
    document.getElementById('statResult').className = 'stat-val green';
    setStatus('DONE');
  } else {
    document.getElementById('statPath').textContent = '—';
    document.getElementById('statResult').textContent = 'NO PATH';
    document.getElementById('statResult').className = 'stat-val red';
    setStatus('NO PATH');
  }
  isRunning = false;
  document.getElementById('runBtn').disabled = false;
}

// ─── ALGO CARD HIGHLIGHT ───
function onAlgoChange() {
  const algo = document.getElementById('algoSelect').value;
  document.querySelectorAll('.algo-card').forEach(c => c.classList.remove('active-algo'));
  document.getElementById(`card-${algo}`).classList.add('active-algo');
  document.getElementById('statAlgo').textContent = { astar:'A*', dijkstra:"Dijkstra's", bfs:'BFS', dfs:'DFS' }[algo];
}

// ─── INIT ───
buildGrid();
