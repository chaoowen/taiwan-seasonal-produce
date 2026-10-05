# 台灣當季蔬果

依「台灣時間的今天」顯示當季蔬菜、水果與**建議購買**品項，並附上農業部批發行情與挑選技巧。以 [Hozu](https://www.npmjs.com/package/create-hozu) 框架打造，部署在 **Cloudflare Workers**。除了「收藏」之外，所有功能**不需要 JavaScript** 即可運作。

## 功能

| 頁面 | 網址 | 說明 |
| ---- | ---- | ---- |
| 首頁 | `/` | 依台灣時間（Asia/Taipei）判斷當月：建議購買、當季蔬菜、當季水果 |
| 搜尋 | `/search?q=草莓` | 搜尋全部 59 種蔬果（不限當季），可用官方品名，例如「甘藍」找到高麗菜 |
| 我的收藏 | `/favorites` | 收藏的蔬果（不限當季），存在瀏覽器的 localStorage |
| 範本首頁 | `/demo` | `create-hozu` 產生的範本，保留對照用 |

| 首頁功能 | 說明 | 網址參數 |
| -------- | ---- | -------- |
| 建議購買 | 正值盛產期，**或**批發價比近 30 天便宜 10% 以上 | — |
| 切換月份 | 查看其他月份的產季（價格只提供本月） | `?month=1`–`12` |
| 篩選 | 全部／價格划算／盛產期，三個區塊同時套用 | `?show=all\|cheap\|peak` |

- 參數可以組合，例如 `/?month=1&show=peak`。超出範圍的值（例如 `?month=13`）會自動退回預設。
- **收藏**：每張卡片右上角的 ♡。只存在這台裝置的這個瀏覽器，多個分頁會同步；清除瀏覽資料、換裝置或無痕模式就不會保留。沒有 JavaScript 時不顯示收藏按鈕。
- **頁首**固定在最上方，導覽以底線標示目前頁面。

## 快速開始

需要 **Node.js 22.18 以上**（專案附有 `.nvmrc`）。

```bash
nvm use          # 切換到 .nvmrc 指定的 Node 22
npm install
npm run dev      # 開發伺服器：http://127.0.0.1:3000
```

> 若 `localhost:3000` 開到別的程式，請改用 `127.0.0.1:3000`。

### 常用指令

| 指令 | 用途 |
| ---- | ---- |
| `npm run dev` | 開發伺服器（含 Hozu DevTools，可在頁面上選取元素提出修改） |
| `npm run check` | 型別與 Hozu 規則檢查，提交前請先跑過 |
| `npm start` | 正式模式啟動（Node） |
| `npm run build` | 建置（Node） |
| `npm run snapshot:prices` | 抓農業部行情、產生價格快照 `.cache/price-snapshot.json` |
| `npm run build:worker` | 建置＋價格快照＋打包 Cloudflare Worker（`dist/worker/`） |
| `npm run preview:worker` | 在本機用 Cloudflare 執行環境（workerd）預覽：http://127.0.0.1:8787 |
| `npm run deploy` | 手動部署到 Cloudflare（需先 `npx wrangler login`） |

`/demo` 保留了 `create-hozu` 產生的範本首頁，方便對照。

## 專案結構

```
features/produce/
  catalog.ts       59 種蔬果資料：產季、盛產月、產地、挑選技巧
  market-names.ts  常見名稱 ↔ 農業部官方品名對照（高麗菜 = 甘藍）
  moa-client.ts    呼叫農業部 API、磁碟／記憶體快取
  market.ts        即時計算：各市場加權平均價、與近 30 天比較的漲跌
  prices.ts        價格來源：部署快照，或即時計算（全目錄算一次、快取 1 小時）
  season.ts        組合當月清單、推薦與篩選
  search.ts        全目錄搜尋、收藏頁用的全目錄卡片、產季文字
  taipei-date.ts   台灣日期、民國年格式
  model.ts         Hozu 資料格式與 query 定義
  views.ts         首頁、搜尋頁、收藏頁畫面
  components.ts    客戶端元件：收藏按鈕 ♡、收藏清單
  *.client.ts      上述元件在瀏覽器執行的程式
  favorites-store.ts  收藏的 localStorage 讀寫與同步
  icons.ts         SVG 圖示（Lucide）
app.ts             伺服器端 resolvers
app.css            色彩、字型、背景
routes.ts          網址與參數
hozu.config.ts     頁面設定
worker/
  index.ts         Cloudflare Worker 入口（載入價格快照）
  bundle-stub.ts   取代 @hozu/bundle（Worker 不需要執行期打包工具）
scripts/
  price-snapshot.ts   產生價格快照（農業部失敗時寫入「無價格」快照，不擋部署）
  build-worker.ts     以 esbuild＋Hozu 外掛打包 Worker
  worker-manifest.ts  校正 Worker 的建置紀錄雜湊（見下方「Hozu 元件與 Workers」）
wrangler.jsonc     Cloudflare 設定
.github/workflows/deploy.yml  自動部署
```

## 資料來源與推薦邏輯

價格來自農業部「[農產品交易行情](https://data.moa.gov.tw/)」開放資料（免金鑰），為**批發價**，零售價約為其 1.5–2 倍。推薦條件：**盛產期，或批發價比近 30 天便宜 10% 以上**。

價格有兩種來源，由 `features/produce/prices.ts` 決定：

| 環境 | 價格來源 | 更新頻率 |
| ---- | -------- | -------- |
| 本機 `npm run dev`／`npm start` | 即時呼叫農業部（逐日抓 30 天，蔬菜 N04／水果 N05），全目錄算一次後快取 1 小時 | 每小時 |
| Cloudflare Workers | 部署時產生的**價格快照**，打包進 Worker；頁面**不會**呼叫農業部 | 每天部署一次 |

- **本機第一次啟動較慢**：沒有快取時要抓 30 天資料（約 20 秒，上限 25 秒；逾時就先不顯示價格）。3 天前的資料會永久存在 `.cache/moa/`，之後重啟只要重抓最近 3 天。
- **農業部 API 失敗時**：本機只依產季推薦；部署時則寫入「無價格」快照，網站顯示「暫時無法取得行情」，**不會擋住部署**。
- **部署時的時限**：產生快照最多等 5 分鐘（網頁請求只等 25 秒）。GitHub Actions 的機器在美國，第一次沒有快取時要跨太平洋抓約 60 次；之後 `.cache/moa` 會被 Actions 快取保留，只需補抓最近幾天。

## 部署（Cloudflare Workers）

```mermaid
flowchart LR
    subgraph GA[GitHub Actions]
      T1([push 到 main]) --> B
      T2([每天 06:00 台灣時間]) --> B
      B[hozu check → hozu build<br/>→ 價格快照 → 打包 Worker] --> D[wrangler deploy]
    end
    D --> W[Cloudflare Workers<br/>頁面＋打包好的價格快照]
    S[(dist/public<br/>CSS、字型、圖片)] --> W
    V([訪客]) --> W
```

- **免費方案即可**：價格事先算好，每次請求在 workerd 實測平均約 1.2 ms（免費方案上限 10 ms CPU）。
- **自動部署**：`.github/workflows/deploy.yml` 在 push 到 `main`、每天 06:00（台灣時間）與手動觸發時部署。需要在 GitHub repo 設定兩個 secrets：
  - `CLOUDFLARE_API_TOKEN`：Cloudflare 後台 → My Profile → API Tokens → 用「Edit Cloudflare Workers」範本建立
  - `CLOUDFLARE_ACCOUNT_ID`：Cloudflare 後台 Workers 頁面右側
- **手動部署**：`npx wrangler login` 後執行 `npm run deploy`。
- **為什麼打包要自己做**：Worker 需要 Hozu 的 esbuild 外掛（`@hozu/transform/esbuild`）；workerd 沒有 `import.meta.url`，`scripts/build-worker.ts` 會替每個檔案填入它自己的路徑（元件和樣式靠它找到建置產物）。

### Hozu 元件與 Workers（暫時的校正）

Hozu 0.17 用 `sha256(String(render))` 當作 `ui.component` 的指紋，並納入建置紀錄的 `irHash`。打包會重排程式碼文字，所以只要專案用到 `ui.component`（或 `fn()`），Worker 啟動時就會出現 `The build manifest does not match this project`。頁面（views）是以結構比對，不受影響。

`scripts/worker-manifest.ts` 的處理方式：

1. 打包後在 Node 載入 Worker，讀出它的 IR 與雜湊
2. 用 `hozu inspect --json` 逐一比對每個 feature，**只允許元件層級的 `sourceHash` 不同**；任何其他差異都會讓建置失敗（代表建置真的過期）
3. 產生 `dist/worker/manifest.json`（只換掉 `irHash`），再打包一次

這個做法依賴 Hozu 內部的檢查程式碼；若 Hozu 改版導致找不到，建置會明確報錯。等 Hozu 修正後即可移除。

## 授權與素材

| 素材 | 授權 |
| ---- | ---- |
| 農業部農產品交易行情 | [政府資料開放授權條款](https://data.gov.tw/license) |
| Noto Sans TC／Noto Serif TC（Fontsource） | SIL Open Font License 1.1 |
| Lucide 圖示 | ISC |
| 背景圖 `assets/linen.jpg` | ⚠️ **來源授權未確認**，正式上線前請替換為有明確授權的素材 |

## 已知限制

- 產季與挑選技巧為一般年份的參考；實際價格會受天候（如颱風）影響。
- 線上版的價格每天更新一次（早上 6 點部署時），不是即時行情。
- 收藏只存在單一瀏覽器，無法跨裝置同步。
- 收藏頁會先輸出全部 59 張卡片再由瀏覽器篩選，HTML 較大（約 200 KB，傳輸時會壓縮）。
- 目錄收錄 59 種台灣常見蔬果，不在目錄中的品項搜尋不到。
- 區塊副標題為白字，在米白背景上對比度約 1.1:1，未達 WCAG AA。
