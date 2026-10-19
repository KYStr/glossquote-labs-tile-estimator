# 工程基線
Node24+ ESM內建模組、原生HTML/CSS/JS，零外部依賴。資料契約與數字規則以TECHNICAL為準。核心無DOM/網路/持久副作用；測試採手寫期望、邊界、錯誤、輸入不變與獨立不變式。不可用被測結果建立expected。
package private=true/type=module；npm test=node --test，npm run check/build/dev對應scripts。建置閉合public檔案allowlist；拒絕symlink/junction、不必要hardlink、未知檔、traversal及stale輸出，不掃帳戶。preview dist與production dist-production分開。build不打包文件/測試/使用者資料。不要讓check永遠exit0；regex掃描不是安全證明。
HTTP只loopback GET/HEAD，精確路由/MIME、未知404、禁止method405、Host限制；不SPA fallback、不返回workspace。CLI留命令/exit與固定files bytes/hash清單。最後版本穩定後必要命令各跑一次，變更後只重跑受影響gates。
依AGENTS做Windows/Gitguards與CLI安全。保留既有修改/程序。單元、HTTP、離線DOM、真瀏覽器、原生與真機證據分開；目前本機互動UI全面暫停。
