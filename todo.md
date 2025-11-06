# Project TODO

## Core Features

- [x] 用戶上傳之前版本的申請材料(CV, SoP, LoR)
- [x] 用戶輸入目標碩士項目信息(學校、項目名稱)
- [x] LLM搜索目標項目的最新信息(課程、教職員、規則)
- [x] 根據項目特色客製化CV
- [x] 根據項目特色客製化SoP
- [x] 根據項目特色客裭化LoR
- [x] 查看和下載生成的申請材料
- [x] 保存和管理多個項目的申請材料

## Database Schema

- [x] 創建programs表(存儲目標項目信息)
- [x] 創建documents表(存儲上傳的原始文件和生成的文件)
- [x] 創建program_research表(存儲LLM搜索的項目信息)

## Backend API

- [x] 實現文件上傳API
- [x] 實現LLM搜索項目信息功能
- [x] 實現CV客製化生成API
- [x] 實現SoP客製化生成API
- [x] 實現LoR客製化生成API
- [x] 實現文件列表和檢索API

## Frontend UI

- [x] 設計整體UI風格和配色方案
- [x] 創建項目列表頁面
- [x] 創建新建項目頁面(上傳原始材料)
- [x] 創建項目詳情頁面(顯示生成的材料)
- [x] 創建文件預覽和下載功能
- [x] 實現加載狀態和錯誤處理

## Testing & Deployment

- [x] 測試文件上傳功能
- [x] 測試LLM搜索功能
- [x] 測試文檔生成功能
- [ ] 創建checkpoint準備部署
