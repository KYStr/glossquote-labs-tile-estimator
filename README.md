# 鋪材用量試算

狀態：M2 正式來源候選。M1 已由主代理以隔離原 HTTP 驗收放行，人工排除項仍保留；正式 hosting 與雙語首頁整合由主代理後續處理。這是來源候選，不代表已上線或外部驗收完成。規格中的 M0 標記表示需求契約的建立階段；實際狀態見 [HANDOFF](HANDOFF.md)。

## 使用者與工作

使用者已量好數個矩形地面或牆面，也知道磁磚或板材尺寸；他想扣除不鋪設的矩形面積，選一個可調整的備料比例，估算需要幾片與幾箱。這是面積試算，不是學校、廠商或施工單位的正式規則，也不會判斷形狀、拼花或切割方案。需求頻率仍是假設，尚未驗證。

## MVP

輸入最多 20 個鋪設矩形、最多 20 個扣除矩形、相同尺寸的磁磚或板材、每箱片數與備料百分比，以整數 mm² 精確計算面積、向上取整片數與整箱數，並顯示可手動選取的唯讀文字報告。

價值是把單位換算、扣除面積、備料與整箱餘量放在一個可檢查的結果中；它不保證實際採購數量足夠，也不提供工程或施工建議。

## 使用環境與資料界線

- 初始畫面有一列空白鋪設區；磁磚長寬空白，每箱 10 片，備料 10.0%。這些預設值可改，備料比例不是通用建議。
- 每個面積只依矩形長寬計算。扣除區不做幾何定位；使用者須自行避免扣除區互相重疊或超出鋪設區。
- 資料只在當前頁面記憶體中處理，不存檔、不放進網址、不送出網路、不做遙測。報告只在頁面內供手動選取；MVP 不呼叫剪貼簿、下載或檔案 API。
- 已載入的頁面可在離線時繼續計算；沒有服務工作者或離線快取承諾，重新載入仍可能需要網路。
- 初版繁體中文與英文為兩個獨立靜態頁面。手機可逐列填寫長表單；低階裝置只做有界的同步整數計算。
- 手機小數鍵盤可能使用不同小數符號。欄位只接受 ASCII 數字與句點；工具不會改寫輸入，錯誤時會明確說明預期格式。

## 範圍

MVP 包含面積、片數、整箱數、整箱多出的片數、雙語說明、欄位錯誤、清除與語言切換確認，以及頁面內唯讀報告。

不包含版面排磚、圖面、拼花、切割最佳化、施工或結構建議、價格、稅、安裝費、商用預裁貼紙套版、外部字型、上傳、持久保存、剪貼簿、下載或外部 API。

## 候選資料

- 工具名稱：鋪材用量試算 / Tile and Panel Usage Estimator
- slug：tile-estimator
- 候選網域：tiles.glossquote.com
- 開發預覽埠：4215
- production model 埠：5215
- 候選公開來源庫：KYStr/glossquote-labs-tile-estimator

正式資產的 canonical 為 `https://tiles.glossquote.com/index.html` 及 `https://tiles.glossquote.com/en/index.html`；根路徑與 `/en/` 用靜態 302 導向對應檔案。正式網域仍待主代理部署與 live 驗證。[獨立來源 repository](https://github.com/KYStr/glossquote-labs-tile-estimator) 與固定 commit 的實際發布紀錄見 HANDOFF。

## 本機檢查與建置

使用 Node.js 24+ 與既有 npm，不需 npm install，沒有 runtime/dev 外部依賴：

```text
npm test
npm run check
npm run build
npm run build:production
npm run check:production
npm run release:check
npm run verify:http:production
```

`npm run dev` 只提供 preview public/，綁 127.0.0.1:4215，保持 noindex。`npm run preview:production` 只提供本機正式靜態模型，綁 127.0.0.1:5215；這不是 Cloudflare runtime 或 browser gate。埠佔用時停止，不殺其他程序。

build 產生的 dist/、dist-production/ 與 release/ 不進來源版本；release/production-manifest.json 在實際 assets 目錄之外。正式集合恰有 15 個檔案，其中 _headers、_redirects 為 Cloudflare 控制檔，不直接供 HTTP。任何 public/ 位元組改變都會使 M1 pin 驗證失敗。

完整範圍、路由／CSP／robots 語意與未驗項見 [M2 發布說明](docs/M2-RELEASE.md)。正式 Browser Network/Storage、live domain 與首頁仍待主代理；native IME、真實 AT、原生 zoom、低階／手機真機與虛擬鍵盤未驗。不要把 CLI、CSS 放大或合成 composition 當作這些證據。

## 閱讀順序

1. [產品需求](PRODUCT.md)
2. [技術與純函式契約](TECHNICAL.md)
3. [介面與 SEO 文案](UX-SEO.md)
4. [驗收案例](ACCEPTANCE.md)
5. [里程碑工作](TASKS.md)
