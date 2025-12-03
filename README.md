# MetalLCA - National Circularity Platform

AI-powered Life Cycle Assessment (LCA) platform for the Indian metal sector.

## Project Structure

```
Alchemy/
├── frontend/          # React + Vite + Tailwind CSS
├── backend/           # FastAPI + Python
├── database/          # Database schemas and migrations
├── ai_engines/        # AI/ML models and logic
├── memory_bank/       # Project documentation
└── docker/            # Docker configurations
```

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, D3.js, React Router
- **Backend:** FastAPI, Python 3.11+
- **Database:** PostgreSQL 15, MongoDB 7
- **AI/ML:** LangChain, OpenAI GPT-4o, Pinecone
- **Cloud:** AWS Mumbai Region

## Development Setup

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL 15+
- MongoDB 7+

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Phase 1 MVP (Current)

- Aluminium & Copper LCA calculator
- NLP-based material input
- Basic GWP calculation
- Free tier for MSMEs

## Environment Variables

Create `.env` files in both frontend and backend directories. See `.env.example` for required variables.

## License

Copyright © 2025 JNARDDC - MetalLCA Project
