# 鋪材用量試算 原功能對話契約
只修改本工具 TASKS.md 允許路徑；不得改父專案、兄弟工具、共用首頁、看板或舊驗收包。證據只寫本工具 HANDOFF.md 及根 .runs/tile-estimator/自己新建的唯一子目錄。不得再委派或另開chat。原功能對話 requested gpt-6.1-sol/max，backend identity未獨立確認，不以自述作證。
主代理負責規格、獨立驗收、共用整合與hosting；你負責實作、原對話修正，以及獲M2放行後的公開GitHub來源。一次一個milestone，M1必要UI缺口如實交接，不可自己降低門檻或跳M2。每階段用final回報實際檔案、diff、命令exit/結果、未驗項與需決策問題，不輪詢等待。
所有本機browser/CUA/native UI automation暫停，包括hidden/IAB導航、填寫、點擊、按鍵、截圖、視窗切換。不得操作使用者焦點、鍵盤、IME、剪貼簿或原生對話框；不得在正在使用的桌面試驗隔離，不新裝/配置替代服務。僅背景檔案、CLI與loopback HTTP允許。UI標NOT_RUN_USER_FOCUS_INCIDENT；Node/離線DOM不是原路徑E2E。保留全部既有分頁與程序。
零runtime/dev外部依賴，Node24 ESM builtins，測試離線假資料；不npm install。所有使用者資料只在memory，無storage、telemetry、remote font、external API、URL內容或console輸入。不得讀帳戶憑證、browser profile、credential store、token環境或其他repo。Cloudflare exact-file例外只給主代理部署，你不可調用。
持久User/Machine環境、PATH、TEMP/TMP、registry、services、pagefile、BCD都是保護狀態；不得setx、SetEnvironmentVariable持久寫入或把temp/cache/workspace加PATH。只可process-local環境或完整執行檔路徑。長測試前後執行既有環境guard，比對HKCU/HKLM PATH hash/type/length/ephemeral count及完整Environment fingerprint；未知漂移停止，不猜還原。若獲另案授權dotnet且暫時CLI_HOME，首次前process-local DOTNET_ADD_GLOBAL_TOOLS_TO_PATH=0。PS7不得傳不相容PSModulePath給Windows PowerShell5.1。
Git不得破壞現有變更，禁止global/system config寫入、gh auth setup-git/login/refresh、登入設定、憑證讀取或debugtrace；M2用審核copy與per-command git -c，發布前後Git settings guard。缺認證/權限即回報，不自行改設定。發布只限KYStr/glossquote-labs-tile-estimator。不得Cloudflare部署、付費、擴權、改040141.xyz或GlossGate。詳docs/GIT-PUBLICATION-SAFETY.md。
服務只127.0.0.1:4215；衝突不殺別人程序。僅可終止已識別且本任務新啟動的可拋棄測試程序。未知規格衝突/共享路徑衝突/必要新權限或依賴/同錯兩輪無新證據時停止回報。
本次M1允許package.json/.gitignore/public/**/scripts/**/test/**或tests/**/dist/**及HANDOFF.md/TASK-ENTRY.md/project.json的真實狀態。這是對TASKS細分路徑的安全實作擴充，可拆小模組、錯誤文案及工具鏈lib；不可改六份已核准規格、docs契約或AGENTS，不新增無關功能。M2未放行前不得wrangler/production/publication。
