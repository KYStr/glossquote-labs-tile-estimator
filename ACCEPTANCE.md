# 驗收案例：tile-estimator

狀態：M0 規格案例，尚未執行。任何成功預期都不是產品測試通過證據。M1 使用 Node.js 24+、離線假資料與本機純 CLI 檢查；不讀個人資料或連外。

## 固定 fixture

主代理 M1 追加資源回歸（2026-10-19）：C33 分別用 length=21 與最大合法 array length 的 ordinary sparse array 置換 installAreas／deductionAreas，index 0 放 getter spy，預期 row_count/對應陣列且 getter=0；不等待 O(length) 迴圈。C34 在有效 result 中作相同兩種陣列替換，buildReport 兩語均 invalid_result/result 且 getter=0。C35 原有20+20合法矩形及最大名稱報告仍完整成功，最後一列 getter/未知欄/schema錯誤仍須拒絕。超限預檢順序遵守 TECHNICAL 新補充，其他上限內原 C01–C32 規則不變。

除案例另有覆寫外，R0 為以下完整 request：

~~~json
{
  "installAreas": [
    {
      "id": "area-1",
      "nameRaw": "",
      "lengthMetersRaw": "3",
      "widthMetersRaw": "4"
    }
  ],
  "deductionAreas": [],
  "tileLengthCmRaw": "60",
  "tileWidthCmRaw": "60",
  "boxPiecesRaw": "4",
  "reservePercentRaw": "10"
}
~~~

成功案例的精確輸出依 TECHNICAL.md 的封閉 result schema。面積欄以 mm² 字串驗算；m² 顯示只是正值 half-up 到兩位小數。以下「含備料」均是面積估算片數，不是每片最低分數或可施工保證。

## 純函式驗收

| ID | 對應 | 輸入與操作 | 精確預期 |
|---|---|---|---|
| C01 | FR-04–06 | R0 | install=12,000,000 mm²，deduction=0，net=12,000,000；tile=360,000；base=34；含備料=37；boxes=10；purchase=40；extra=3；purchasedArea=14,400,000 mm²。顯示總面積 12.00 m²，片面積 0.36 m²，購買面積 14.40 m²。 |
| C02 | FR-04–06 | R0 加扣除列 {id:"ded-1",nameRaw:"浴室",lengthMetersRaw:"1",widthMetersRaw:"2"} | deduction=2,000,000；net=10,000,000；base=28；含備料=31；boxes=8；purchase=32；extra=1；purchasedArea=11,520,000 mm²（11.52 m²）。 |
| C03 | FR-05–06 | R0，reservePercentRaw="0" | base=34；含備料=34；boxes=9；purchase=36；extra=2；purchasedArea=12,960,000 mm²。 |
| C04 | FR-05 | install 0.6m×0.6m；tile 60cm×60cm；reserve=0；box=3 | A=T=360,000 mm²；base=1；含備料=1；boxes=1；purchase=3；extra=2；purchasedArea=1,080,000 mm²。 |
| C05 | FR-05–06 | install 0.001m×1.001m；tile 0.1cm×100cm；reserve=0；box=1 | A=1,001 mm²，T=1,000 mm²；兩者顯示皆可能是 0.00 m²；base=2、含備料=2、boxes=2、purchase=2。不得用顯示值比較或算片數。 |
| C06 | FR-05 | install/tile 都是 0.6m×0.6m；reserve=10.1；box=2 | reserveTenths="101"；base=1；含備料=2；boxes=1；purchase=2；extra=0。 |
| C07 | FR-03–05 | install 0.001m×0.001m；tile 0.1cm×0.1cm；reserve=0；box=1 | 兩個面積都是 1 mm²；base=1；含備料=1；boxes=1；purchase=1。證明最小正輸入仍使用精確整數。 |
| C08 | FR-03, FR-05 | install 1000m×1000m；tile 1000cm×1000cm；reserve=0；box=1000 | A=1,000,000,000,000 mm²；T=100,000,000 mm²；base=10,000；含備料=10,000；boxes=10；purchase=10,000；extra=0。 |
| C09 | FR-03, FR-05 | 與 C08 相同，reserve=50 | reserveTenths="500"；含備料=15,000；boxes=15；purchase=15,000；extra=0；purchasedArea=1,500,000,000,000 mm²。 |
| C10 | FR-02, FR-04–05 | 鋪設列依序 3m×4m、1m×2m；無扣除；tile 60cm×60cm；reserve=0；box=4 | install/net=14,000,000 mm²；base=39；含備料=39；boxes=10；purchase=40；extra=1。列順序與兩列面積保持一致。 |
| C11 | FR-02, FR-04–05 | R0 加兩列扣除，各 1m×2m、不同 id；reserve=0 | install=12,000,000；deduction=4,000,000；net=8,000,000 mm²；base=23；含備料=23；boxes=6；purchase=24；extra=1；purchasedArea=8,640,000 mm²。 |
| C12 | FR-02, FR-04–05 | 用固定生成式建 20 筆 1m×1m 鋪設列及 20 筆 0.5m×0.5m 扣除列；id 分別為 area-01…area-20、ded-01…ded-20；tile=100cm×100cm，reserve=0，box=10 | install=20,000,000；deduction=5,000,000；net=15,000,000 mm²；base=15；含備料=15；boxes=2；purchase=20；extra=5。不得丟失或重排 40 列。 |
| C13 | FR-02 | installAreas=[]，其餘用 R0 | {ok:false,error:{code:"row_count",field:"installAreas"}}；沒有 partial result。 |
| C14 | FR-02 | 21 筆完整且 id 不重複的 1m×1m 鋪設列 | row_count / installAreas；不做部分加總。 |
| C15 | FR-02 | 21 筆完整且 id 不重複的 0.5m×0.5m 扣除列 | row_count / deductionAreas；不做部分加總。 |
| C16 | FR-04 | R0 加一筆 3m×4m 扣除區 | non_positive_net_area / deductionAreas；相等也拒絕。 |
| C17 | FR-04 | R0 加一筆 4m×4m 扣除區 | non_positive_net_area / deductionAreas；扣除超過鋪設總和時拒絕。 |
| C18 | FR-02, FR-07 | R0 的扣除列 id 也設為 area-1 | duplicate_id / deductionAreas.0.id；ID 在兩陣列之間也必須唯一。 |
| C19 | FR-02 | R0 的 nameRaw="   "；另測 nameRaw 為 "é".repeat(40) | 第一例核心結果 name=""，繁中 UI/report 依位置顯示「區域 1」、英文顯示「Area 1」；第二例核心名稱成功且恰為 40 個碼點。 |
| C20 | FR-02, FR-07 | R0 的 nameRaw="é".repeat(41)、含 U+000A、或 String.fromCharCode(0xD800) | 分別為 invalid_name / installAreas.0.nameRaw，invalid_unicode / installAreas.0.nameRaw，invalid_unicode / installAreas.0.nameRaw；不得改寫名稱。 |
| C21 | FR-03 | lengthMetersRaw=" \t1.25 "；再逐一輸入 "-1", "+1", "1e3", "1,000", "１", "Infinity", "1 0", ".5", "1." | 外側 ASCII 空白的 1.25 合法且換成 1250mm；其餘每例 invalid_number / installAreas.0.lengthMetersRaw；不得轉成 0、1 或其他數字。 |
| C22 | FR-03 | lengthMetersRaw="1.234"；再測 "1.2345"；tileLengthCmRaw="60.1"；再測 "60.12" | 前兩個公尺值分別接受與 precision_exceeded；兩個公分值分別接受與 precision_exceeded。 |
| C23 | FR-03 | lengthMetersRaw="0"、"1000"、"1000.001"；tileWidthCmRaw="1000"、"1000.1"；reservePercentRaw="0"、"50"、"50.1" | 0 長度 out_of_range；1000m 接受；1000.001m out_of_range；1000cm 接受；1000.1cm out_of_range；0% 與 50% 接受；50.1% out_of_range。 |
| C24 | FR-03 | boxPiecesRaw="1"、"1000"、"0"、"1001"、"1.0" | 1、1000 接受；0、1001 out_of_range；1.0 invalid_number。 |
| C25 | FR-03 | 長度欄 31 個 "0" 後接 "1"（共 32 code units）；再測 32 個 "0" 後接 "1"（共 33） | 32 字元值合法且等於 1；33 字元回 input_too_long。ASCII 外側空白可被忽略但仍計入 32 上限；內部空白拒絕。 |
| C26 | FR-07 | R0 加任意超長 unknown key，例如 "token_dump_user_secret_" + "x".repeat(1000)；另把未知欄設為會遞增計數器的 getter | unknown top-level 回 invalid_request / request；getter 呼叫次數為 0；錯誤序列化結果不包含 key、secret 或 raw 值。 |
| C27 | FR-07 | 分別傳 installAreas[0] 的 unknown key/accessor、缺少 lengthMetersRaw、頂層 symbol/非列舉欄、installAreas 空洞或額外屬性 | row unknown/accessor -> invalid_row / installAreas.0；缺欄 -> invalid_type / installAreas.0.lengthMetersRaw；root symbol/non-enumerable -> invalid_request / request；array hole/extra property -> invalid_rows / installAreas。row 結構錯優先於欄位缺漏。getter 為 0 次，錯誤不含攻擊者 key。 |
| C28 | FR-07 | 將 R0 物件、陣列與列凍結；前後 JSON.stringify 相同 | 成功結果同 C01；輸入深層值、屬性描述與陣列順序不變。 |
| C29 | FR-07, FR-08 | nameRaw="<img src=x onerror=alert(1)>"，其他用 R0 | 核心保留一般文字值；report 以 JSON 字串方式輸出。頁面預期只顯示文字，不生成 img、事件或 script。核心可自動驗文字；DOM 結果屬 UI NOT_RUN_USER_FOCUS_INCIDENT。 |
| C30 | FR-06, FR-08 | 對 C01 成功結果分別 buildReport(result,"zh-Hant") 與 buildReport(result,"en")；另改 result.totals.basePieces="35" | 兩語報告逐字符合 TECHNICAL.md 的固定範例、僅 LF、沒有尾端 LF；輸出為 Unicode JS string，非 byte stream；派生值不一致回 invalid_result / result，沒有文字結果。 |
| C31 | FR-07–08 | 在成功 result 加敏感 unknown key；或以 getter 替換 totals；或稀疏 installAreas；或改 display / exact totals 不一致 | 全部 invalid_result / result；getter 不執行，unknown key 不回顯。合法最大 row/name 長度組合生成的報告須小於 32,768 code units。不得聲稱一個受 schema 上限拒絕的 tampered 結果是合法超大報告測試。 |
| C32 | FR-08–10 | UI 完成 C01 後改長度、改備料、新增／移除列或切換語言 | 每項操作同步移除舊結果與報告；結果區告知需重新試算。此為頁面操作，狀態 NOT_RUN_USER_FOCUS_INCIDENT。 |

## 瀏覽器預期與目前狀態

以下是未來頁面驗收要求，不可由 node:test、DOM mock、靜態掃描或 HTTP request 冒充。依目前焦點事故限制，沒有可操作的隔離 UI 時一律記錄 NOT_RUN_USER_FOCUS_INCIDENT，不得使用本機瀏覽器、隱藏分頁、native app、OS 滑鼠鍵盤、剪貼簿或對話框來補測。

| ID | 對應 | 可重現步驟 | 預期 | 本規格撰寫時 |
|---|---|---|---|---|
| U01 | FR-02, FR-07 | 以鍵盤 Tab 至試算，空白表單提交 | 第一個缺少的鋪設長度欄有可見文字錯誤、aria-describedby 關聯與焦點；不出結果 | NOT_RUN_USER_FOCUS_INCIDENT |
| U02 | FR-08 | 以 R0 試算成功，改任一欄一字 | 舊數字與報告立即清空，不短暫顯示舊結果 | NOT_RUN_USER_FOCUS_INCIDENT |
| U03 | FR-09 | 改輸入後清除，選取消再選確認 | 取消保留草稿；確認回初始一列、磁磚空白、每箱10、備料10.0%、無結果 | NOT_RUN_USER_FOCUS_INCIDENT |
| U04 | FR-09 | 完成 C01 後切換語言，先取消再確認 | 取消留原頁且保留 C01 結果；確認後至另一靜態語言頁，表單、錯誤與結果不在網址或新頁 | NOT_RUN_USER_FOCUS_INCIDENT |
| U05 | FR-02, FR-11 | 在 320 CSS px viewport 輸入 20 列 | 每列標籤、欄位、移除／新增及試算操作可到達；頁面無水平雙向捲動 | NOT_RUN_USER_FOCUS_INCIDENT |
| U06 | FR-11 | 200% 文字縮放並用鍵盤完成 R0 | 欄位、錯誤、主要動作與結果均可讀及使用；焦點不被遮住 | NOT_RUN_USER_FOCUS_INCIDENT |
| U07 | FR-10 | 已載入頁面後離線，不重新載入，計算 R0；檢查瀏覽器網路記錄 | 已載入資源可在記憶體計算；互動無外網／遙測請求。離線重載不作承諾 | NOT_RUN_USER_FOCUS_INCIDENT |
| U08 | FR-10 | pagehide / BFCache 返回 | 回頁不恢復區域、尺寸、假設、錯誤或報告；顯示初始空白狀態 | NOT_RUN_USER_FOCUS_INCIDENT |
| U09 | FR-03, FR-11 | 名稱欄以中文 IME 組字；數字欄以 IME 輸入全形數字或句點 | 組字期間草稿不改寫、不搶焦點；全形數值在試算時被拒絕並保留原字串，提示 ASCII 語法 | NOT_RUN_USER_FOCUS_INCIDENT |

## 本規格未驗

本文件沒有執行產品、node:test、check、build、瀏覽器、網路、SEO crawler、真機或部署測試。上述純函式與頁面案例都待 M1 implementation 與適用隔離方式完成後驗證；NOT_RUN 不得改標 PASS。正式列印、採購實務與真實施工可行性不在本產品範圍。
