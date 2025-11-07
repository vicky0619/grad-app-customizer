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
- [x] 創建checkpoint準備部署

## Bug Fixes

- [x] 修復getResearch返回undefined的錯誤

## Workflow Improvements

- [x] 修改前端上傳為純文字輸入(textarea)
- [x] 更新後端uploadDocument API處理純文字
- [x] 擴展LLM研究prompt包含7個方面(畢業規劃、就業資源等)
- [x] 更新program_research表schema添加新欄位
- [x] 修改生成文檔prompt強調保持原文風格
- [x] 實現CV生成LaTeX格式輸出
- [x] 實現SoP/LoR純文字格式輸出
- [x] 添加信息完整性檢查和自動補充搜索
- [x] 更新前端顯示新增的研究信息欄位

## Template Management System

- [x] 創建templates表存儲用戶範本
- [x] 實現範本上傳API(支持多個版本)
- [x] 實現範本列表和管理頁面
- [x] 實現範本編輯/重新上傳功能
- [x] 添加項目取向欄位到program_research(找工/就業/新創)
- [x] 更新LLM研究prompt判斷項目取向
- [x] 實現智能範本選擇邏輯
- [x] 更新生成文檔API使用範本系統
- [x] 簡化新建項目流程(只填學校信息,不需上傳文件)

## Enhanced Keyword Replacement & Course Research

- [x] 更新研究prompt分析項目技術方向(NLP/ML/AI/System/Network等)
- [x] 更新研究prompt搜索必修課和選修課詳細列表
- [x] 更新研究prompt搜索non-thesis和coursework track信息
- [x] 更新研究prompt搜索推薦課表和選課建議
- [x] 更新生成文檔prompt智能替換技術關鍵字
- [x] 更新生成文檔prompt根據項目方向調整經歷描述
- [x] 添加技術方向欄位到program_research表
