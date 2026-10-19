# 隱私安全
使用者文字/檔案/數值只memory；不寫storage/cookie/IndexedDB/cache/serviceworker/URL/log/console，不telemetry、beacon、remote font/CDN。初載同源靜態資源不等於無網路，不承諾永久離線。改稿清結果，清除與pagehide處理全部資料/非同步代次/必要URL，persisted pageshow回初始；OS下載檔/瀏覽器歷史由使用者管理，不宣稱全刪。
exact schema/型別/大小上限/未知欄位與accessor拒絕；動態字串僅textContent/value、不innerHTML/eval/Function。輸出原生能力只限PRODUCT明定；缺能力顯示理由，無雲端替代。錯誤不echo全文；UI不提交form，不把name/內容帶URL，JS前controls disabled。
CSP default-src none, script-src self（M2 JSON-LD只精確hash）, style-src self, connect-src none, base-uri none, form-action none, object-src none，HTTP frame-ancestors none；nosniff/no-referrer。36的本地module Worker必須worker-src self，不能unsafe-inline/eval/blob worker；其餘不開worker能力。完整Network含同源/cdn-cgi/rum與隱藏階段；Storage需實測，不能用grep或純HTTP冒稱PASS。
