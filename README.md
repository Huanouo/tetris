# 俄羅斯方塊 (Tetris)

採用 **TDD（測試驅動開發）** 建置，部署至 **GitHub Pages** 的純 HTML/CSS/JavaScript 俄羅斯方塊遊戲。

## 線上遊玩

部署後可至 `https://<your-username>.github.io/<repo-name>/` 遊玩。

## 專案結構

```
.
├── src/
│   ├── index.html      # 遊戲頁面
│   ├── styles.css      # 樣式
│   ├── tetris.js       # 核心遊戲邏輯（純函數，可測試）
│   └── game.js         # 遊戲控制器 + Canvas 渲染
├── tests/
│   └── tetris.test.js  # Jest 單元測試
├── .github/
│   └── workflows/
│       └── deploy.yml  # CI 測試 + 部署至 GitHub Pages
├── jest.config.js
└── package.json
```

## 開發流程（TDD）

```
撰寫測試 → 執行測試（失敗紅燈）→ 實作功能 → 執行測試（通過綠燈）→ 重構
```

核心邏輯全部在 `src/tetris.js` 以**純函數**實作，確保每個函數都可獨立測試，無副作用。

## 安裝與執行

```bash
# 安裝依賴
npm install

# 執行測試
npm test

# 監看模式
npm run test:watch

# 產生覆蓋率報告
npm run test:coverage
```

## 操作說明

| 按鍵 | 動作 |
|------|------|
| `←` `→` | 左右移動 |
| `↑` | 順時針旋轉（含 Wall Kick） |
| `↓` | 加速下落（+1 分） |
| `Space` | 硬下落（+2 分/格） |
| `P` | 暫停 / 繼續 |
| `Enter` | 開始 / 重新開始 |

## 計分規則

| 消除行數 | 基礎分數 | 說明 |
|---------|---------|------|
| 1 行 | 100 × 關卡 | Single |
| 2 行 | 300 × 關卡 | Double |
| 3 行 | 500 × 關卡 | Triple |
| 4 行 | 800 × 關卡 | Tetris！|

每消除 10 行升一關，下落速度加快。

## GitHub Actions CI/CD

推送到 `main` 分支時自動觸發：

1. **測試（test）**：執行 Jest 單元測試，產生覆蓋率報告
2. **部署（deploy）**：測試全部通過後，將 `src/` 目錄部署至 GitHub Pages

> Pull Request 只執行測試，不部署。

## 啟用 GitHub Pages

在 GitHub repo 設定中：**Settings → Pages → Source** 選擇 **GitHub Actions**。
