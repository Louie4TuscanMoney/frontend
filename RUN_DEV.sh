#!/bin/bash
# Quick start script for frontend development

echo "🏀 NBA Betting Dashboard - Starting Development Server"
echo ""

# Navigate to frontend directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "🚀 Starting development server..."
echo "📍 Site will be available at: http://localhost:3000"
echo ""
echo "⚠️  Make sure your APIs are running:"
echo "   - NBA API: http://localhost:8000"
echo "   - SHAP API: Check your SHAP API port"
echo "   - BetInput API: Check your BetInput API port"
echo ""

npm run dev

