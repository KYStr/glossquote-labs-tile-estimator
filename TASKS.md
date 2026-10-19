# 任務與里程碑：tile-estimator

狀態：M0 規格，尚未實作。以下是後續原功能對話可執行的工作順序，不表示任何任務已開始或完成。一次只推進一個工作項；失敗或未驗證時不得勾選後續項。

## 固定工作界線

- 專案：tile-estimator；候選預覽 127.0.0.1:4215，production model 5215；候選正式網域 tiles.glossquote.com；候選公開 repository KYStr/glossquote-labs-tile-estimator。
- 範圍限此工具。Node.js 24+、ES modules、原生 HTML/CSS/瀏覽器 ESM 與 Node built-ins；runtime dependencies 為零。測試只用離線假資料。
- 資料只在記憶體，不使用儲存、URL 中的輸入、遙測、上傳或外部 API。不得加入 clipboard、download、file picker 或外部字型。
- 使用者仍在操作此電腦。所有本機 browser/CUA/native UI 操作，包括隱藏分頁、導航、截圖、OS 滑鼠鍵盤、剪貼簿與原生對話框都禁止。不得新裝替代工具或用 CLI 冒稱 UI 驗收通過。頁面交互必須標記 NOT_RUN_USER_FOCUS_INCIDENT，直到主代理確認真實隔離方案並授權相應驗收。
- 不修改共用首頁、其他工具、Windows 環境、全域 Git 設定或憑證。M2 source publication 須由原功能 chat 依主代理 GO 與共用發布保護流程辦理；本地 M1 不等於公開或部署。

## T00 — 建立可離線工作的專案骨架

前置：M0 規格完成並由主代理開派。

允許路徑：本專案的 package.json、scripts/serve.mjs、scripts/check.mjs、scripts/build.mjs、public/index.html、public/en/index.html、public/styles/app.css。不得在本步實作計算核心。

步驟：建立 private ESM package，engines 指定 Node >=24，runtime dependencies 留空；提供 npm test、npm run check、npm run build、npm run dev。dev server 只綁 127.0.0.1:4215 並只提供 public/。build 只將審核過的 public/ 複製到本專案 dist/。兩個語言入口有初始 disabled 狀態、無 JavaScript 說明及基本相同範圍文案。

驗收：node --version 確認主版本 24；npm run check、npm run build 成功，且 package manifest 沒有 runtime dependency。T00 不執行尚未建立測試檔的 npm test；測試命令從 T01 起使用。

完成條件：腳本是真正檢查與建置，不得以永遠成功的 stub 通過。回寫主代理管理的 HANDOFF 記錄為 scaffold-only；不可標成有功能。

## T01 — 精確純函式與報告 schema

前置：T00 通過。

允許路徑：public/js/core/tile-estimator.mjs、public/js/core/report.mjs、test/tile-estimator.test.mjs、test/report.test.mjs。

步驟：依 TECHNICAL.md 實作封閉 request/result/error schema、descriptor 安全檢查、strict ASCII 數字解析、BigInt 單位轉換、淨面積與整箱公式、half-up 顯示、雙語固定報告驗證。對 ACCEPTANCE.md C01–C31 中純函式案例建立 node:test；所有錯誤無 partial result、無輸入回顯。

驗收：node --test；至少覆蓋最小／最大尺寸、reserve=0/50、20+20 列、扣除相等與超過、前導零與 32 字元邊界、精度／語法錯誤、getter 不執行、unknown key 不回顯、凍結輸入不變、報告派生值重算。所有測試離線、只用假資料。

完成條件：公式和 fixture 逐欄吻合；不得以浮點運算決策、局部成功結果或鬆散 schema 換取測試通過。回寫純函式與測試範圍。

## T02 — 雙語工作表與可見狀態

前置：T01 通過。

允許路徑：public/index.html、public/en/index.html、public/styles/app.css、public/js/app.mjs、public/js/render.mjs。只可增加本任務必要的本專案 test/ 測試，不得修改共用文件。

步驟：建立桌面及手機工作表；新增／移除矩形；提供相同尺寸磁磚／板材、每箱片數與備料欄；以明確按鈕試算；顯示完整面積、片數、箱數與精確 mm²。錯誤使用固定雙語文案與欄位關聯；使用者文字只當文字；輸入事件即刻清除舊結果。數字欄不自動改寫草稿。

驗收：node --test、npm run check。可由靜態與單元檢查驗證語系檔、selector 與 state reducer；不以此宣稱 browser PASS。U01、U02、U05、U06 仍標 NOT_RUN_USER_FOCUS_INCIDENT。

完成條件：主要操作雙語一致；最大 40 區域仍能用單欄逐列編輯；無外部資源、hidden network、dangerous DOM injection。回寫 UI 交互實作與尚未驗收項。

## T03 — 清除、語言切換、離頁與唯讀報告生命週期

前置：T02 通過。

允許路徑：public/js/app.mjs、public/js/render.mjs、public/index.html、public/en/index.html、public/styles/app.css、public/js/core/report.mjs、test/*.test.mjs。

步驟：加入頁內確認；取消保留目前草稿和結果，確認清除回初始設定；語言切換只有確認後才導航且不攜帶內容。report 只顯示唯讀文字；不得新增複製／匯出。pagehide 清理 state 和報告，BFCache 返回建立初始狀態。所有交互同步，無 async 取消競態。

驗收：node --test、npm run check。測試報告 schema、LF 換行與 Unicode 字串規則、未知欄位和不一致 derived 欄位拒絕，以及確認狀態邏輯。實際頁面確認、焦點與 BFCache 項仍是 NOT_RUN_USER_FOCUS_INCIDENT。

完成條件：修改、清除、確認取消、確認接受、語言切換及離頁均不能展示過期結果；不得呼叫 Storage、URL、clipboard、Blob、file、network API。回寫生命週期範圍與未測項。

## T04 — SEO、無外部資源與靜態建置檢查

前置：T02、T03 通過。

允許路徑：public/index.html、public/en/index.html、public/styles/app.css、public/js/**、scripts/check.mjs、test/*.test.mjs。禁止修改工具外的首頁或共用發布文件。

步驟：依 UX-SEO.md 落實雙語 title、description、H1、FAQ、語言切換與 preview noindex；在 check 中檢查必要靜態標記、同源資源與禁止項。production canonical/hreflang/x-default 只有主代理確認候選網址及 M2 授權後才在 production 產物生成；preview 繼續 noindex。不得在規格階段添加虛構 FAQ schema 或索引宣稱。

驗收：npm run check、node --test、npm run build。可用靜態檢查驗證 source 與 dist/ 標記，不代表已上搜尋引擎或完成 SEO 爬蟲驗收。

完成條件：雙語文案彼此完整且不含流量、採購保證、施工建議等未證明宣稱；沒有外部 font/CDN/API。回寫 SEO 與建置檢查結果。

## T05 — 本機 CLI 候選交接（M1 範圍）

前置：T00–T04 全部成功；若工作樹檔案有變更，對受影響的既有 gate 重跑。

允許路徑：本專案 scripts/**、test/**、public/**、dist/** 與主代理管理的 HANDOFF 證據欄位。不得公開 GitHub、部署或操作瀏覽器。

驗收命令：node --version；node --test；npm run check；npm run build；再用純 CLI 驗證 build 輸出只含允許靜態檔、雙語檔案存在、preview noindex、沒有遠端資源引用。不能把 HTTP 靜態回應、DOM mock 或字串掃描稱為真實 UI 驗收。

完成條件：建立可交主代理審查的本機 candidate；逐項記錄命令與輸出來源。核心與建置可標明已執行的 CLI 結果；瀏覽器／真機交互固定為 NOT_RUN_USER_FOCUS_INCIDENT。除非主代理後續確認隔離 UI gate，M1 不得標成完整 UI PASS。回寫候選版本、source 狀態、已驗與 NOT_RUN 清單；不宣稱已發布或已部署。

## 後續閘門（由主代理持有）

- M2：只有主代理 GO 後，原功能 chat 才可進行 production toolchain 與公開 GitHub source repository；分別驗證 source commit、公開可見性及 production 產物。此階段不部署。缺少憑證能力時停止，不改系統 Git 設定。
- M3：Cloudflare 部署、domain/live 驗證及首頁 bilingual catalog 加入、建置與部署全部由主代理負責；只有 live tool 與首頁兩語驗證完成才可改公開狀態。
- 外部真機、瀏覽器隔離、實際施工／採購結果等未驗項要保留 NOT_RUN 或其明確限制；M1/M2/M3 不互相替代。
