# 🎯 AI Interview Simulator

An AI-powered mock interview platform that generates personalized questions from your resume, evaluates your answers in real-time, and provides detailed feedback to help you ace your next interview.

## 🌐 Live Demo

| Component | URL |
|-----------|-----|
| **Frontend** | [Vercel Deployment](https://frontend-cnryq09sp-vinnies-projects-3b4c43c2.vercel.app) |
| **Backend API** | [Render Deployment](https://ai-interview-simulator-2w5a.onrender.com) |

> **Note:** Render free tier has a ~30s cold start on first request.

---

## ✨ Features

- **📄 Resume Parsing** — Upload PDF/DOCX, auto-extracts skills, experience & projects
- **🤖 AI Question Generation** — Personalized questions via Google Gemini based on your resume
- **🎭 3 Interview Personas** — HR, Technical, and Behavioral modes
- **🎤 Voice Input** — Record answers via microphone with real-time audio levels
- **📊 Real-time Evaluation** — Scores on content, grammar, clarity & confidence
- **📈 Adaptive Difficulty** — Questions get harder/easier based on your performance
- **🔑 Keyword Analysis** — Tracks expected keywords found/missed in your answers
- **📋 Session History** — Review past interviews with score trends (Firebase auth)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, Zustand, React Router, Recharts |
| **Backend** | FastAPI, Python, Uvicorn |
| **AI** | Google Gemini 2.0 Flash (text + multimodal audio) |
| **Auth & DB** | Firebase Authentication + Firestore |
| **Deployment** | Vercel (frontend) + Render (backend) |

---

## 🚀 Run Locally

### Prerequisites
- Node.js 18+
- Python 3.10+
- [Gemini API Key](https://aistudio.google.com/apikey) (free)

### 1. Clone the repo
```bash
git clone https://github.com/Shraddha-367/AI-Interview-Simulator.git
cd AI-Interview-Simulator
```

### 2. Backend setup
```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```env
GEMINI_API_KEY=your-gemini-api-key-here
```

Start the backend:
```bash
uvicorn main:app --reload --port 8000
```

### 3. Frontend setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Open the app
Navigate to **http://localhost:5173** in your browser.

---

## 📁 Project Structure

```
AI-Interview-Simulator/
├── backend/
│   ├── main.py                 # FastAPI app, CORS, rate limiting
│   ├── requirements.txt
│   ├── routers/
│   │   ├── resume.py           # POST /api/resume/upload
│   │   ├── interview.py        # POST /api/interview/generate
│   │   ├── evaluation.py       # POST /api/evaluation/evaluate
│   │   ├── speech.py           # POST /api/speech/transcribe
│   │   └── history.py          # GET/POST /api/history/*
│   ├── services/
│   │   ├── question_generator.py   # Gemini question generation
│   │   ├── answer_evaluator.py     # Gemini answer evaluation
│   │   ├── speech_processor.py     # Gemini audio transcription
│   │   └── resume_parser.py        # PDF/DOCX parsing
│   └── models/                 # Pydantic schemas
├── frontend/
│   ├── src/
│   │   ├── components/         # ResumeUploader, AnswerInput, etc.
│   │   ├── pages/              # Landing, Dashboard, Interview, Results
│   │   ├── hooks/              # useInterview, useVoiceInput, useFirebase
│   │   ├── services/           # apiClient, interviewService, etc.
│   │   └── store/              # Zustand state management
│   └── vercel.json             # SPA rewrite config
└── render.yaml                 # Render deployment blueprint
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/resume/upload` | Upload & parse resume (PDF/DOCX) |
| `POST` | `/api/interview/generate` | Generate interview questions |
| `POST` | `/api/evaluation/evaluate` | Evaluate an answer |
| `POST` | `/api/speech/transcribe` | Transcribe audio to text |
| `GET` | `/api/history/{user_id}` | Get user's session history |
| `POST` | `/api/history/save` | Save interview session |

---

## 📝 Environment Variables

### Backend (`backend/.env`)
| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `FIREBASE_CREDENTIALS_JSON` | Optional | Firebase service account JSON |
| `CORS_ORIGINS` | Optional | Comma-separated allowed origins |

### Frontend (`frontend/.env`)
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Optional | Backend API URL (defaults to `http://localhost:8000/api`) |

---

## 📄 License

This project is for educational purposes.
