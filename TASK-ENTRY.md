# B19-35-M2

2026-10-19 M2 GO：主代理已驗隔離原 HTTP 的 48 PASS、R1 兩語 post-app pagehide 2 PASS，以及 full Chrome direct-CDP 兩語真 persisted=true 的初始資料重設；人工／PARTIAL 排除保留。本輪只完成正式來源候選及公開 GitHub 發布，禁止部署、首頁與自行操作瀏覽器。

M2 本機候選：public/ 10 檔位元組未變；新增 production toolchain、exact static-only wrangler.jsonc、雙語 metadata/visible JSON-LD/CSP hashes、15 檔部署集合與 assets 外 manifest、明確 slash alias 302、404 noindex、robots 最長匹配與對應 13 項新測試。npm test 66/66 PASS；check/build/build:production/check:production/release:check 全 exit 0；5215 HTTP 48 項 PASS；既有 Wrangler 4.147.0 isolated-home dry-run exit 0，1702 份 CLI runtime 檔前後指紋一致，未讀憑證或部署。

M2 實作來源清單 SHA-256：a96bdd4ee3cc332d940c60ae2264626937eb23f1484153549621cdd465ecad15。正式 manifest SHA-256：998e455046c044c7211452d3db552d836db70aede9f6f9b00d1f7fee02afae81。來源公開與 ZIP 目前待本輪 guarded publishing copy，最後真實 remote commit/visibility/ZIP 記於 HANDOFF，不把本機來源準備當已發布。

Production Browser Network/Storage 待主代理；native IME、真實 AT、原生 zoom、低階／手機真機、虛擬鍵盤仍 NOT_RUN，合成 composition／Storage wrappers 仍 PARTIAL。外部版本未完成。requested gpt-6.1-sol/max；backend identity 未獨立確認。

以下保留 M1 歷史記錄，當時的「UI 未放行」已由上述主代理 M2 GO 在指定範圍內更新。
目標：依完整規格完成雙語本機MVP、確定性核心、錯誤/清除/生命周期、離線test/check/build及loopback HTTP。

2026-10-19 實際狀態：W19-35-R1 M1 CLI candidate，B1 已修正，等待主代理審查。T00 骨架與 T01 精確核心已通過 CLI；T02–T04 雙語工作表、狀態生命週期與靜態限制已實作，純函式／靜態測試通過；T05 背景候選交接已備妥。Node v24.14.0；npm test 53/53 PASS（無 skip）、npm run check exit 0、npm run build exit 0；127.0.0.1:4215 CLI HTTP 42 項 PASS。10 個 preview 靜態檔皆在白名單，兩語 noindex,nofollow，dist 與 public bytes 相同。前後 Windows Environment guard PASS 且指紋一致；19 份鎖定契約相對 R1 起點未變。

R1 修正：request/result 陣列先驗 type/prototype 與 own length descriptor，超過 20 列先拒絕，再進入完整 descriptors／密度／列驗證；denseArray 本身也加上長度防線。6 項新增回歸涵蓋 C33–C35：21 與 4294967295 length 的 ordinary sparse arrays、零 getter／enumeration、固定優先序、20+20 合法與最後一列完整 schema。僅修改三個核心模組、兩個測試、三個對應 dist 檔與三份狀態文件。

固定實作來源清單 SHA-256：ce30daabd509d3919d45dba29ce20f5802dedf9d55f375c9835535a63cd68f68。R1 證據僅根 .runs/tile-estimator/m1-r1-20261019-01a1520d；初版 .runs/tile-estimator/m1-20261019-01a1520d 完整保留。相對初版的 TECHNICAL.md 與 ACCEPTANCE.md hash 差異是主代理在派發 R1 前追加資源界線與 C33–C35，不是本對話改規格或未授權漂移；新舊 hash 見 HANDOFF 與 authorized-spec-changes.json。

所有實際 UI（C29 DOM、C32、U01–U09）仍為 NOT_RUN_USER_FOCUS_INCIDENT；未操作任何 browser/CUA/native UI，Node state／靜態／HTTP 結果不代表 UI PASS。完整 M1 未放行，M2/M3 未開始，source 未發布、hosting 未部署、外部未驗。requested gpt-6.1-sol/max；backend identity 未獨立確認。
非目標：本輪不發布GitHub、不部署、不更新首頁、不新增依賴、不跑本機UI。
驗收：核心需求與獨立固定期望通過，工具鏈有效失敗，產物閉合且noindex，前後環境指紋一致，完整HANDOFF與候選hash。UI NOT_RUN_USER_FOCUS_INCIDENT仍阻止完整M1，不以CLI冒稱；達背景候選交接即回報，不無限等待。
後續有界目標：主代理M1驗收後M2由本原對話建立正式工具鏈及獨立PUBLIC GitHub；主代理M3部署/首頁；外部驗收修正仍回本對話。不得自行跳階。
