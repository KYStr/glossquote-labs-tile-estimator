# M2 正式來源候選

本文件描述建置與驗證邊界，不代表已部署或外部驗收完成。原功能對話負責 M2 來源發布；主代理負責獨立驗收、Cloudflare 與雙語首頁。

## 位元組與輸出

public/ 的 10 個 M1 功能檔保持原樣，由 config/preview-integrity.json 逐檔驗 bytes/SHA-256。production 只從複本改 HTML head，加入雙語 canonical/hreflang/x-default、index robots 與 JSON-LD；body、CSS、ES modules 不變。兩頁各含一份實際可見 FAQ 與 WebApplication JSON-LD，不提供評分、流量或施工保證。

dist-production/ 恰有 15 檔：M1 的 10 檔加 404.html、robots.txt、sitemap.xml、_headers、_redirects。後兩者是控制檔，不直接提供 HTTP。manifest 在 release/production-manifest.json，不在 assets 內，也不作部署資產。

## 正式路由與 SEO

canonical 與 sitemap 恰為：

- https://tiles.glossquote.com/index.html
- https://tiles.glossquote.com/en/index.html

兩頁互列 zh-Hant/en，x-default 指向繁中 index.html。Wrangler html_handling 依核准值保持 none，所以 production _redirects 明列 `/`→`/index.html`、`/en/`→`/en/index.html` 的同站 302，保留未改動 app 的語言目的路徑。這採用明確檔名的自指 canonical，取代 M0 的預定 slash canonical。見 [Cloudflare HTML routing](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/) 與 [static redirects](https://developers.cloudflare.com/workers/static-assets/redirects/)。

_headers 的共用 CSP 只包含本站兩份精確 JSON-LD 的 SHA-256 hashes 與 self，沒有 unsafe-inline/eval。兩份 hash 都由實際 UTF-8 data block 生成，無其他 inline script 許可。全域 noindex/nofollow 用於錯誤與非頁面資產；只有兩個正式 HTML 路徑明確 detach X-Robots-Tag，改由頁內 index/follow 生效，避免重疊規則合併出 index/noindex。404 文件本身亦有 noindex。重疊合併與 detach 會按 [Cloudflare headers 規則](https://developers.cloudflare.com/workers/static-assets/headers/) 檢查。Redirect 在 headers 前處理，local model 對 302 不套用 _headers。

robots 以 Disallow / 為基礎，較長 Allow 允許兩語、必要 JS/CSS、robots/sitemap 與兩個 alias；測試使用最長匹配、相同長度 Allow 優先及結尾錨點，沒有只檢查一行 Allow 字樣。禁止猜測頁、私有 source 與 404 的 crawl 許可。

## 工具鏈與界線

零 runtime/dev 外部依賴，Node24+、ESM 與 Node built-ins。必要命令見 README。build:production 與 check:production 會拒絕未知／缺失／過期檔、symlink/junction/hardlink、public pin 漂移、manifest 不符、metadata/CSP/robots 衝突。release:check 是確定性來源／資產 gate，不執行部署或瀏覽器。

5215 server 只綁 loopback，只提供閉合集合；GET/HEAD、Host、MIME、404、302 及安全 header 都有 CLI 檢查。這是嚴格本機模型，不是完整 Cloudflare edge 實作；例如模型對 query／非白名單路徑採 404，沒有驗證所有 edge 正規化行為。完整部署集合與 model 的可提供資產一致，控制檔不直接提供，未知路徑沒有 SPA fallback。

wrangler.jsonc 僅含核准的 static-only keys。沒有 main、runtime Worker、build hook、binding、secret、account ID、分析或 observability。既有官方 Wrangler 4.147.0 的 isolated-home dry-run 只驗設定／包裝，未讀 Cloudflare token，未部署；不需在來源專案安裝 Wrangler。

## 驗收狀態與人工排除

M1 已由主代理的 Windows 私有 station/desktop/job wrapper 驗原 HTTP 兩語；post-app pagehide 與主代理獨立 direct-CDP 真 BFCache 亦通過，沒有改產品來迎合 probe。這不是 production Browser Network/Storage 證據。

M2 的正式瀏覽器、實際 CDN header／redirect／robots、live domain、雙語首頁與外部版本完成確認由主代理後續驗。native Chinese IME、真實 AT／讀屏、原生 200% zoom、低階／手機真機與虛擬鍵盤保留 NOT_RUN；合成 composition、Storage API wrappers 保留 PARTIAL。空 Storage snapshots 不能證明沒有瞬時寫入。證據紀錄在工作區 .runs，未將這些歷史檔案冒充隨來源包附上。
