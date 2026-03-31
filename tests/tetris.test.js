'use strict';

const {
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
} = require('../src/tetris');

// ─── createBoard ─────────────────────────────────────────────────────────────

describe('createBoard', () => {
  test('用預設尺寸建立盤面（10×20）', () => {
    const board = createBoard();
    expect(board.length).toBe(BOARD_HEIGHT);
    expect(board[0].length).toBe(BOARD_WIDTH);
  });

  test('用自訂尺寸建立盤面', () => {
    const board = createBoard(6, 8);
    expect(board.length).toBe(8);
    expect(board[0].length).toBe(6);
  });

  test('初始盤面全為 0（空格）', () => {
    const board = createBoard();
    expect(board.every(row => row.every(cell => cell === 0))).toBe(true);
  });

  test('每列為獨立陣列（修改一列不影響其他列）', () => {
    const board = createBoard();
    board[0][0] = 1;
    expect(board[1][0]).toBe(0);
  });
});

// ─── rotatePiece ─────────────────────────────────────────────────────────────

describe('rotatePiece', () => {
  test('I 型方塊順時針旋轉 90°', () => {
    const shape = [[1, 1, 1, 1]];
    expect(rotatePiece(shape)).toEqual([[1], [1], [1], [1]]);
  });

  test('I 型方塊旋轉兩次回到原始水平方向', () => {
    const shape = [[1, 1, 1, 1]];
    expect(rotatePiece(rotatePiece(shape))).toEqual(shape);
  });

  test('T 型方塊旋轉 90°', () => {
    const shape = [[0, 1, 0], [1, 1, 1]];
    expect(rotatePiece(shape)).toEqual([[1, 0], [1, 1], [1, 0]]);
  });

  test('O 型方塊旋轉 4 次仍與原始相同', () => {
    const shape = [[1, 1], [1, 1]];
    let s = shape;
    for (let i = 0; i < 4; i++) s = rotatePiece(s);
    expect(s).toEqual(shape);
  });

  test('任意方塊旋轉 4 次回到原始', () => {
    PIECE_TYPES.forEach(type => {
      let s = TETROMINOES[type].shape;
      for (let i = 0; i < 4; i++) s = rotatePiece(s);
      expect(s).toEqual(TETROMINOES[type].shape);
    });
  });

  test('旋轉後欄數等於原始列數', () => {
    const shape = [[0, 1, 0], [1, 1, 1]]; // 2×3 → 3×2
    const rotated = rotatePiece(shape);
    expect(rotated.length).toBe(shape[0].length);
    expect(rotated[0].length).toBe(shape.length);
  });
});

// ─── isValidPosition ─────────────────────────────────────────────────────────

describe('isValidPosition', () => {
  test('盤面中央放置 O 型方塊為合法', () => {
    const board = createBoard();
    const shape = [[1, 1], [1, 1]];
    expect(isValidPosition(board, shape, 4, 0)).toBe(true);
  });

  test('超出左邊界時為非法', () => {
    const board = createBoard();
    expect(isValidPosition(board, [[1, 1]], -1, 0)).toBe(false);
  });

  test('超出右邊界時為非法', () => {
    const board = createBoard();
    expect(isValidPosition(board, [[1, 1]], 9, 0)).toBe(false);
  });

  test('超出底部邊界時為非法', () => {
    const board = createBoard();
    // 2 列高的方塊放在最後一列 (y=19)，第二列 y=20 超出邊界
    expect(isValidPosition(board, [[1], [1]], 0, 19)).toBe(false);
  });

  test('位置與已放置方塊重疊時為非法', () => {
    const board = createBoard();
    board[19][0] = 1;
    board[19][1] = 1;
    expect(isValidPosition(board, [[1, 1]], 0, 19)).toBe(false);
  });

  test('Y 座標為負值（頂部上方）的格子為合法（生成緩衝區）', () => {
    const board = createBoard();
    expect(isValidPosition(board, [[1, 1, 1, 1]], 3, -1)).toBe(true);
  });

  test('空格（shape 值為 0）不參與碰撞判斷', () => {
    const board = createBoard();
    board[0][0] = 1; // 左上角有方塊
    const shape = [[0, 1]]; // 左格為空
    expect(isValidPosition(board, shape, 0, 0)).toBe(true);
  });
});

// ─── placePiece ──────────────────────────────────────────────────────────────

describe('placePiece', () => {
  test('正確將方塊寫入盤面', () => {
    const board = createBoard(5, 5);
    const newBoard = placePiece(board, [[1, 1], [1, 1]], 1, 1);
    expect(newBoard[1][1]).toBe(1);
    expect(newBoard[1][2]).toBe(1);
    expect(newBoard[2][1]).toBe(1);
    expect(newBoard[2][2]).toBe(1);
  });

  test('不修改原始盤面（純函數）', () => {
    const board = createBoard(5, 5);
    placePiece(board, [[1, 1]], 0, 0);
    expect(board[0][0]).toBe(0);
  });

  test('支援自訂填入值', () => {
    const board = createBoard(5, 5);
    const newBoard = placePiece(board, [[1]], 2, 2, 7);
    expect(newBoard[2][2]).toBe(7);
  });

  test('形狀中的 0 不會覆蓋盤面', () => {
    const board = createBoard(5, 5);
    const newBoard = placePiece(board, [[0, 1, 0], [1, 1, 1]], 1, 1);
    expect(newBoard[1][1]).toBe(0); // 對應 shape[0][0] = 0
    expect(newBoard[1][2]).toBe(1); // 對應 shape[0][1] = 1
  });

  test('方塊超出頂部邊界的部分不會錯誤寫入', () => {
    const board = createBoard(5, 5);
    // y = -1，方塊的第一列應被忽略
    const newBoard = placePiece(board, [[1, 1], [1, 1]], 0, -1);
    expect(newBoard[0][0]).toBe(1);
    expect(newBoard[0][1]).toBe(1);
  });
});

// ─── clearLines ──────────────────────────────────────────────────────────────

describe('clearLines', () => {
  test('盤面無滿行時不消除任何行', () => {
    const board = createBoard(5, 3);
    const { board: newBoard, linesCleared } = clearLines(board);
    expect(linesCleared).toBe(0);
    expect(newBoard.length).toBe(3);
  });

  test('消除一行滿格的列', () => {
    const board = createBoard(5, 3);
    board[2] = [1, 1, 1, 1, 1];
    const { board: newBoard, linesCleared } = clearLines(board);
    expect(linesCleared).toBe(1);
    expect(newBoard.length).toBe(3);
    expect(newBoard[2]).toEqual([0, 0, 0, 0, 0]);
  });

  test('消除多行滿格的列', () => {
    const board = createBoard(5, 4);
    board[2] = [1, 1, 1, 1, 1];
    board[3] = [1, 1, 1, 1, 1];
    const { linesCleared } = clearLines(board);
    expect(linesCleared).toBe(2);
  });

  test('消除後，上方剩餘行向下移動', () => {
    const board = createBoard(5, 4);
    board[1] = [1, 1, 0, 0, 0]; // 部分行（保留）
    board[3] = [1, 1, 1, 1, 1]; // 滿行（消除）
    const { board: newBoard } = clearLines(board);
    expect(newBoard[2]).toEqual([1, 1, 0, 0, 0]); // 原列 1 下移到列 2
    expect(newBoard[3]).toEqual([0, 0, 0, 0, 0]); // 底部是空列
  });

  test('消除後補入的空列位於頂端', () => {
    const board = createBoard(5, 4);
    board[3] = [1, 1, 1, 1, 1];
    const { board: newBoard } = clearLines(board);
    expect(newBoard[0]).toEqual([0, 0, 0, 0, 0]);
  });
});

// ─── isGameOver ──────────────────────────────────────────────────────────────

describe('isGameOver', () => {
  test('盤面有空間時遊戲未結束', () => {
    const board = createBoard();
    expect(isGameOver(board, [[1, 1, 1, 1]], 3)).toBe(false);
  });

  test('頂端被佔滿時遊戲結束', () => {
    const board = createBoard();
    board[0] = Array(BOARD_WIDTH).fill(1);
    expect(isGameOver(board, [[1, 1]], 0, 0)).toBe(true);
  });

  test('預設 y=0 發生碰撞時遊戲結束', () => {
    const board = createBoard();
    board[0][4] = 1;
    board[0][5] = 1;
    expect(isGameOver(board, [[1, 1]], 4)).toBe(true);
  });
});

// ─── calculateScore ──────────────────────────────────────────────────────────

describe('calculateScore', () => {
  test('沒有消除任何行得 0 分', () => {
    expect(calculateScore(0)).toBe(0);
  });

  test('第 1 關消除 1 行得 100 分', () => {
    expect(calculateScore(1, 1)).toBe(100);
  });

  test('第 1 關消除 2 行得 300 分', () => {
    expect(calculateScore(2, 1)).toBe(300);
  });

  test('第 1 關消除 3 行得 500 分', () => {
    expect(calculateScore(3, 1)).toBe(500);
  });

  test('第 1 關消除 4 行（俄羅斯方塊）得 800 分', () => {
    expect(calculateScore(4, 1)).toBe(800);
  });

  test('分數乘以當前關卡數', () => {
    expect(calculateScore(1, 3)).toBe(300);
    expect(calculateScore(4, 2)).toBe(1600);
  });

  test('預設關卡為 1', () => {
    expect(calculateScore(1)).toBe(100);
  });
});

// ─── getSpawnPosition ────────────────────────────────────────────────────────

describe('getSpawnPosition', () => {
  test('I 型方塊（寬 4）生成在水平置中位置', () => {
    const board = createBoard();
    const { x, y } = getSpawnPosition(board, [[1, 1, 1, 1]]);
    expect(x).toBe(3); // (10 - 4) / 2 = 3
    expect(y).toBe(0);
  });

  test('O 型方塊（寬 2）生成在水平置中位置', () => {
    const board = createBoard();
    const { x } = getSpawnPosition(board, [[1, 1], [1, 1]]);
    expect(x).toBe(4); // (10 - 2) / 2 = 4
  });

  test('T 型方塊（寬 3）生成在水平置中位置', () => {
    const board = createBoard();
    const { x } = getSpawnPosition(board, [[0, 1, 0], [1, 1, 1]]);
    expect(x).toBe(3); // (10 - 3) / 2 = 3 (floor)
  });
});

// ─── getGhostPosition ────────────────────────────────────────────────────────

describe('getGhostPosition', () => {
  test('空盤面上方塊落至底部', () => {
    const board = createBoard();
    const ghostY = getGhostPosition(board, [[1, 1, 1, 1]], 3, 0);
    expect(ghostY).toBe(BOARD_HEIGHT - 1); // 19
  });

  test('盤面有障礙物時鬼影停在障礙上方', () => {
    const board = createBoard();
    board[10][3] = 1;
    board[10][4] = 1;
    const ghostY = getGhostPosition(board, [[1, 1]], 3, 0);
    expect(ghostY).toBe(9);
  });

  test('方塊已在底部時鬼影 Y 與方塊相同', () => {
    const board = createBoard();
    const ghostY = getGhostPosition(board, [[1]], 0, 19);
    expect(ghostY).toBe(19);
  });
});

// ─── TETROMINOES / PIECE_TYPES ───────────────────────────────────────────────

describe('TETROMINOES', () => {
  test('定義了所有 7 種方塊', () => {
    expect(PIECE_TYPES).toHaveLength(7);
    ['I', 'O', 'T', 'S', 'Z', 'J', 'L'].forEach(type => {
      expect(PIECE_TYPES).toContain(type);
    });
  });

  test('每種方塊都有 shape 和 color', () => {
    PIECE_TYPES.forEach(type => {
      expect(TETROMINOES[type].shape).toBeDefined();
      expect(TETROMINOES[type].color).toBeDefined();
    });
  });

  test('I 型方塊形狀正確', () => {
    expect(TETROMINOES.I.shape).toEqual([[1, 1, 1, 1]]);
  });

  test('O 型方塊形狀正確', () => {
    expect(TETROMINOES.O.shape).toEqual([[1, 1], [1, 1]]);
  });

  test('T 型方塊形狀正確', () => {
    expect(TETROMINOES.T.shape).toEqual([[0, 1, 0], [1, 1, 1]]);
  });

  test('每種方塊 color 為有效的 CSS 顏色字串（以 # 開頭）', () => {
    PIECE_TYPES.forEach(type => {
      expect(TETROMINOES[type].color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});
