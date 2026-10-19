# 鋪材用量試算 交接

## B19-35-M2 正式來源候選與發布作業

2026-10-19：主代理 M2 GO 已收。M1 隔離原 HTTP 48 PASS、兩語 post-app pagehide 2 PASS、full Chromium direct-CDP 真 pageshow.persisted=true 及所有草稿／報告重設由主代理驗證。原始紀錄在工作區 .runs/browser-acceptance-2026-10-19/35-PRIMARY-M1.md 與 tool35-r1/tool35-r2/tool35-fullchrome-r2；未將外部歷史證據冒充隨包檔案。

本輪不操作任何瀏覽器、不部署、不改首頁。public/ 原 10 檔維持 M1 R1 hash；M2 瀏覽器 Network/Storage 仍待主代理隔離 runner。native IME、真實 AT、原生 zoom、低階／手機真機、虛擬鍵盤仍 NOT_RUN；合成 composition／Storage wrappers 仍 PARTIAL。外部版本未完成。requested gpt-6.1-sol/max；backend identity 未獨立確認。

### M2 實際變更

- package.json 新增 build:production/check:production/preview:production/release:check/verify:http:production；既有 preview 命令及零依賴保留。
- .gitignore 排除 dist-production、release 生成 manifest 及 .wrangler cache。
- wrangler.jsonc 僅含主代理指定的 name/date、workers_dev/preview_urls/send_metrics false、單一 custom domain、完整 disabled observability，以及 assets directory/run_worker_first false/html_handling none/not_found_handling 404-page；無 Worker main、build hook、binding 或 secret。
- config/preview-integrity.json 固定 10 個 M1 public bytes/hash。
- scripts/lib/production.mjs 與 build-production.mjs、check-production.mjs：封閉 15 檔建置、pin、canonical/hreflang、可見 FAQ/WebApplication JSON-LD、兩份精確 CSP hash、robots 最長匹配、_headers overlap/detach、sitemap、404 與 manifest 一致性。
- scripts/serve-production.mjs／verify-production-http.mjs：5215 loopback 模型及 48 項 HTTP；不操作 browser 或 Cloudflare runtime。
- scripts/release-check.mjs：來源／產物發布 gate，明示未部署與 production browser 未驗。
- test/production.test.mjs 新增 13 項有意義回歸，包含真實可拋棄副本、negative gate、未知／stale／缺檔、hardlink/junction、pin 漂移、JSON-LD/CSP/robots/header 衝突。
- README、START-HERE、docs/M2-RELEASE.md、TASK-ENTRY、project.json 與本 HANDOFF 更新真實階段；其他核准規格／契約與產品功能未改。
- dist-production 生成 15 檔（13 個可供 HTTP、2 個 Cloudflare 控制檔）；release/production-manifest.json 在 assets 之外。preview dist 仍為 10 檔 noindex。

M0 預定的 slash canonical 已依 M2 明確檔名部署模式改成 /index.html、/en/index.html 的 self canonical。原 app 不改，production _redirects 的兩條同站 302 保留 `/` 與 `/en/` 語言目的路徑。_headers 全域 noindex 只在兩個正式 HTML detach，頁內 index/follow 生效，避免重疊合併矛盾。共用 CSP 精確允許本站兩份 JSON-LD hash；沒有其他 inline 能力。技術與官方來源見 docs/M2-RELEASE.md。

### M2 已執行命令

證據只在工作區 .runs/tile-estimator/m2-20261019-01a1520d；這些歷史 log 不包含於來源 archive。

| 命令 | exit／真實結果 | 證據檔 |
|---|---|---|
| npm test | 0，66/66、0 fail、0 skip | test.log、test-result.json |
| npm run check | 0，10 個 preview source assets、零依賴 | check.log |
| npm run build | 0，10 個 noindex preview assets | build.log |
| npm run build:production | 0，15 個閉合 assets，manifest 在外 | build-production.log |
| npm run check:production | 0，metadata/JSON-LD/CSP/header/robots 全通過 | check-production.log |
| npm run release:check | 0，不部署、不宣稱 production browser PASS | release-check.log |
| node scripts/verify-production-http.mjs | 0，5215 HTTP 48 項 | http-5215.log、http-5215-result.json |
| 既有 Wrangler 4.147.0 deploy --dry-run --autoconfig=false --install-skills=false | 0，未讀憑證、未部署；隔離 process home/temp/config，CLI 1702 檔前後一致 | wrangler-dry-run.log、wrangler-dry-run.json、dry-run.mjs |

Wrangler log 的 19 個掃描項實際為 15 個檔案與 4 個目錄；dry-run 後再次確認正式集合仍恰為 15 個 regular files。沒有 npm install 或 runtime/dev 依賴。HTTP 是嚴格本機靜態模型，未驗所有 edge query／正規化行為，詳見 M2-RELEASE；不能替代 production browser、CDN 與 live 測試。

### 固定候選與後續發布收據

- M2 實作清單（30 份 implementation/config 檔，不含狀態／文件）SHA-256：a96bdd4ee3cc332d940c60ae2264626937eb23f1484153549621cdd465ecad15。
- production-manifest SHA-256：998e455046c044c7211452d3db552d836db70aede9f6f9b00d1f7fee02afae81。
- M1 public pin 來源候選：ce30daabd509d3919d45dba29ce20f5802dedf9d55f375c9835535a63cd68f68；10 個 public 檔仍逐檔相同。
- 目標公開來源：https://github.com/KYStr/glossquote-labs-tile-estimator。
- 現階段：本機 candidate ready，guarded publishing copy、固定 commit 與 archive 收據待本輪後續填入。此欄不宣稱已發布、已上線或外部完成。

以下為 M1 歷史證據。當時的 UI 停止狀態已由本節所述主代理驗收與 M2 GO 更新；人工與 PARTIAL 排除保留。
2026-10-19：W19-35-R1 M1 CLI candidate，B1 已修正，等待主代理獨立審查。完整 M1 的 UI gate 未放行；M2/M3 未開始。requested gpt-6.1-sol/max，backend identity 未獨立確認；Node runtime v24.14.0。

## R1 目前候選：B1 陣列資源界線修正

問題：初版 denseArray 先取得全陣列 descriptors 並進行密度／複製，再由呼叫端拒絕超過 20 列；超長輸入的陣列元素工作量未在入口受限。主代理追加明確優先序後，本輪依新規格修正，沒有放寬 schema。

本輪實際修改：

- public/js/core/schema.mjs：新增 arrayLength，只驗 Array type/prototype 與單一 own length descriptor；denseArray 在取得 descriptors、keys 或複製元素前拒絕長度 >20。
- public/js/core/tile-estimator.mjs：依 installAreas、deductionAreas 順序在 denseArray 前預檢長度；超限立即回 row_count／對應陣列。原上限內的完整陣列結構、數量下限與逐列順序保留。
- public/js/core/report.mjs：每個 result 陣列先檢查 type/prototype/own length，再做密度與列驗證；超限回 invalid_result/result。
- test/tile-estimator.test.mjs：新增 4 項 C33/C35 測試，驗 21 與 4294967295 length、getter/descriptor 列舉呼叫皆 0、固定錯誤優先序、20+20 合法最大名稱、最後一列 unknown/getter/缺欄與 index accessor，以及上限內順序不變。
- test/report.test.mjs：新增 2 項 C34/C35 測試；雙語超長 result 陣列均拒絕，getter/列舉皆 0；合法 40 列／最大名稱完整輸出，最後一列 unknown/getter/缺欄/派生值竄改仍拒絕。
- dist/js/core/schema.mjs、dist/js/core/tile-estimator.mjs、dist/js/core/report.mjs：由 build 更新，bytes 與 public 對應檔相同；其他 7 個靜態產物未改。
- HANDOFF.md、TASK-ENTRY.md、project.json：回寫 R1 真實狀態與新來源 hash；初版紀錄保留如下。

回歸輸入均為 ordinary arrays；以測試內的反射方法 spy 確認超限陣列未被列舉，不使用輸入 Proxy 或時間門檻代替檢查。此修正界定陣列元素工作量；沒有宣稱任意巨大未知 own-key 物件或 Proxy 為常數時間。UI 程式未修改、未操作。

R1 證據目錄：工作區根 .runs/tile-estimator/m1-r1-20261019-01a1520d（未建立可攜包）。

| 命令／檢查 | exit 與實際結果 | 證據 |
|---|---|---|
| npm test（node --test） | 0，53/53 PASS、0 fail、0 skip；含新增 6 項 C33–C35 | r1-test.log、r1-test-result.json |
| npm run check | 0，10 個白名單 source assets、零依賴 | r1-check.log |
| npm run build | 0，10 個 noindex preview assets | r1-build.log |
| node scripts/verify-http.mjs | 0，127.0.0.1:4215 的 42 項 HTTP PASS；自行關閉任務 server | r1-http.log、r1-http-result.json |
| source/dist 固定清單核對 | 0，21 份實作來源、10 份產物；public/dist bytes 逐檔相同 | source-manifest.json、dist-manifest.json、candidate-summary.json |
| Windows Environment guard 前／後 | 0／0，PASS，HKCU/HKLM PATH 與完整 Environment-key 指紋不變 | environment-before.json、environment-after.json、environment-comparison.json |
| 契約與範圍核對 | 0，19 份鎖定契約相對 R1 起點未變 | contracts-verified.json、r1-scope-before-metadata.json |

測試中的 hardlink/junction 與 HTTP 使用前輪已確認必要的正常 sandbox 升權流程，沒有繞過拒絕、安裝、憑證讀取或持久環境修改。R1 必要 gate 無失敗或 skip。Guard 元資料為 HKCU ExpandString／834 字元／ephemeral 0、HKLM String／1227 字元／ephemeral 0；PATH hash、TEMP/TMP 與完整 key fingerprint 均與 R1 前置快照一致。

固定來源 hash 定義沿用初版：排序 source-manifest.json 的完整 UTF-8 bytes（path/bytes/sha256，LF 尾行），涵蓋 21 個實作檔，不含狀態文件與 dist；不是 Git commit。

- R1 source-manifest SHA-256：ce30daabd509d3919d45dba29ce20f5802dedf9d55f375c9835535a63cd68f68
- R1 dist-manifest SHA-256：05dd71760e779f91d78a54fabd8ad4d9d80f8b5b1f442e9021001d422e1fa780
- 被取代的初版 source-manifest SHA-256：08f148a894c662b86fb1563db6fa4caefcf23a2795dc103193b4728a90ccf44e；舊證據仍完整保留。

主代理在派發 R1 前追加 TECHNICAL 的資源優先序與 ACCEPTANCE 的 C33–C35；本對話僅讀取新增段落，未修改規格。兩項相對初版的已授權 hash 差異如下，亦記於 authorized-spec-changes.json。其餘 17 份契約與初版相同；這 19 份在本輪全程未再變更。

| 檔案 | 初版 SHA-256 | 主代理 R1 補充後 SHA-256 |
|---|---|---|
| TECHNICAL.md | 4c310f6a4403d2f9b83bb615655617c4152905a1c00698e0f14ea079352aff05 | 4d4298ada6e0b3cf5eb00caa1ed1b46025e7c0d08cc0b24c56c903f0db1070e6 |
| ACCEPTANCE.md | e272c5eb876350bbc4665747649b5d961dc646ccef9067cdc975b367c5b980a2 | 588362312883a2f22aa088f1b34abb6513e1e535f826d023fc7365a3c21adea8 |

UI 限制與風險不變：C29 DOM、C32、U01–U09 一律 NOT_RUN_USER_FOCUS_INCIDENT。純函式、反射 spy、靜態與 HTTP 不代表真實 UI PASS。完整 M1 與 M2 仍未放行；未 commit/push、未發布 source、未部署、未改首頁、外部未驗。requested gpt-6.1-sol/max，backend identity 未獨立確認。

## 初版 M1 歷史紀錄（已由 R1 候選取代）
交付限於本工具的本機候選。核心、雙語靜態工作表、頁內確認、草稿失效、唯讀報告與離頁重設均已實作；CLI 測試與 HTTP 檢查通過。GitHub 未發布、hosting 未部署、首頁未修改、外部驗收未跑。沒有 production build、Wrangler、憑證讀取、npm install、外部依賴或本機 UI 操作。

### 實際檔案與內容

以下 21 個檔案是本輪新增的固定實作來源；每檔 bytes 與 SHA-256 見 source-manifest.json：

- package.json：private ESM、Node >=24；test/check/build/dev，零 runtime/dev 外部依賴。
- .gitignore：忽略本工具 dist、node_modules 與 log。
- public/index.html、public/en/index.html：獨立繁中／英文頁，工作表、欄位提示、狀態、頁內 dialog、唯讀報告、模型、四組可見 FAQ、同語首頁連結、preview noindex、CSP、noscript、預設 disabled 與無 name 表單。
- public/styles/app.css：既有 family semantic tokens、平面工作表、48rem／75rem 斷點、手機單欄、44px 控制、雙層焦點與 reduced-motion。未做渲染驗收。
- public/js/core/schema.mjs：descriptor 安全檢查、密集陣列檢查、嚴格 ASCII 十進位解析、Unicode 名稱限制、BigInt 精確單位與公式、half-up 顯示。
- public/js/core/tile-estimator.mjs：封閉 request、固定驗證次序、全域 ID 唯一、正淨面積、完整結果 schema；失敗沒有 partial result 或原值回顯。
- public/js/core/report.mjs：封閉 result 驗證、從尺寸與假設重算所有派生值、雙語固定文字、JSON 名稱跳脫、U+2028/U+2029 顯示跳脫、LF 無尾端 LF；回傳 Unicode JS string。
- public/js/state.mjs：同步純狀態轉換，明確試算；任何編輯／增刪清結果；確認取消保留、確認接受與 reset 清資料。
- public/js/messages.mjs：固定雙語標籤、錯誤、狀態、確認文案。
- public/js/render.mjs：以 textContent/value 建立列與完整結果；核心空名稱由語言與位置補名，不寫回核心。
- public/js/app.mjs：第一個同步 submit listener 先 preventDefault；初始化最後才啟用、錯誤關聯與聚焦、輸入不改寫、組字不驗證不搶焦點、頁內確認、靜態路徑語言導航、pagehide 清理與 persisted pageshow 重設。
- scripts/lib/static.mjs：精確 10 檔白名單、拒絕連結／hardlink／未知檔／缺檔、局部靜態能力與模組引用檢查、雙語標記／selector／標籤參照、共用安全 header。
- scripts/check.mjs：驗 Node、package、白名單靜態契約與公開模組語法；失敗 exit 1。
- scripts/build.mjs：僅複製已檢查的 public 靜態檔至 dist；拒絕不安全目標與未知殘留輸出。
- scripts/serve.mjs：只綁 127.0.0.1:4215、只提供 public 白名單；GET/HEAD、精確 Host/MIME/路由，未知 404、其他 method 405、無 SPA fallback；不記請求內容。
- scripts/verify-http.mjs：自行建立並關閉本任務 loopback server，核對 42 項 HTTP，完全不開啟瀏覽器。
- test/tile-estimator.test.mjs：C01–C29 純核心案例、固定輸出、極小／最大值、20+20 列、嚴格語法、驗證次序、getter 0 次、輸入凍結、精確進位不變式。
- test/report.test.mjs：C19/C29 文字與 C30/C31 雙語逐字報告、竄改／未知欄位／getter／空洞拒絕、最大合法列數與名稱長度報告、Unicode 字串。
- test/state.test.mjs：初始／成功／錯誤、所有來源編輯失效、增刪、列上限、取消／確認、reset、原字串保留與雙語訊息同等性；只證明純狀態。
- test/static.test.mjs：頁面契約、selector／ARIA 參照、危險能力拒絕、可丟棄副本的 check/build 真實成功／失敗、hardlink／junction／缺檔／未知檔／stale 產物拒絕。

另修改本工具 HANDOFF.md、TASK-ENTRY.md、project.json 為真實 M1 狀態。dist/ 的 10 個生成檔分別對應 public/ 白名單，未新增其他資產。六份核准規格、AGENTS、全部 docs 契約與工具外的程式／首頁／看板皆未修改；19 份起始鎖定契約已按 hash 核對未變。

### 命令與來源證據

證據目錄是工作區根的 .runs/tile-estimator/m1-20261019-01a1520d。以下歷史證據未建立可攜包，故以純文字路徑記錄，不宣稱隨包附上。

| 階段／命令 | exit 與實際結果 | 證據檔 |
|---|---|---|
| node --version | 0，v24.14.0 | 初始工具輸出；final-gates.json、candidate-summary.json |
| T00 npm run check | 0，3 檔 scaffold-only | t00-check.log、t00-results.json |
| T00 npm run build | 0，3 檔 scaffold-only | t00-build.log、t00-results.json |
| T01 npm test（node --test）首輪 | 1，33/34；測試將本來的 0 改成 0，沒有真正竄改 | t01-test.log、t01-results.json |
| T01 npm test 修正後 | 0，34/34 | t01-test-corrected.log、t01-corrected-results.json |
| T02–T03 npm test／npm run check | 0／0，43/43，10 檔 source | t02-t03-test.log、t02-t03-check.log、t02-t03-results.json |
| 最終 npm test 首輪 | 1，46/47；sandbox 在 link 系統呼叫回 EPERM | final-test.log |
| 最終 npm test 經平台正常升權 | 0，47/47，0 fail、0 skip | final-test-link-permission.log |
| 最終 npm run check | 0，10 個白名單靜態檔、零依賴 | final-check.log |
| 最終 npm run build | 0，10 個 preview 靜態檔 | final-build.log |
| HTTP 首輪／診斷 | 1／1；sandbox 對 GET / 的 loopback request 回 EACCES | final-http.log、http-diagnostic.log |
| node scripts/verify-http.mjs 經平台正常升權 | 0，42 項 CLI HTTP PASS | final-http-verified.log |
| 固定來源／產物清單與 bytes 核對 | 0，21 份實作來源、10 份產物；public/dist bytes 逐檔相同 | source-manifest.json、dist-manifest.json、candidate-summary.json |
| Windows guard 前／後 | 0／0，PASS，兩個 Environment key 指紋與 PATH 元資料不變 | environment-before.json、environment-after.json、environment-comparison.json |

T00 在測試檔建立前沒有空跑 npm test。最終 test/check/build 都使用 Node 24.14.0 與已安裝 npm，沒有安裝套件。HTTP 使用本工具實際的 createPreviewServer，在 127.0.0.1:4215 核對兩語、全部資產、GET/HEAD、bytes、MIME、CSP/nosniff/no-referrer/noindex/no-store、未知／traversal／query 路由 404、method 405 及 Host 403。測試 server 在 finally 關閉；沒有殺既有程序，也沒有保留新增背景服務。

R0 的固定期望已逐欄核對：淨面積 12000000 mm²、單片 360000 mm²、基本 34、含備料 37、10 箱、購買 40、餘片 3、購買面積 14400000 mm²。C30 雙語全文與規格逐字符合。

### 固定候選與環境

來源 hash 定義：source-manifest.json 的完整 UTF-8 bytes（固定欄位 path/bytes/sha256、排序、LF 尾行）的 SHA-256；包含 package/.gitignore、public、scripts、test 共 21 檔，不包含會回寫的狀態文件或生成 dist。這不是 Git commit；本輪未 commit/push。

- source-manifest SHA-256：08f148a894c662b86fb1563db6fa4caefcf23a2795dc103193b4728a90ccf44e
- dist-manifest SHA-256：0fea8c98031204eac9a4332607f87dba2ddc39faddfadc491a43d4c634024c9e
- 鎖定規格 hash 與不變核對：initial-files.json、locked-contracts-verified.json；19/19 unchanged。

| Scope | PATH registry type | 長度 | ephemeral count | PATH SHA-256（前後一致） | Environment-key SHA-256（前後一致） |
|---|---|---|---|---|---|
| HKCU | ExpandString | 834 | 0 | 3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb | 3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a |
| HKLM | String | 1227 | 0 | 52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8 | a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82 |

完整 guard 還包含 TEMP/TMP 的型別／長度／hash 與 key value count（User 18、Machine 26）；前後一致。沒有持久 PATH、環境、registry、服務、pagefile、BCD 或 Git/auth 設定修改。M1 無 publication，Git publication guard 不適用；未宣稱跑過該 guard。

### 未驗、風險與界線

- C29 的實際 DOM、C32 與 U01–U09 一律 NOT_RUN_USER_FOCUS_INCIDENT；ui-not-run.json 明列。未使用任何 browser、hidden/IAB、CUA、導航、截圖、鍵盤、IME、剪貼簿或原生對話框。
- 真實焦點／鍵盤／讀屏、320px、200% 文字縮放、40 列手機排版、組字、dialog、語言導航、Network/Storage、已載入離線與 BFCache 均未操作驗證。Node 純狀態／靜態掃描／HTTP 不替代這些 gate，也不能宣稱完整 UI PASS 或完整 M1。
- 清除與增刪列使用同步狀態；取消保留草稿與結果。清除確認後原清除按鈕回到 disabled，焦點轉至初始第一欄；移除後若唯一鋪設列的移除按鈕 disabled，焦點轉該列第一欄。這是處理不可聚焦 disabled 控制的實作選擇，仍待 UI 驗收。
- 任何編輯都視為有工作，包括手動改回初始字串；再次清除仍需確認。輸入期間不規整數字或名稱；名稱只在提交到核心後依契約 trim。
- 靜態掃描是受限原始碼檢查，不是一般 HTML/JavaScript 安全證明。資料只在目前頁面記憶體；實際瀏覽器儲存／網路行為尚未驗。
- 報告上限使用合法 20+20 列、各 40 碼點名稱測試；沒有把不合法的超大竄改輸出當合法上限。report_too_large 是防禦分支，合法 schema 預期不會觸發。
- 本工具只做矩形總面積估算，不判斷扣除區的位置或重疊，不保證實際採購、切割、拼花或施工可用。需求頻率、真機與實務採購均未驗證。
- M2 仍需主代理 GO；本輪未建 production metadata/toolchain、未發布 GitHub。M3 的免費 Cloudflare、網域與雙語首頁整合由主代理持有。外部確認前不得標 complete。
## 包裝要求
原始證據保留；可攜包的相對link必須指向實際隨包檔案。未隨包的工作區歷史路徑用純文字明示，不用別份文件冒充bytes相同。
