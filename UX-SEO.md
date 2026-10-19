# 介面與 SEO：tile-estimator

狀態：M0 規格，尚未實作。介面模式是 Product App；重點是可逐列檢查的量測工作表，不是行銷首頁或通用儀表板。

## 使用者與訊息順序

使用者帶著量測結果來估算相同尺寸磁磚或板材的片數與箱數。主畫面先說明模型，再讓他逐列輸入鋪設區與扣除區，最後輸入單片尺寸與包裝假設並明確試算。結果放在輸入旁或其下方，保留每筆矩形與總和，讓使用者核對後再手動選取報告。

每個主要區塊附近都要提醒：面積估算不是排版、施工建議或採購保證；備料比例由使用者調整，不是通用建議。顯示數字須清楚區分基本片數、含備料估算片數、整箱購買片數及因整箱而多出的片數。

## 桌面線框

~~~text
┌──────────────────────────────────────────────────────────┐
│ Gloss Tools   鋪材用量試算                  English       │
├──────────────────────────────────────────────────────────┤
│ 鋪材用量試算                                              │
│ 磁磚／板材面積估算片數與整箱數，不是排版或施工建議。      │
│                                                          │
│ 鋪設區域  1–20                                            │
│ 名稱（選填）       長度（m）        寬度（m）             │
│ 區域 1             [           ]    [           ]         │
│                    [移除此區域]                           │
│ [+ 新增鋪設區]                                             │
│                                                          │
│ 扣除區域  0–20                                            │
│ 不鋪設的矩形面積；只相減面積，請自行避免重疊。            │
│ [+ 新增扣除區]                                             │
│                                                          │
│ 單片尺寸                                                │
│ 長度（cm） [       ]   寬度（cm） [       ]               │
│ 每箱片數 [10]       備料假設（%） [10.0]                  │
│ 10.0% 是可調假設，不是通用建議。                           │
│                                                          │
│                          [試算用量]                        │
│                                                          │
│ 結果（試算後才出現）                                       │
│ 鋪設總面積 / 扣除總面積 / 淨面積                          │
│ 基本片數 / 含備料估算 / 箱數 / 整箱餘片                    │
│ 唯讀報告                                                    │
│                                                          │
│ [清除]（有工作時先確認）   模型與限制（說明）               │
└──────────────────────────────────────────────────────────┘
~~~

## 手機 320 CSS px 線框

~~~text
┌───────────────────────┐
│ 鋪材用量試算   English │
├───────────────────────┤
│ 磁磚／板材面積估算。   │
│ 不是排版或施工建議。   │
│                       │
│ 鋪設區域 1 / 20        │
│ 名稱（選填）           │
│ [_______________]     │
│ 長度（m）              │
│ [_______________]     │
│ 寬度（m）              │
│ [_______________]     │
│ [移除此區域]           │
│ [+ 新增鋪設區]         │
│                       │
│ 扣除區域               │
│ [新增扣除區]           │
│                       │
│ 單片長度（cm）         │
│ [_______________]     │
│ 單片寬度（cm）         │
│ [_______________]     │
│ 每箱片數               │
│ [_______________]     │
│ 備料假設（%）          │
│ [_______________]     │
│                       │
│ [試算用量]             │
│                       │
│ 試算結果               │
│ 淨面積、片數、箱數…    │
│ 唯讀報告               │
└───────────────────────┘
~~~

手機把長度、寬度與名稱標籤放在各輸入上方，不縮小成不可讀的多欄表格。每列可在小螢幕完整檢視；頁面不需橫向捲動。計算操作在最後一組必填欄位附近，長表單可用瀏覽器一般捲動；不把主要按鈕固定在虛擬鍵盤後方。

## 控制、狀態與錯誤

- 每個輸入有常駐可見標籤與單位，placeholder 不代替標籤。數字欄使用文字輸入與 inputmode=decimal，避免瀏覽器以地區設定替換句點；保留草稿，不自動格式化。單片欄位使用「鋪材長度」及「鋪材寬度」，說明適用相同尺寸磁磚或板材。
- 中文名稱可使用 IME 輸入；組字期間不驗證、不改寫、不搶焦點。數字只接受 ASCII 語法，IME 若提交全形數字或全形句點，保留草稿並在試算時說明格式不支援，不代為轉換。
- 提示明列允許 ASCII 數字、句點、位數與範圍。手機鍵盤若輸出逗號，告知使用者以句點輸入；不得偷偷把逗號轉成小數點。
- 新增列後焦點移到新列第一欄。移除列後焦點移到下一列或上一列的移除按鈕；最末唯一鋪設列不能移除。新增按鈕達 20 列時禁用。
- 試算後修改任一輸入或列順序，結果即刻消失；狀態文字提示重新試算。無效輸入不保留先前成功結果。
- 初次提交依固定驗證順序顯示第一個錯誤、關聯錯誤欄位並聚焦該欄；修正後再次試算可收到下一個錯誤。錯誤使用文字，不只用顏色或圖示，不顯示原始例外或原值。
- 清除只有在表單離開初始狀態時可用。頁內確認文案列明「會清除所有區域、尺寸、假設與結果」。取消保留；確認回到一列空白鋪設區、鋪材尺寸空白、每箱 10、備料 10.0%、零扣除區。
- 有工作時切換語言同樣先確認，取消保留目前頁面與結果；確認後才清除並切換至另一個獨立語言頁。初始狀態切換語言不需確認。
- 報告是頁內唯讀多行文字，固定格式，使用者可用一般鍵盤選取。沒有複製、下載或檔案按鈕；不宣稱已複製。
- 結果及報告在面積數字旁同時說明精確 mm²；m² 以正值 half-up 顯示兩位小數。片數與箱數依精確值計算。極小面積可能顯示 0.00 m²，必須有可見的精度說明。
- 初始 fieldset 和工作按鈕 disabled；事件註冊完成後才啟用。若 JavaScript 初始化失敗，頁面提供不傳送輸入的不可用說明。

頁面清除確認使用頁內 accessible dialog：標題、效果說明、取消與確認兩個有文字的按鈕；初次開啟把焦點放在取消，Escape 等同取消，結束後將焦點還原到觸發按鈕。不得呼叫 OS 原生對話框。

## 視覺與可及性要求

- 使用家庭 semantic tokens、平面工作表、清晰分隔線；工具工作表是主要視覺，不堆疊卡片或行銷大字。
- 主要文字 15–17 px，輔助字至少 12 px。常用控制與觸控目標至少 44 × 44 CSS px；可辨識的控制邊界至少 3:1，普通文字至少 4.5:1。
- 所有功能支援鍵盤；順序為語言／說明、鋪設列、扣除列、單片與假設、試算、結果與清除。焦點有可見且不被遮住的雙層框線。
- 320 CSS px 與 200% 文字縮放不遺失欄位、錯誤、結果或操作；不得讓頁面出現雙向捲動。至少容忍 40% 較長翻譯文案。
- 動態錯誤與試算狀態使用合適的 aria-live/status 語意；同一次變更不重複打斷螢幕閱讀器。每個錯誤都用 aria-describedby 與欄位連結。
- 偏好減少動態效果時不做非必要動畫。驗收 UI 目前受焦點事故限制，規格和預期仍須保留，不能把尚未操作標為通過。

## 雙語 SEO 與固定文案

繁體中文頁面為預設根頁，HTML lang 固定為 zh-Hant；英文頁面在 /en/，HTML lang 固定為 en。候選正式網域為 https://tiles.glossquote.com；目前不得聲稱已持有或已發布。

### 繁體中文

- title：鋪材用量試算：估算磁磚／板材片數與整箱數｜Gloss Tools
- description：依矩形鋪設面積、扣除面積、相同尺寸磁磚或板材與可調備料假設，估算片數及整箱數。只做面積試算，不提供排版或施工建議。
- H1：鋪材用量試算
- 首屏說明：輸入矩形鋪設區與扣除區，估算相同尺寸磁磚或板材的片數及整箱數。備料比例是可調假設，不是通用建議。
- primary action：試算用量
- result heading：估算結果
- 空狀態：填入鋪設面積與單片尺寸後試算。
- preview robots：noindex,nofollow

### English

- title: Tile and Panel Usage Estimator: Estimate Pieces and Boxes | Gloss Tools
- description: Estimate same-size tile or panel and full-box counts from rectangular installed and deducted areas, dimensions, and an editable reserve assumption. Area estimate only; no layout or installation advice.
- H1: Tile and Panel Usage Estimator
- Intro: Enter rectangular areas to estimate same-size tile or panel and full-box counts. The reserve percentage is an editable assumption, not a universal recommendation.
- primary action: Calculate estimate
- result heading: Estimate
- empty state: Add an installed area and tile dimensions, then calculate.
- preview robots: noindex,nofollow

正式頁的預定 canonical 為繁中根路徑 https://tiles.glossquote.com/，英文 https://tiles.glossquote.com/en/；兩頁互列 hreflang zh-Hant、en 與 x-default 根路徑。只有主代理確認域名、M2 放行並核實部署後才生成正式 metadata。預覽一律 noindex,nofollow，不放 production canonical。不要以測試網域或 localhost 宣稱已索引。

不加虛構流量、排名、客戶數、節省金額、認證或相容性宣稱。不需要 FAQ schema；若未來加入結構化資料，只能逐字對應頁面實際可見 FAQ。

## FAQ（須在頁面上可見）

### 繁體中文

1. **這會算出精確採購數量嗎？** 不會。它只依總面積估算；沒有排版、切割或施工損耗模型，不能保證實際數量。
2. **預設 10% 備料是建議嗎？** 不是。它只是可編輯的初始假設，請按自己的情況決定；工具不提供通用比例。
3. **扣除區要標出位置嗎？** 不用，但工具只把扣除矩形的面積相加後相減，不判斷它們是否重疊或是否落在鋪設區內；請自行避免重複扣除。
4. **離線能用嗎？** 已載入頁面可繼續試算；離線重新載入沒有保證，因為工具沒有離線快取功能。

### English

1. **Does this give an exact purchase quantity?** No. It estimates from total area and does not model layout, cuts, or installation loss, so it cannot guarantee the amount you need.
2. **Is the default 10% reserve a recommendation?** No. It is an editable starting assumption, not a universal recommendation.
3. **Do deducted areas need positions?** No. The tool subtracts their summed areas and does not detect overlap or check whether they lie inside an installed area. Avoid subtracting the same space twice.
4. **Can I use it offline?** A page that is already loaded can calculate. Offline reload is not guaranteed because the tool does not provide offline caching.
