#!/bin/bash
# Script to start all APIs for frontend development

echo "🚀 Starting NBA Betting System APIs"
echo ""

# Check if python3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 not found. Please install Python 3."
    exit 1
fi

echo "✅ Python 3 found"
echo ""

# Start NBA API (Terminal 1)
echo "📡 Starting NBA API on port 8000..."
cd /Users/embrace/Desktop/nba
python3 score.py &
NBA_PID=$!
echo "   NBA API PID: $NBA_PID"
echo ""

# Start BetInput API (Terminal 2) - on port 8002
echo "🎲 Starting BetInput API on port 8002..."
cd /Users/embrace/Desktop/BetInput
PORT=8002 python3 api_server.py &
BETINPUT_PID=$!
echo "   BetInput API PID: $BETINPUT_PID"
echo ""

# Wait a moment for APIs to start
sleep 2

echo "✅ APIs started!"
echo ""
echo "NBA API: http://localhost:8000"
echo "BetInput API: http://localhost:8002"
echo ""
echo "To stop APIs, run: kill $NBA_PID $BETINPUT_PID"
echo ""
echo "Now start the frontend in another terminal:"
echo "  cd /Users/embrace/Desktop/frontend && npm run dev"

