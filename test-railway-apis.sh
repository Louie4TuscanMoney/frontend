#!/bin/bash
# Test Railway API connections

echo "🧪 Testing Railway API Connections"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get URLs from .env file
if [ -f .env ]; then
    source .env
    NBA_URL=$(grep VITE_NBA_API_URL .env | cut -d '=' -f2)
    SHAP_URL=$(grep VITE_SHAP_API_URL .env | cut -d '=' -f2)
    BETINPUT_URL=$(grep VITE_BETINPUT_API_URL .env | cut -d '=' -f2)
else
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Create .env file with Railway URLs:"
    echo "  VITE_NBA_API_URL=https://..."
    echo "  VITE_SHAP_API_URL=https://..."
    echo "  VITE_BETINPUT_API_URL=https://..."
    exit 1
fi

echo "Testing APIs..."
echo ""

# Test NBA API
echo -n "NBA API (${NBA_URL}): "
NBA_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${NBA_URL}/games" 2>/dev/null)
if [ "$NBA_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ OK (HTTP $NBA_RESPONSE)${NC}"
    curl -s "${NBA_URL}/games" | python3 -m json.tool | head -20
else
    echo -e "${RED}❌ Failed (HTTP $NBA_RESPONSE)${NC}"
fi
echo ""

# Test SHAP API
echo -n "SHAP API (${SHAP_URL}): "
SHAP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${SHAP_URL}/api/predictions/live" 2>/dev/null)
if [ "$SHAP_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ OK (HTTP $SHAP_RESPONSE)${NC}"
    curl -s "${SHAP_URL}/api/predictions/live" | python3 -m json.tool | head -20
else
    echo -e "${YELLOW}⚠️  Status: $SHAP_RESPONSE (may be OK if no predictions)${NC}"
fi
echo ""

# Test BetInput API
echo -n "BetInput API (${BETINPUT_URL}): "
BETINPUT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BETINPUT_URL}/api/health" 2>/dev/null)
if [ "$BETINPUT_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ OK (HTTP $BETINPUT_RESPONSE)${NC}"
    curl -s "${BETINPUT_URL}/api/health" | python3 -m json.tool
else
    echo -e "${RED}❌ Failed (HTTP $BETINPUT_RESPONSE)${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$NBA_RESPONSE" = "200" ] && [ "$BETINPUT_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ All critical APIs are responding!${NC}"
    echo "Your frontend should work correctly."
else
    echo -e "${RED}❌ Some APIs are not responding correctly.${NC}"
    echo "Check Railway dashboard for service status."
fi
echo ""

