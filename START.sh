#!/bin/bash
# SecOPS Hackathon - Quick Start Script
# Run this to automatically start both backend and frontend servers

echo "🚀 SecOPS Hackathon Project - Starting Servers..."
echo ""

# Function to run backend
start_backend() {
    echo "📡 Starting Backend (FastAPI on http://127.0.0.1:8000)..."
    cd backend
    python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
}

# Function to run frontend
start_frontend() {
    echo "🎨 Starting Frontend (Next.js on http://localhost:3000)..."
    cd frontend
    npm run dev
}

# Check if both terminals/tmux available, otherwise instruct user
if command -v tmux &> /dev/null; then
    # Use tmux if available
    tmux new-session -d -s soc_backend -c "$(pwd)" 'bash -c "$(declare -f start_backend); start_backend"'
    sleep 2
    tmux new-window -t soc_backend -n frontend -c "$(pwd)" 'bash -c "$(declare -f start_frontend); start_frontend"'
    tmux attach -t soc_backend
else
    # Fallback: Print instructions
    echo ""
    echo "⚠️  Please open TWO separate terminal windows and run:"
    echo ""
    echo "Terminal 1 (Backend):"
    echo "  cd backend"
    echo "  python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
    echo ""
    echo "Terminal 2 (Frontend):"
    echo "  cd frontend"
    echo "  npm run dev"
    echo ""
    echo "Then open: http://localhost:3000"
    echo ""
fi
