# Graduate Application Document Customizer

AI-powered web application for customizing graduate school application documents (CV, Statement of Purpose, Letter of Recommendation) based on target university programs.

## 🎯 Project Overview

This system helps graduate school applicants customize their application materials for different university programs by:
- Analyzing target program characteristics using LLM-powered research
- Intelligently replacing technical keywords to match program focus
- Maintaining original writing style while adapting content
- Supporting multiple document formats (standard SoP, essay questions, etc.)

## ✨ Key Features

### 1. Template Management System
- Upload and manage multiple document templates
- Support for different orientations (job-seeking, employment, entrepreneurship)
- Edit and update templates anytime

### 2. Intelligent Program Research
- Automated LLM-powered research on target programs
- Comprehensive analysis covering:
  - Course offerings (required & elective)
  - Faculty members and research areas
  - Admission requirements and document formats
  - Program orientation and technical focus
  - Women in STEM communities
  - Graduation requirements and career resources

### 3. Smart Document Generation
- Automatic template selection based on program characteristics
- Technical keyword replacement (NLP/ML/AI/System/Network/Data/HCI)
- Experience description adaptation
- Word count control for different requirements
- Support for multiple essay questions

### 4. Side-by-Side Preview & Discussion
- Compare original template with customized version
- Detailed change log with reasons
- Interactive discussion space for refinement
- Regenerate based on feedback

## 🏗️ Technical Architecture

### Frontend
- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Routing**: wouter
- **State Management**: TanStack Query (React Query)

### Backend
- **Framework**: Express 4 + tRPC 11
- **Type Safety**: End-to-end TypeScript with Superjson
- **Authentication**: Manus OAuth
- **Database**: MySQL with Drizzle ORM

### AI Integration
- **LLM**: Integrated via Manus Forge API
- **Capabilities**:
  - Program research and analysis
  - Document generation and customization
  - Interactive discussion and refinement

### Infrastructure
- **File Storage**: S3-compatible storage
- **Deployment**: Manus platform

## 📁 Project Structure

```
grad-app-customizer/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable UI components
│   │   ├── lib/           # tRPC client setup
│   │   └── App.tsx        # Main app with routing
├── server/                # Backend Express + tRPC
│   ├── routers.ts         # tRPC API routes
│   ├── db.ts              # Database query helpers
│   └── _core/             # Core infrastructure
├── drizzle/               # Database schema & migrations
│   └── schema.ts          # Table definitions
└── shared/                # Shared types & constants
```

## 🚀 Getting Started

### Prerequisites
- Node.js 22+
- pnpm
- MySQL database

### Installation

1. Clone the repository:
```bash
git clone https://github.com/vicky0619/grad-app-customizer.git
cd grad-app-customizer
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables (see `.env.example`)

4. Push database schema:
```bash
pnpm db:push
```

5. Start development server:
```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

## 📖 Usage Workflow

1. **Upload Templates**: Navigate to Template Management and upload your base documents (CV, SoP variants, LoR)

2. **Create Program**: Add a new target program with university and program name

3. **Research Program**: Click "Research Program" to let LLM analyze the target program

4. **Generate Documents**: 
   - Review admission requirements
   - Add custom instructions if needed
   - Generate customized documents

5. **Review & Refine**:
   - View side-by-side comparison
   - Check change log
   - Discuss with AI for improvements
   - Regenerate based on feedback

## 🎓 Academic Context

This project was developed as a final project for a Generative AI course, demonstrating practical applications of LLM technology in solving real-world problems.

## 📝 License

MIT License

## 👤 Author

Vicky (vicky46586038@gmail.com)

## 🙏 Acknowledgments

- Built on Manus platform
- Uses Manus Forge API for LLM integration
- UI components from shadcn/ui
