# 技術契約：tile-estimator

狀態：M0 規格，尚未實作。程式碼名稱採英文；不需要 runtime 套件、瀏覽器擴充、外部字型、CDN、伺服器 API 或儲存層。

## 執行邊界與檔案配置

正式產品是靜態瀏覽器工具。開發與測試使用 Node.js 24+、ES modules、Node built-ins 及 node:test。開發伺服器只綁定 127.0.0.1:4215，僅提供 public/；production model 使用埠 5215。兩者是本工作候選，不代表已有伺服器或正式部署。

預期專案樹：

~~~text
package.json
public/
  index.html
  en/
    index.html
  styles/
    app.css
  js/
    app.mjs
    render.mjs
    core/
      tile-estimator.mjs
      report.mjs
scripts/
  serve.mjs
  check.mjs
  build.mjs
test/
  tile-estimator.test.mjs
  report.test.mjs
dist/                  # 僅由 build 產生
~~~

兩個 HTML 是獨立語言入口；CSS、應用程式與純核心模組可共用。所有資源必須同源本機；不得載入遠端字型、script、stylesheet、圖片、API、analytics 或其他工具。無 JavaScript 時顯示明確不可用說明，表單不得把值送到伺服器。

## 純核心 API

calculateTileEstimate(request) 同步接收以下精確 schema。頂層欄位全部必填，僅 row.nameRaw 可省略；不接受 alias。

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

鋪設與扣除列皆接受形狀為 {id, nameRaw?, lengthMetersRaw, widthMetersRaw} 的普通資料物件。ID 必須符合 ASCII [A-Za-z0-9_-]{1,40}，並在兩個陣列合併後全域唯一。物件只能有列出的自有可列舉資料欄位；拒絕未知 key、symbol、非列舉屬性、accessor、額外陣列屬性、空洞與錯誤 prototype。檢查 property descriptors，不讀取 getter。未知 key 不納入錯誤路徑或錯誤訊息。純函式不得改寫輸入；不保證 Proxy trap 沒有副作用，API 呼叫端應傳入一般 JSON-like 值。

### 數字解析

所有 raw 數字欄位都必須是字串，原始 JS 字串長度最多 32 UTF-16 code units，包含外側空白。先只去除兩端 ASCII 空白 U+0009–U+000D 及 U+0020；內部空白不去除。接受語法為一個以上 ASCII 數字，可選 ASCII 小數點及 1 至欄位允許的位數；允許前導零，例如 0001.25。拒絕空字串、只有小數點、尾隨小數點、正負號、指數、千分位、全形數字／句點、NaN、Infinity、NBSP 及任何其他非 ASCII 數字字元。輸入中不做格式化或改寫。

- lengthMetersRaw 與 widthMetersRaw：0 < 值 <= 1000 m，最多 3 位小數。
- tileLengthCmRaw 與 tileWidthCmRaw：0 < 值 <= 1000 cm，最多 1 位小數。
- reservePercentRaw：0 <= 值 <= 50%，最多 1 位小數。
- boxPiecesRaw：ASCII 整數語法，1–1000；不接受小數點。

大於欄位精度、格式錯誤、超過長度及超出範圍需有不同穩定錯誤碼。外側允許的 ASCII 空白在解析時忽略；其餘空白均拒絕。範圍比較不得使用 Number 浮點數。

名稱 nameRaw 可省略，或為最多 256 UTF-16 code units 的字串。拒絕孤立 surrogate 與 Unicode Cc 控制字元；有效代理對以單一碼點計數。去除 ECMAScript trim 空白後，最多 40 個碼點；空名稱在核心結果保留為空字串，不依賴語系。UI 與報告依陣列位置及語言生成「區域 n」或「Area n」；只有用來顯示的 fallback 不寫回核心結果。將名稱插入畫面時只用 textContent；報告以單行 JSON 字串跳脫顯示，避免換行與分隔符混淆。

### 單位與精確整數運算

不得經過二進位浮點數。以十進位字串切出整數與小數部分，轉成 BigInt：

- 公尺欄最多三位小數：mm = 整數部分 × 1000 + 小數部分右補零到三位。
- 公分欄最多一位小數：mm = 整數部分 × 10 + 小數部分右補零到一位。
- 百分比最多一位小數：reserveTenths 是百分比數字右補零到一位後的整數；例如 10、10.0 都是 100，50 是 500。

每列面積等於 lengthMm × widthMm。令 installTotalMm2 為鋪設面積總和，deductionTotalMm2 為扣除面積總和；淨面積 A = installTotalMm2 − deductionTotalMm2，必須大於零。單片面積 T = tileLengthMm × tileWidthMm。

所有除法均為非負 BigInt 整數向上取整：ceilDiv(n,d) = (n + d − 1) / d，且 d > 0。

~~~text
basePieces = ceilDiv(A, T)
piecesWithReserve = ceilDiv(A * (1000 + reserveTenths), 1000 * T)
boxes = ceilDiv(piecesWithReserve, boxPieces)
purchasedPieces = boxes * boxPieces
extraAfterReserve = purchasedPieces - piecesWithReserve
purchasedAreaMm2 = purchasedPieces * T
~~~

A 的最大值為 20 × 1000 m × 1000 m = 20,000,000,000,000 mm²。T 最小為 1 mm²，最大為 100,000,000 mm²；備料因子最大為 1.5。piece count 上限為 30,000,000,000,000；每箱最多 1000 片，購買片數最多 30,000,000,000,999。所有數值運算用 BigInt；結果將整數序列化為 canonical 十進位字串，以保持 JSON 可序列化且不洩露 raw BigInt。

面積顯示以 mm² 做正值 half-up 到 0.01 m²：因 0.01 m² = 10,000 mm²，顯示百份之一 m² 整數為 (areaMm2 + 5,000) / 10,000，再補成固定兩位小數。面積為零時顯示 0.00。任何比較、除法向上取整與狀態決定都不讀取顯示值。結果與報告並列精確 mm²，並提醒小面積的兩位小數顯示可能為 0.00 m²。

## 成功與錯誤回應

calculateTileEstimate 成功只回傳以下封閉結構：

~~~json
{
  "ok": true,
  "result": {
    "schemaVersion": 1,
    "installAreas": [
      {
        "name": "",
        "lengthMm": "3000",
        "widthMm": "4000",
        "areaMm2": "12000000",
        "areaM2Display": "12.00"
      }
    ],
    "deductionAreas": [],
    "tile": {
      "lengthMm": "600",
      "widthMm": "600",
      "areaMm2": "360000",
      "areaM2Display": "0.36"
    },
    "reservePercentTenths": "100",
    "boxPieces": "4",
    "totals": {
      "installAreaMm2": "12000000",
      "installAreaM2Display": "12.00",
      "deductionAreaMm2": "0",
      "deductionAreaM2Display": "0.00",
      "netAreaMm2": "12000000",
      "netAreaM2Display": "12.00",
      "basePieces": "34",
      "piecesWithReserve": "37",
      "boxes": "10",
      "purchasedPieces": "40",
      "extraAfterReserve": "3",
      "purchasedAreaMm2": "14400000",
      "purchasedAreaM2Display": "14.40"
    }
  }
}
~~~

欄位與順序固定；每列輸出採原陣列順序，輸出不帶 raw 字串、ID 或原始錯誤內容。每一面積數字和件數都是 canonical 十進位字串；schemaVersion 是數字 1。result 只能含 schemaVersion、installAreas、deductionAreas、tile、reservePercentTenths、boxPieces、totals；列、tile 與 totals 欄位依上述範例封閉。

錯誤只回傳 {ok:false,error:{code,field}}，不得附上 partial result、輸入值、key 名稱、HTML 或例外訊息。固定 code 與 field：

| 情況 | code | field |
|---|---|---|
| request 型別、prototype、未知頂層欄位、symbol 或 descriptor 錯誤 | invalid_request | request |
| 陣列型別、空洞或額外陣列屬性 | invalid_rows | installAreas 或 deductionAreas |
| row 欄位未知、symbol、descriptor 或 row prototype 錯誤 | invalid_row | installAreas.i 或 deductionAreas.i |
| 缺少任何已知必填欄，或已知非陣列欄位型別錯 | invalid_type | 固定已知欄位路徑 |
| 鋪設列數超限或為零 | row_count | installAreas |
| 扣除列數超限 | row_count | deductionAreas |
| ID 格式錯誤或重複 | invalid_id / duplicate_id | 該列 .id |
| nameRaw 型別錯誤 | invalid_type | 該列 .nameRaw |
| 名稱長度或 raw 名稱超過 256 code units | invalid_name | 該列 .nameRaw |
| 名稱含 Cc 控制字元或孤立 surrogate | invalid_unicode | 該列 .nameRaw |
| raw 長度超限 | input_too_long | 該 numeric 欄位 |
| 數字語法錯誤／精度超限／範圍錯誤 | invalid_number / precision_exceeded / out_of_range | 該 numeric 欄位 |
| 扣除總面積 >= 鋪設總面積 | non_positive_net_area | deductionAreas |
| buildReport 收到不合法或派生欄位不一致的結果 | invalid_result | result |
| buildReport 的語言不支援 | unsupported_language | language |
| 防禦性報告字元上限被觸發 | report_too_large | result |

驗證順序固定：先驗 request 物件型別、prototype、descriptor、symbol 及頂層未知欄位，再檢查已知頂層欄位缺漏，缺欄回 invalid_type / request.已知欄位；接著驗陣列型別、密度與額外屬性，再驗列數；依鋪設列、扣除列順序先驗 row prototype、未知欄、symbol 與 descriptor，任何此類 row 結構錯誤回 invalid_row / row path；結構合法後才驗 row 必填欄與型別，缺漏或型別錯回 invalid_type / 固定欄位路徑；對每列依序驗 ID 格式、與先前列的唯一性、名稱、長度、寬度。再接著驗單片長寬、每箱片數與備料百分比；最後加總並檢查淨面積，再產生成果。第一次錯誤即返回。

對未知 top-level key 回報 field=request；對未知 row key 回報 field=installAreas.i 或 deductionAreas.i，不拼接、不回顯攻擊者提供的 key。row 缺 id 或尺寸欄回 invalid_type / installAreas.i.id、installAreas.i.lengthMetersRaw 等固定路徑；row 結構錯優先於欄位缺漏或型別錯。已知 request 缺欄只指向固定欄位路徑，例如 request.tileLengthCmRaw。錯誤碼與路徑不受語言影響；UI 再將它們映射為兩語固定文案。所有錯誤都不 echo raw 值。

主代理 M1 資源界線補充（2026-10-19）：request 檢查後，依 installAreas、deductionAreas 順序，先確認陣列 type/prototype，再以 own length descriptor 做 <=20 上限檢查；超限立即回 row_count／該陣列名稱，優先於該陣列及後續陣列的 symbol、extra、洞、index descriptor 或 row 錯誤，不先取得全陣列 descriptors、keys、元素或副本。上限內仍使用原完整結構、數量下限與逐列驗證。buildReport 對 result 的兩個陣列也先做 type/prototype 與 length <=20 預檢再列舉/複製，超限直接 invalid_result/result。這只界定陣列元素工作量，不聲稱任意巨大未知 own-key 物件或 Proxy 的操作為常數時間。

## 報告契約

buildReport(result, language) 只接受成功的 result snapshot 及 language 為 zh-Hant 或 en，回傳 {ok:true,text} 或 {ok:false,error:{code,field}}。結果必須符合封閉 schema、固定範圍與 canonical 字串規則；name 必須是空字串或不超過 40 個碼點的已 trim 名稱，且不得有 Cc 控制字元或孤立 surrogate。每列面積、顯示面積、總和、淨面積、片數、備料、箱數、整箱多出片數與整箱購買面積都要從長寬與假設重算並逐欄比對。未知 key、getter、symbol、非列舉屬性、空洞、錯型別或不一致派生欄位都回 invalid_result / result，不回顯 key。language 錯誤回 unsupported_language / language。合法 result 的最大輸出必須小於 32,768 code units，因此 report_too_large 是防禦分支，合法 schema 不應觸發。

報告固定列序、語言文案與欄位格式；buildReport 回傳 Unicode JavaScript string，使用 LF 換行、不加尾端 LF。這不是 byte stream，不執行 UTF-8 編碼或 BOM 寫入；MVP 不寫檔。空名稱依語言與所在陣列的一起始序號先轉為「區域 n」或「Area n」，再以 JSON 字串跳脫顯示；原 result.name 仍保留空字串。將 U+2028 與 U+2029 明確輸出為可見的反斜線跳脫，確保每列名稱維持單行。合法 schema 的最大報告必須小於 32,768 UTF-16 code units；大於此防禦上限回 report_too_large / result。先驗 schema 的上限與派生一致性，不能用一個不可能的「合法超大輸出」案例冒充測試通過。

繁中成功報告固定範例（只有一筆鋪設區，無扣除區）：

~~~text
鋪材用量試算（磁磚／板材面積估算，非施工建議）
鋪設區域：
- "區域 1"｜3.000 m × 4.000 m｜12.00 m²（精確 12000000 mm²）
扣除區域：無
鋪設總面積：12.00 m²（精確 12000000 mm²）
扣除總面積：0.00 m²（精確 0 mm²）
淨面積：12.00 m²（精確 12000000 mm²）
鋪材尺寸：60.0 cm × 60.0 cm｜單片 0.36 m²（精確 360000 mm²）
備料假設：10.0%（可自行調整，非通用建議）
基本估算：34 片
含備料估算：37 片
每箱片數：4
整箱數：10 箱（購買 40 片）
整箱餘片：3 片
整箱購買面積：14.40 m²（精確 14400000 mm²）
面積只依矩形面積加總；不排版、不估切割，亦不保證拼花或實際施工結果。
面積顯示至小數第 2 位；片數與箱數依精確 mm² 計算。
~~~

English report for the same fixture:

~~~text
Tile and Panel Usage Estimate (area estimate, not installation advice)
Installed areas:
- "Area 1" | 3.000 m × 4.000 m | 12.00 m² (exact 12000000 mm²)
Deducted areas: none
Installed area total: 12.00 m² (exact 12000000 mm²)
Deducted area total: 0.00 m² (exact 0 mm²)
Net area: 12.00 m² (exact 12000000 mm²)
Material size: 60.0 cm × 60.0 cm | one piece 0.36 m² (exact 360000 mm²)
Reserve assumption: 10.0% (editable; not a universal recommendation)
Base estimate: 34 tiles
Estimate with reserve: 37 tiles
Pieces per box: 4
Boxes: 10 (40 tiles purchased)
Extra pieces after reserve: 3
Area purchased in full boxes: 14.40 m² (exact 14400000 mm²)
Area is summed by rectangle only; no layout or cutting plan is provided, and results do not guarantee a pattern or installation outcome.
Areas are displayed to two decimals; piece and box counts use exact mm².
~~~

成功輸出文字固定，除使用者名稱依 JSON 字串跳脫代入外，不加入日期、語系環境、隨機值或動態提示。報告只是 textarea 唯讀內容；不可新增複製或下載按鈕。

## 頁面狀態、生命週期與安全

- 初始：預設一筆空鋪設區、零扣除區、鋪材尺寸空白、每箱 10、備料 10.0%；沒有結果。
- 輸入／錯誤：所有錯誤與欄位關聯；提交依固定順序驗證 request，第一次錯誤聚焦對應欄位。輸入、增刪列或改假設會同步清掉舊結果與唯讀報告。切換語言先確認；取消保留頁面與結果，確認後才清除並導航。
- 試算：計算同步完成；最多 40 筆資料，不需網路或等待動畫。試算按鈕在初始化完成後可用，以便空白或錯誤表單能顯示錯誤。
- 清除：初始狀態時禁用。任何欄位、列或設定曾離開初始狀態即視為有工作；清除先頁內確認。取消保留現狀；確認清空錯誤與結果、重建預設一列、回到初始數值。
- 語言切換：有工作時先用頁內確認；取消不改頁，確認導航到另一個靜態語言頁且不傳輸任何表單資料。沒有工作則直接切換。
- 離頁：pagehide 清除記憶體 state、DOM 派生結果及報告。若 pageshow 的 persisted 為 true，回到初始空白 state；禁止讀取瀏覽器儲存還原表單。
- 初始化：所有 fieldset 和工作按鈕在 HTML 中先 disabled，輸入沒有 name；JS 最先同步綁上 submit handler，第一個動作是 preventDefault，再完成其他事件註冊，最後才啟用。初始化任一步失敗，保持 disabled，不得 GET／POST 提交使用者值。無需 async、clipboard 或 URL 生命週期；取消競態 N/A。
- 所有輸入只進純函式；以 textContent 呈現使用者名稱；禁止 innerHTML、eval、遠端載入與任意 HTML 注入。

離線只涵蓋已載入頁面。沒有 service worker、快取策略或離線重載承諾。HTTP 靜態資源檢查只驗路徑和 header，不得冒充瀏覽器交互或本機 UI 驗收。
