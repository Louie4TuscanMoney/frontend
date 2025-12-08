#!/bin/bash
# Start all services: APIs + Frontend

echo "🏀 Starting NBA Betting System"
echo ""

# Check python3
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 not found"
    exit 1
fi

# Start NBA API in background
echo "📡 Starting NBA API..."
cd /Users/embrace/Desktop/nba
python3 score.py > /tmp/nba_api.log 2>&1 &
NBA_PID=$!
echo "   NBA API (PID: $NBA_PID) - http://localhost:8000"

# Start BetInput API in background
echo "🎲 Starting BetInput API..."
cd /Users/embrace/Desktop/BetInput
PORT=8002 python3 api_server.py > /tmp/betinput_api.log 2>&1 &
BETINPUT_PID=$!
echo "   BetInput API (PID: $BETINPUT_PID) - http://localhost:8002"

# Wait for APIs to start
echo ""
echo "⏳ Waiting for APIs to start..."
sleep 3

# Start Frontend
echo "🌐 Starting Frontend..."
cd /Users/embrace/Desktop/frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "✅ All services starting!"
echo ""
echo "Frontend: http://localhost:3000"
echo ""
echo "To stop all services:"
echo "  kill $NBA_PID $BETINPUT_PID"
echo ""

npm run dev

