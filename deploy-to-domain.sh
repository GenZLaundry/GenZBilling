#!/bin/bash

echo "🚀 Deploying GenZ Laundry POS to billing.genzlaundry.com"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Building frontend for production...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend build successful${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

echo -e "${BLUE}Step 2: Testing production build locally...${NC}"
echo "You can test at: http://localhost:4173"
echo "Press Ctrl+C to stop the preview server when ready"
npm run preview &
PREVIEW_PID=$!

echo ""
echo -e "${GREEN}🎉 Build completed successfully!${NC}"
echo ""
echo "Next steps for deployment:"
echo "1. Push your code to GitHub"
echo "2. Deploy backend to Railway.app"
echo "3. Deploy frontend to Vercel.com"
echo "4. Configure DNS: billing.genzlaundry.com → Vercel"
echo ""
echo "See DOMAIN_DEPLOYMENT_GUIDE.md for detailed instructions"
echo ""
echo "Press any key to stop preview server..."
read -n 1
kill $PREVIEW_PID 2>/dev/null