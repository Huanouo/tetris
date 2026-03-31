'use strict';

/* ─── 常數 ─────────────────────────────────────────────────────────────────── */

const CELL = 30;            // 每格像素大小
const NEXT_CELL = 24;       // 預覽畫布格子大小
const LINES_PER_LEVEL = 10; // 每升一關需要消除的行數
const LOCK_DELAY = 500;     // ms：方塊觸底後鎖定的延遲
const TIME_SPEED_UP = 30000; // ms：每 30 秒速度加快一次
const TIME_SPEED_FACTOR = 0.95; // 時間加速係數

// 顏色索引 1-7 對應 PIECE_TYPES 順序
const {
  BOARD_WIDTH, BOARD_HEIGHT, TETROMINOES, PIECE_TYPES,
  createBoard, rotatePiece, isValidPosition, placePiece,
  clearLines, isGameOver, calculateScore, getSpawnPosition, getGhostPosition,
} = window.TetrisCore;

// 依照索引取色 (0 = 空格)
const TYPE_INDEX = {};
PIECE_TYPES.forEach((t, i) => { TYPE_INDEX[t] = i + 1; });
const INDEX_COLOR = ['', ...PIECE_TYPES.map(t => TETROMINOES[t].color)];

/* ─── TetrisGame 類別 ──────────────────────────────────────────────────────── */

class TetrisGame {
  constructor(boardCanvas, nextCanvas) {
    this.boardCanvas = boardCanvas;
    this.ctx = boardCanvas.getContext('2d');
    this.nextCanvas = nextCanvas;
    this.nextCtx = nextCanvas.getContext('2d');

    this.state = 'idle'; // idle | playing | paused | gameover
    this._rafId = null;
    this._lastTime = 0;
    this._dropAccum = 0;  // 累積下落計時器（ms）
    this._lockAccum = 0;  // 鎖定延遲計時器（ms）
    this._locking = false;
    this._gameTime = 0;   // 遊戲總時間（ms）
    this._speedUpAccum = 0; // 時間加速累積（ms）

    this._bindEvents();
  }

  /* ── 遊戲控制 ─────────────────────────────────────────────────── */

  start() {
    this._reset();
    this.state = 'playing';
    this._hideOverlay();
    this._lastTime = performance.now();
    this._loop(this._lastTime);
  }

  pause() {
    if (this.state !== 'playing' && this.state !== 'paused') return;
    if (this.state === 'playing') {
      this.state = 'paused';
      this._showOverlay('遊戲暫停', '按 P 或 Enter 繼續');
    } else {
      this.state = 'playing';
      this._hideOverlay();
      this._lastTime = performance.now();
    }
  }

  /* ── 私有：重設狀態 ───────────────────────────────────────────── */

  _reset() {
    this.board = createBoard();
    this.score = 0;
    this.level = 1;
    this.totalLines = 0;
    this._dropInterval = 1000; // ms
    this._baseDropInterval = 1000; // 基礎速度
    this._dropAccum = 0;
    this._lockAccum = 0;
    this._locking = false;
    this._gameTime = 0;
    this._speedUpAccum = 0;
    this.nextPiece = this._makePiece();
    this._spawn();
    this._updateHUD();
  }

  _makePiece() {
    const type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
    return { type, shape: TETROMINOES[type].shape.map(r => [...r]), colorIdx: TYPE_INDEX[type] };
  }

  _spawn() {
    this.current = this.nextPiece;
    this.nextPiece = this._makePiece();
    const { x, y } = getSpawnPosition(this.board, this.current.shape);
    this.cx = x;
    this.cy = y;
    this._locking = false;
    this._lockAccum = 0;

    if (isGameOver(this.board, this.current.shape, this.cx, this.cy)) {
      this._endGame();
    }
  }

  /* ── 私有：遊戲迴圈 ──────────────────────────────────────────── */

  _loop(timestamp) {
    const dt = Math.min(timestamp - this._lastTime, 100); // cap at 100ms
    this._lastTime = timestamp;

    if (this.state === 'playing') {
      this._update(dt);
      this._render();
    } else if (this.state === 'paused') {
      // 暫停時仍持續渲染（顯示暫停遮罩）
      this._render();
    }

    this._rafId = requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    // 時間加速機制
    this._gameTime += dt;
    this._speedUpAccum += dt;
    if (this._speedUpAccum >= TIME_SPEED_UP) {
      this._speedUpAccum -= TIME_SPEED_UP;
      this._baseDropInterval = Math.max(100, this._baseDropInterval * TIME_SPEED_FACTOR);
      this._updateDropInterval();
    }

    const canMoveDown = isValidPosition(this.board, this.current.shape, this.cx, this.cy + 1);

    if (!canMoveDown) {
      // 方塊觸底，開始鎖定計時
      this._locking = true;
      this._lockAccum += dt;
      if (this._lockAccum >= LOCK_DELAY) {
        this._lock();
      }
    } else {
      this._locking = false;
      this._lockAccum = 0;
      this._dropAccum += dt;
      if (this._dropAccum >= this._dropInterval) {
        this._dropAccum -= this._dropInterval;
        this.cy++;
      }
    }
  }

  _lock() {
    this.board = placePiece(this.board, this.current.shape, this.cx, this.cy, this.current.colorIdx);
    const { board: newBoard, linesCleared } = clearLines(this.board);
    this.board = newBoard;

    if (linesCleared > 0) {
      this.score += calculateScore(linesCleared, this.level);
      this.totalLines += linesCleared;
      this.level = Math.floor(this.totalLines / LINES_PER_LEVEL) + 1;
      this._updateDropInterval();
      this._updateHUD();
    }

    this._spawn();
    this._dropAccum = 0;
  }

  _endGame() {
    this.state = 'gameover';
    cancelAnimationFrame(this._rafId);
    this._render(); // 最後渲染一次
    this._showOverlay('遊戲結束', `得分：${this.score}\n按「再玩一次」重新開始`, '再玩一次');
  }

  /* ── 私有：輸入處理 ──────────────────────────────────────────── */

  _bindEvents() {
    document.addEventListener('keydown', e => this._onKey(e));
    document.getElementById('start-btn').addEventListener('click', () => this.start());
    document.getElementById('overlay-btn').addEventListener('click', () => this.start());
  }

  _onKey(e) {
    if (e.key === 'p' || e.key === 'P') {
      this.pause();
      return;
    }
    if (e.key === 'Enter') {
      if (this.state === 'paused') {
        this.pause(); // 取消暫停
      } else if (this.state !== 'playing') {
        this.start();
      }
      return;
    }
    if (this.state !== 'playing') return;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        this._tryMove(-1, 0);
        break;
      case 'ArrowRight':
        e.preventDefault();
        this._tryMove(1, 0);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (this._tryMove(0, 1)) {
          this._dropAccum = 0;
          this.score += 1;
          this._updateHUD();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._tryRotate();
        break;
      case ' ':
        e.preventDefault();
        this._hardDrop();
        break;
    }
  }

  _tryMove(dx, dy) {
    if (isValidPosition(this.board, this.current.shape, this.cx + dx, this.cy + dy)) {
      this.cx += dx;
      this.cy += dy;
      if (dy !== 0) {
        // 移動後重置鎖定計時（給玩家反應時間）
        this._lockAccum = 0;
      }
      return true;
    }
    return false;
  }

  _tryRotate() {
    const rotated = rotatePiece(this.current.shape);
    // Wall kick：先嘗試原位，再左右各偏移 1~2 格
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (isValidPosition(this.board, rotated, this.cx + kick, this.cy)) {
        this.current.shape = rotated;
        this.cx += kick;
        this._lockAccum = 0;
        return;
      }
    }
  }

  _hardDrop() {
    const ghostY = getGhostPosition(this.board, this.current.shape, this.cx, this.cy);
    this.score += (ghostY - this.cy) * 2;
    this.cy = ghostY;
    this._updateHUD();
    this._lock();
  }

  /* ── 私有：渲染 ──────────────────────────────────────────────── */

  _render() {
    this._renderBoard();
    this._renderGhost();
    this._renderCurrent();
    this._renderNext();
    
    // 暫停時顯示半透明遮罩
    if (this.state === 'paused') {
      const ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = 'rgba(10, 10, 20, 0.6)';
      ctx.fillRect(0, 0, this.boardCanvas.width, this.boardCanvas.height);
      ctx.restore();
    }
  }

  _renderBoard() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.boardCanvas.width, this.boardCanvas.height);

    // 背景格線
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= BOARD_WIDTH; x++) {
      ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, BOARD_HEIGHT * CELL); ctx.stroke();
    }
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(BOARD_WIDTH * CELL, y * CELL); ctx.stroke();
    }

    // 已固定的方塊
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        const v = this.board[r][c];
        if (v) this._drawCell(ctx, c, r, INDEX_COLOR[v], CELL);
      }
    }
  }

  _renderGhost() {
    if (!this.current) return;
    const ghostY = getGhostPosition(this.board, this.current.shape, this.cx, this.cy);
    if (ghostY === this.cy) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.2;
    this._renderShape(ctx, this.current.shape, this.cx, ghostY, INDEX_COLOR[this.current.colorIdx], CELL);
    ctx.restore();
  }

  _renderCurrent() {
    if (!this.current) return;
    this._renderShape(this.ctx, this.current.shape, this.cx, this.cy, INDEX_COLOR[this.current.colorIdx], CELL);
  }

  _renderNext() {
    const ctx = this.nextCtx;
    const w = this.nextCanvas.width;
    const h = this.nextCanvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!this.nextPiece) return;

    const shape = this.nextPiece.shape;
    const color = INDEX_COLOR[this.nextPiece.colorIdx];
    const offsetX = Math.floor((w / NEXT_CELL - shape[0].length) / 2);
    const offsetY = Math.floor((h / NEXT_CELL - shape.length) / 2);
    this._renderShape(ctx, shape, offsetX, offsetY, color, NEXT_CELL);
  }

  _renderShape(ctx, shape, x, y, color, cellSize) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) this._drawCell(ctx, x + c, y + r, color, cellSize);
      }
    }
  }

  _drawCell(ctx, col, row, color, cellSize) {
    const x = col * cellSize;
    const y = row * cellSize;
    const s = cellSize - 1;

    // 主色塊
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, s - 1, s - 1);

    // 高光（上、左邊緣）
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x + 1, y + 1, s - 1, 3);
    ctx.fillRect(x + 1, y + 1, 3, s - 1);

    // 陰影（下、右邊緣）
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 1, y + s - 2, s - 1, 3);
    ctx.fillRect(x + s - 2, y + 1, 3, s - 1);
  }

  /* ── 私有：速度更新 ───────────────────────────────────────────── */

  _updateDropInterval() {
    // 關卡速度 + 時間加速雙重影響
    const levelSpeed = Math.max(100, 1000 - (this.level - 1) * 80);
    this._dropInterval = Math.max(100, Math.min(levelSpeed, this._baseDropInterval));
  }

  /* ── 私有：HUD 更新 ───────────────────────────────────────────── */

  _updateHUD() {
    document.getElementById('score').textContent = this.score.toLocaleString();
    document.getElementById('level').textContent = this.level;
    document.getElementById('lines').textContent = this.totalLines;
  }

  /* ── 私有：覆蓋層 ────────────────────────────────────────────── */

  _showOverlay(title, message, btnText = '再玩一次') {
    document.getElementById('overlay-title').textContent = title;
    document.getElementById('overlay-message').textContent = message;
    document.getElementById('overlay-btn').textContent = btnText;
    document.getElementById('overlay').classList.add('visible');
  }

  _hideOverlay() {
    document.getElementById('overlay').classList.remove('visible');
  }
}

/* ─── 初始化 ────────────────────────────────────────────────────────────────── */

window.addEventListener('DOMContentLoaded', () => {
  const game = new TetrisGame(
    document.getElementById('board'),
    document.getElementById('next-piece'),
  );

  // 初始渲染空盤面
  game.board = createBoard();
  game.current = null;
  game.nextPiece = null;
  game._renderBoard();
});
