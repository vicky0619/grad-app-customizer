# Graduate Application Customizer - Workflow V2 (Template Management System)

## 核心改進

1. **範本管理系統**: 用戶可以上傳和管理多個不同取向的SoP範本
2. **項目取向判斷**: LLM自動判斷項目是找工取向/就業取向/新創取向
3. **智能範本選擇**: LLM根據項目取向自動選擇最適合的範本進行客製化
4. **簡化流程**: 創建項目時只需填寫學校信息,不需每次上傳文件

---

## 新的用戶流程

### 步驟 0: 管理文件範本 (一次性設置)

**用戶操作:**
- 進入「範本管理」頁面
- 上傳三種不同取向的文件範本:
  - **CV範本** (1個通用版本)
  - **SoP範本** - 找工取向
  - **SoP範本** - 就業取向  
  - **SoP範本** - 新創取向
  - **LoR範本** (1個通用版本)

**範本屬性:**
- 文件類型: CV / SoP / LoR
- 取向標籤: 通用 / 找工取向 / 就業取向 / 新創取向
- 文字內容: 純文字格式
- 可編輯/重新上傳

**系統處理:**
- 存儲到 `templates` 表
- 每個用戶可以有多個同類型但不同取向的範本
- 範本可以隨時編輯或重新上傳

---

### 步驟 1: 創建新項目 (簡化流程)

**用戶操作:**
- 填寫目標校系信息:
  - 大學名稱
  - 項目名稱
  - 國家/地區 (可選)
- **不需要上傳文件** (使用已保存的範本)

**系統處理:**
- 創建 `program` 記錄
- 狀態設為 `draft`

---

### 步驟 2: 研究目標校系

**用戶操作:**
- 點擊「開始研究」按鈕

**系統處理 (LLM Research):**
- 更新項目狀態為 `researching`
- 調用 LLM 搜索並返回**8個方面**的完整校系信息:

  1. **課程設置** (Courses)
  2. **教職員信息** (Faculty Members)
  3. **入學要求** (Requirements)
  4. **項目特色** (Unique Characteristics)
  5. **研究領域** (Research Areas)
  6. **畢業要求和規劃** (Graduation Requirements)
  7. **就業資源** (Career Resources)
  8. **🆕 項目取向** (Program Orientation)
     - 判斷項目是以下哪種取向:
       * **找工取向** (Job Hunting): 強調技術面試準備、刷題、系統設計
       * **就業取向** (Employment/Industry): 強調產業合作、實習、企業項目
       * **新創取向** (Entrepreneurship): 強調創業支持、孵化器、創新項目

**LLM Prompt 範例:**
```
請分析以下碩士項目的取向:

大學: {universityName}
項目: {programName}

請判斷這個項目主要屬於以下哪種取向:
1. 找工取向 (Job Hunting): 課程強調算法、數據結構、系統設計,有技術面試準備資源
2. 就業取向 (Employment/Industry): 強調產業合作、實習機會、企業贊助項目
3. 新創取向 (Entrepreneurship): 提供創業支持、孵化器、創新創業課程

請基於項目的課程設置、就業資源、合作企業等信息進行判斷。
```

- 將研究結果(包含項目取向)存儲到 `program_research` 表
- 更新項目狀態回 `draft`

---

### 步驟 3: 生成客製化文檔

**用戶操作:**
- 在「生成文檔」標籤頁點擊生成 CV / SoP / LoR

**系統處理流程:**

#### 3.1 讀取用戶範本
- 從 `templates` 表讀取用戶上傳的範本
- **CV**: 讀取通用CV範本
- **SoP**: 讀取所有SoP範本(找工/就業/新創)
- **LoR**: 讀取通用LoR範本

#### 3.2 讀取項目研究結果
- 從 `program_research` 表讀取:
  - 課程、教職員、要求、特色、研究領域、畢業規劃、就業資源
  - **項目取向** (programOrientation)

#### 3.3 智能範本選擇 (針對SoP)

**LLM 選擇邏輯:**
```
任務: 為目標項目選擇最適合的SoP範本

項目信息:
- 大學: {universityName}
- 項目: {programName}
- 項目取向: {programOrientation} (找工取向/就業取向/新創取向)
- 項目特色: {uniqueCharacteristics}
- 就業資源: {careerResources}

可用範本:
1. SoP範本 - 找工取向
{template_job_hunting}

2. SoP範本 - 就業取向
{template_employment}

3. SoP範本 - 新創取向
{template_entrepreneurship}

請根據項目取向選擇最匹配的範本。
如果項目特色涵蓋多個取向,可以選擇主要範本並融合其他範本的元素。

輸出格式:
{
  "primary_template": "找工取向/就業取向/新創取向",
  "should_blend": true/false,
  "blend_elements": ["從其他範本融合的具體元素"],
  "reasoning": "選擇理由"
}
```

#### 3.4 生成客製化文檔

**針對 CV:**
- 使用通用CV範本
- 根據項目的研究領域、課程調整關鍵字

**針對 SoP:**
- 使用步驟3.3選擇的主要範本
- 如果需要融合,結合其他範本的元素
- 保持原範本的語句和風格
- 精準替換項目特定元素

**針對 LoR:**
- 使用通用LoR範本
- 強調與項目取向相關的能力

**生成 Prompt 範例 (SoP):**
```
任務: 客製化 Statement of Purpose

選定範本: {selected_template_type}
範本內容:
{selected_template_content}

${should_blend ? `
融合元素來源:
${blend_elements}
` : ''}

目標項目信息:
- 大學: {universityName}
- 項目: {programName}
- 項目取向: {programOrientation}
- 課程: {courses}
- 教職員: {facultyMembers}
- 項目特色: {uniqueCharacteristics}
- 研究領域: {researchAreas}
- 畢業規劃: {graduationRequirements}
- 就業資源: {careerResources}

重要指示:
1. **嚴格保持範本的語句、用詞、語氣和整體敘事風格**
2. **保持範本的故事架構、段落結構和邏輯流程**
3. **不要改寫範本中的個人經歷、成就和背景描述**
4. 只針對以下內容進行精準替換:
   - 教授名字 → 替換為目標項目的相關教授
   - 課程名稱 → 替換為目標項目的對應課程
   - 研究關鍵字 → 調整為目標項目的研究領域關鍵字
   - Women in STEM社群 → 替換為目標項目的具體社群名稱
   - 畢業規劃 → 調整為符合目標項目的要求
   - 就業資源/創業支持 → 根據項目取向提及相應資源
   - 項目特色 → 自然融入目標項目的獨特優勢
5. ${should_blend ? '適當融合其他取向的元素,但保持主範本的核心風格' : ''}
6. 確保修改後的內容流暢自然,符合項目取向

輸出格式: 純文字

請生成客製化的SoP。
```

#### 3.5 存儲生成結果
- 保存到 `documents` 表
- 記錄使用的範本ID和選擇理由
- 上傳到 S3

---

## 數據庫設計

### 新增 `templates` 表

```typescript
export const templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  documentType: mysqlEnum("documentType", ["cv", "sop", "lor"]).notNull(),
  orientation: mysqlEnum("orientation", [
    "general",           // 通用
    "job_hunting",       // 找工取向
    "employment",        // 就業取向
    "entrepreneurship"   // 新創取向
  ]).notNull(),
  name: varchar("name", { length: 255 }).notNull(), // 用戶自定義名稱
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

### 更新 `program_research` 表

```typescript
// 添加新欄位
programOrientation: mysqlEnum("programOrientation", [
  "job_hunting",
  "employment",
  "entrepreneurship",
  "mixed"  // 混合取向
]).notNull(),
```

### 更新 `documents` 表

```typescript
// 添加新欄位
templateId: int("templateId"), // 使用的範本ID
selectionReasoning: text("selectionReasoning"), // LLM選擇範本的理由
```

---

## 頁面結構

### 1. 範本管理頁面 (`/templates`)
- 顯示所有已上傳的範本
- 按文件類型和取向分組顯示
- 支持:
  - 上傳新範本
  - 編輯範本內容
  - 刪除範本
  - 預覽範本

### 2. 新建項目頁面 (`/programs/new`) - 簡化版
- 只需填寫:
  - 大學名稱
  - 項目名稱
  - 國家/地區
- 不需要上傳文件

### 3. 項目詳情頁面 (`/programs/:id`)
- 研究結果標籤:
  - 顯示8個方面的信息(包含項目取向)
- 生成文檔標籤:
  - 顯示選擇的範本
  - 顯示選擇理由
  - 生成結果

---

## 優勢

1. **一次設置,多次使用**: 範本只需上傳一次,可用於所有項目
2. **智能匹配**: LLM自動選擇最適合的範本,提高文檔質量
3. **靈活性**: 支持多個範本,可以針對不同取向準備
4. **可維護性**: 範本可以隨時編輯更新
5. **簡化流程**: 創建新項目更快速,只需填寫學校信息

---

## 完整數據流

```
[一次性] 用戶上傳範本到範本管理系統
    ↓
用戶創建新項目 (只填學校信息)
    ↓
LLM研究項目 (包含判斷項目取向)
    ↓
用戶點擊生成文檔
    ↓
系統讀取: 所有範本 + 項目研究結果
    ↓
LLM選擇最適合的範本 (針對SoP)
    ↓
LLM基於選定範本生成客製化文檔
    ↓
用戶下載結果
```
