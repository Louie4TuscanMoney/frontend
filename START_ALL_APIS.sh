#!/bin/bash
# Start all APIs with auto-restart and monitoring

echo "🚀 Starting All APIs with Auto-Restart"
echo ""

# Check python3
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 not found"
    exit 1
fi

# Start NBA API in background with auto-restart
echo "📡 Starting NBA API (port 8000) with auto-restart..."
cd /Users/embrace/Desktop/nba
nohup ./start_server.sh > /tmp/nba_api.log 2>&1 &
NBA_PID=$!
echo "   NBA API PID: $NBA_PID"
echo "   Logs: tail -f /tmp/nba_api.log"

# Wait a moment
sleep 2

# Start BetInput API in background with auto-restart
echo "🎲 Starting BetInput API (port 8002) with auto-restart..."
cd /Users/embrace/Desktop/BetInput
nohup ./start_server.sh > /tmp/betinput_api.log 2>&1 &
BETINPUT_PID=$!
echo "   BetInput API PID: $BETINPUT_PID"
echo "   Logs: tail -f /tmp/betinput_api.log"

echo ""
echo "✅ All APIs starting with auto-restart enabled!"
echo ""
echo "NBA API: http://localhost:8000"
echo "BetInput API: http://localhost:8002"
echo ""
echo "To stop all APIs:"
echo "  kill $NBA_PID $BETINPUT_PID"
echo ""
echo "To check logs:"
echo "  tail -f /tmp/nba_api.log"
echo "  tail -f /tmp/betinput_api.log"
echo ""
echo "Now start the frontend in another terminal:"
echo "  cd /Users/embrace/Desktop/frontend && npm run dev"

