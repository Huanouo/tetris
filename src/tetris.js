'use strict';

(function() {
// ─── 常數 ────────────────────────────────────────────────────────────────────

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

const TETROMINOES = {
  I: { shape: [[1, 1, 1, 1]], color: '#00f0f0' },
  O: { shape: [[1, 1], [1, 1]], color: '#f0f000' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#a000f0' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#00f000' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#f00000' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#0000f0' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#f0a000' },
};

const PIECE_TYPES = Object.keys(TETROMINOES);

// ─── 盤面操作 ─────────────────────────────────────────────────────────────────

/**
 * 建立空盤面（2D 陣列，0 代表空格）
 * @param {number} width
 * @param {number} height
 * @returns {number[][]}
 */
function createBoard(width = BOARD_WIDTH, height = BOARD_HEIGHT) {
  return Array.from({ length: height }, () => Array(width).fill(0));
}

/**
 * 順時針旋轉方塊形狀
 * @param {number[][]} shape
 * @returns {number[][]}
 */
function rotatePiece(shape) {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rotated[c][rows - 1 - r] = shape[r][c];
    }
  }
  return rotated;
}

/**
 * 檢查方塊在指定位置是否合法（不超界、不碰撞）
 * @param {number[][]} board
 * @param {number[][]} shape
 * @param {number} x  左上角欄
 * @param {number} y  左上角列
 * @returns {boolean}
 */
function isValidPosition(board, shape, x, y) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = x + c;
      const ny = y + r;
      if (nx < 0 || nx >= board[0].length) return false;
      if (ny >= board.length) return false;
      if (ny >= 0 && board[ny][nx] !== 0) return false;
    }
  }
  return true;
}

/**
 * 將方塊固定到盤面，回傳新盤面（不修改原盤面）
 * @param {number[][]} board
 * @param {number[][]} shape
 * @param {number} x
 * @param {number} y
 * @param {number} value  填入的數值（預設 1，可用顏色索引）
 * @returns {number[][]}
 */
function placePiece(board, shape, x, y, value = 1) {
  const newBoard = board.map(row => [...row]);
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = x + c;
      const ny = y + r;
      if (ny >= 0 && ny < newBoard.length && nx >= 0 && nx < newBoard[0].length) {
        newBoard[ny][nx] = value;
      }
    }
  }
  return newBoard;
}

/**
 * 消除已填滿的列，並補入空列於頂端，回傳新盤面與消除行數
 * @param {number[][]} board
 * @returns {{ board: number[][], linesCleared: number }}
 */
function clearLines(board) {
  const remaining = board.filter(row => row.some(cell => cell === 0));
  const linesCleared = board.length - remaining.length;
  const emptyRows = Array.from(
    { length: linesCleared },
    () => Array(board[0].length).fill(0)
  );
  return { board: [...emptyRows, ...remaining], linesCleared };
}

/**
 * 判斷遊戲是否結束（新方塊無法在生成位置放置）
 * @param {number[][]} board
 * @param {number[][]} shape
 * @param {number} x
 * @param {number} [y=0]
 * @returns {boolean}
 */
function isGameOver(board, shape, x, y = 0) {
  return !isValidPosition(board, shape, x, y);
}

/**
 * 計算得分（參考標準俄羅斯方塊計分）
 * @param {number} linesCleared  本次消除行數
 * @param {number} [level=1]     當前關卡
 * @returns {number}
 */
function calculateScore(linesCleared, level = 1) {
  const base = [0, 100, 300, 500, 800];
  return (base[linesCleared] ?? 0) * level;
}

/**
 * 計算方塊生成位置（水平置中）
 * @param {number[][]} board
 * @param {number[][]} shape
 * @returns {{ x: number, y: number }}
 */
function getSpawnPosition(board, shape) {
  const x = Math.floor((board[0].length - shape[0].length) / 2);
  return { x, y: 0 };
}

/**
 * 計算鬼影方塊（Ghost Piece）的 Y 座標
 * @param {number[][]} board
 * @param {number[][]} shape
 * @param {number} x
 * @param {number} y
 * @returns {number}
 */
function getGhostPosition(board, shape, x, y) {
  let ghostY = y;
  while (isValidPosition(board, shape, x, ghostY + 1)) {
    ghostY++;
  }
  return ghostY;
}

// ─── 匯出（Node.js 測試 / 瀏覽器） ───────────────────────────────────────────

const TetrisCore = {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  TETROMINOES,
  PIECE_TYPES,
  createBoard,
  rotatePiece,
  isValidPosition,
  placePiece,
  clearLines,
  isGameOver,
  calculateScore,
  getSpawnPosition,
  getGhostPosition,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TetrisCore;
} else if (typeof window !== 'undefined') {
  window.TetrisCore = TetrisCore;
}
})();
