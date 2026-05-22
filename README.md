# Mentora — AI Study & Chat Assistant

Powered by Google Gemini API (free). Deployable to Vercel + Render for a public URL.

## Quick Local Run

1. Get free Gemini API key: https://aistudio.google.com/app/apikey
2. Add it to `backend/.env`:  `GEMINI_API_KEY=your_key_here`
3. Start backend: `cd backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000`
4. Start frontend: `cd frontend && npm install && npm run dev`
5. Open http://localhost:5173

## Deploy to GitHub + Vercel + Render (Public URL)

### Step 1 — Push to GitHub
```
git init
git add .
git commit -m "Initial Mentora commit"
```
Create repo at github.com → then:
```
git remote add origin https://github.com/YOUR_USERNAME/mentora.git
git push -u origin main
```

### Step 2 — Deploy Backend to Render (free)
1. Go to https://render.com and sign up with GitHub
2. Click "New" → "Web Service"
3. Connect your GitHub repo
4. Settings:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add Environment Variables:
   - `GEMINI_API_KEY` = your Gemini API key
6. Click "Create Web Service"
7. Copy your Render URL (e.g. https://mentora-backend.onrender.com)

### Step 3 — Deploy Frontend to Vercel (free)
1. Go to https://vercel.com and sign up with GitHub
2. Click "Add New" → "Project"
3. Import your GitHub repo
4. Settings:
   - Root Directory: `frontend`
   - Framework Preset: Vite
5. Add Environment Variable:
   - `VITE_API_URL` = https://your-render-url.onrender.com/api
6. Click "Deploy"
7. Your public URL is ready! 🎉

### Step 4 — Update CORS
In Render dashboard, add another environment variable:
- `FRONTEND_URL` = https://your-vercel-url.vercel.app
Then redeploy the backend.
