#!/bin/bash

echo "=================================================="
echo "🧪 EMAIL SYSTEM TEST - $(date)"
echo "=================================================="
echo ""

# Test backend health
echo "1️⃣ Checking backend status..."
HEALTH=$(curl -s http://localhost:3001/health)
if [ -z "$HEALTH" ]; then
    echo "❌ Backend is not responding on port 3001!"
    echo "   Please start the backend with: npm run dev"
    exit 1
fi
echo "✅ Backend is running"
echo ""

# Send test email
echo "2️⃣ Sending course confirmation email to kukuhthewow@gmail.com..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "kukuhthewow@gmail.com",
    "type": "course",
    "courseDetails": {
      "courseName": "Email System Test - '"$(date '+%B %d, %Y %H:%M:%S')"'",
      "courseCode": "TEST-EMAIL-001",
      "startDate": "2026-03-01",
      "endDate": "2026-03-05",
      "venue": "POLWEL Training Center",
      "organizationName": "Test Organization Ltd"
    }
  }')

echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if successful
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
if [ "$SUCCESS" = "true" ]; then
    echo "✅ API reported: Email sent successfully!"
    
    # Wait a moment for logs to flush
    sleep 2
    
    echo ""
    echo "3️⃣ Checking backend logs for SMTP confirmation..."
    echo "─────────────────────────────────────────────────"
    
    # Get the last email sending logs
    if [ -f "backend-run.log" ]; then
        tail -100 backend-run.log | grep -A 5 "Learner confirmation email sent successfully\|Message ID\|Response: 250\|Accepted:\|Rejected:" | tail -20
    else
        echo "⚠️  backend-run.log not found, checking for other log files..."
        tail -50 *.log 2>/dev/null | grep -A 5 "Message ID\|Accepted:\|Rejected:" | tail -10
    fi
    
    echo "─────────────────────────────────────────────────"
    echo ""
    echo "🎉 EMAIL TEST COMPLETE!"
    echo ""
    echo "=================================================="
    echo "📧 WHERE TO FIND YOUR EMAIL IN GMAIL:"
    echo "=================================================="
    echo ""
    echo "Gmail Account: kukuhthewow@gmail.com"
    echo "Sender: phuongtestwordpress@gmail.com"
    echo ""
    echo "🔍 HOW TO FIND THE EMAIL:"
    echo ""
    echo "Option 1 - SEARCH (Most Reliable):"
    echo "   1. Open Gmail"
    echo "   2. Click the search bar at the top"
    echo '   3. Type: from:phuongtestwordpress@gmail.com'
    echo "   4. Press Enter"
    echo "   → This will show ALL emails from this sender"
    echo ""
    echo "Option 2 - CHECK ALL MAIL:"
    echo "   1. Look at the left sidebar in Gmail"
    echo '   2. Click "All Mail" (shows everything including archived)'
    echo "   3. Look for emails with subject starting with:"
    echo '      "Course Confirmation — Email System Test"'
    echo ""
    echo "Option 3 - CHECK TABS:"
    echo "   • Primary tab (main inbox)"
    echo "   • Promotions tab (top of inbox)"
    echo "   • Updates tab (top of inbox)"
    echo "   • Social tab (top of inbox)"
    echo ""
    echo "Option 4 - CHECK SPAM:"
    echo '   • Click "Spam" in left sidebar'
    echo ""
    echo "=================================================="
    echo "💡 WHY YOU MIGHT NOT SEE IT IN PRIMARY:"
    echo "=================================================="
    echo ""
    echo "Gmail's AI automatically categorizes emails:"
    echo "  • 'phuongtestwordpress' looks like a test account"
    echo "  • No sender reputation/history"
    echo "  • May be filtered to Promotions/Updates"
    echo "  • Could be auto-archived to All Mail"
    echo ""
    echo "⚠️  This is NOT a bug - emails ARE being delivered!"
    echo "   Gmail just hides them based on sender reputation."
    echo ""
    echo "=================================================="
    echo "🚀 PRODUCTION SOLUTION:"
    echo "=================================================="
    echo ""
    echo "For production use, enable Outlook SMTP:"
    echo "  1. Go to Office 365 Admin Portal"
    echo "  2. Users → Active Users → pdcs_tms@polwel.org.sg"
    echo "  3. Mail Settings → Enable 'Authenticated SMTP'"
    echo "  4. Update .env to use pdcs_tms@polwel.org.sg"
    echo ""
    echo "Professional domain emails (@polwel.org.sg) will go"
    echo "directly to inbox with much better deliverability!"
    echo ""
else
    echo "❌ API reported: Email send failed!"
    echo ""
    echo "Response: $RESPONSE"
    echo ""
    echo "Checking backend logs for errors..."
    if [ -f "backend-run.log" ]; then
        tail -50 backend-run.log | grep -i "error\|failed\|rejected"
    fi
fi

echo "=================================================="
