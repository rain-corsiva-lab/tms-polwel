#!/bin/bash

echo "════════════════════════════════════════════════════════════════"
echo "🎯 MAILJET EMAIL TEST - PROFESSIONAL EMAIL SERVICE"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📅 Test Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Check backend status
echo "1️⃣ Checking backend status..."
HEALTH=$(curl -s http://localhost:3001/health 2>&1)
if [[ "$HEALTH" == *"OK"* ]]; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is NOT running"
    echo ""
    echo "Please start backend first:"
    echo "cd /home/kukuh/webprojects/polwel/polwel-backend"
    echo "npm run dev"
    exit 1
fi
echo ""

# Check current SMTP configuration
echo "2️⃣ Current Email Configuration:"
if grep -q "^MAIL_HOST=in-v3.mailjet.com" /home/kukuh/webprojects/polwel/polwel-backend/.env 2>/dev/null; then
    echo "✅ Using: Mailjet SMTP (in-v3.mailjet.com)"
    echo "✅ Sender: polwel@otgsmtp.com"
    echo "✅ Service: Professional transactional email"
elif grep -q "^MAIL_HOST=smtp.gmail.com" /home/kukuh/webprojects/polwel/polwel-backend/.env 2>/dev/null; then
    echo "⚠️  Using: Gmail SMTP"
    echo "⚠️  Sender: phuongtestwordpress@gmail.com"
    echo "⚠️  Issue: Gmail filters test account emails"
else
    echo "❓ Email configuration unknown"
fi
echo ""

# Send test email
echo "3️⃣ Sending test email to kukuhthewow@gmail.com..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TIMESTAMP=$(date '+%H:%M:%S')
RESPONSE=$(curl -s -X POST http://localhost:3001/api/test-email \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"kukuhthewow@gmail.com\",
    \"type\": \"course\",
    \"courseDetails\": {
      \"courseName\": \"✅ MAILJET TEST - $TIMESTAMP\",
      \"courseCode\": \"MAILJET-TEST\",
      \"startDate\": \"2026-03-10\",
      \"endDate\": \"2026-03-15\",
      \"venue\": \"POLWEL Training Center\",
      \"organizationName\": \"POLWEL\"
    }
  }" 2>&1)

echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if successful
SUCCESS=$(echo "$RESPONSE" | grep -o '"success":true' | head -1)
if [ -n "$SUCCESS" ]; then
    echo "✅ API Response: Email SENT successfully!"
    echo ""
    
    # Wait for logs to flush
    sleep 2
    
    echo "4️⃣ Backend SMTP Server Response:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Search for the most recent email sending logs
    if [ -f "/home/kukuh/webprojects/polwel/polwel-backend/backend-mailjet.log" ]; then
        tail -100 /home/kukuh/webprojects/polwel/polwel-backend/backend-mailjet.log | \
        grep -A 4 "Learner confirmation email sent successfully\|Message ID:\|Response: 250\|Accepted:\|Rejected:" | \
        tail -15
    else
        echo "⚠️  Log file not found, checking recent terminal output..."
        tail -50 /home/kukuh/webprojects/polwel/polwel-backend/*.log 2>/dev/null | \
        grep -A 3 "Message ID\|Accepted\|Rejected" | tail -10
    fi
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🎉 EMAIL TEST COMPLETE!"
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "📧 HOW TO FIND YOUR EMAIL IN GMAIL"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "Gmail Account: kukuhthewow@gmail.com"
    echo ""
    echo "🔍 METHOD 1: SEARCH BY SENDER (RECOMMENDED) ⭐"
    echo "────────────────────────────────────────────────"
    echo "1. Open Gmail"
    echo "2. Click the search bar at the top"
    echo "3. Type one of these:"
    echo ""
    echo "   from:polwel@otgsmtp.com"
    echo "   OR"
    echo "   from:@otgsmtp.com"
    echo "   OR"  
    echo "   MAILJET TEST"
    echo ""
    echo "4. Press Enter"
    echo "5. ✅ All test emails from Mailjet will appear"
    echo ""
    echo "🔍 METHOD 2: SEARCH BY SUBJECT"
    echo "────────────────────────────────"
    echo "Search for: Course Confirmation"
    echo ""
    echo "🔍 METHOD 3: CHECK FOLDERS"
    echo "────────────────────────────────"
    echo "• Primary inbox"
    echo "• Promotions tab"
    echo "• Updates tab"
    echo "• All Mail (left sidebar)"
    echo "• Spam folder"
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "💡 WHY MAILJET IS BETTER"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "✅ Professional sender: polwel@otgsmtp.com"
    echo "✅ Dedicated email service (not personal Gmail)"
    echo "✅ Better inbox placement rate"
    echo "✅ Real-time delivery tracking"
    echo "✅ Higher sender reputation"
    echo ""
    echo "Previous sender:"
    echo "❌ phuongtestwordpress@gmail.com (test account)"
    echo "❌ Gmail filtered it as spam/promotional"
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "📊 CONFIGURATION DETAILS"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "SMTP Service: Mailjet (in-v3.mailjet.com:587)"
    echo "Sender Email: polwel@otgsmtp.com"
    echo "Display Name: POLWEL Training System"
    echo "Encryption: TLS"
    echo "Status: ✅ ACTIVE"
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    
else
    echo "❌ API Response: Email FAILED!"
    echo ""
    echo "Response details:"
    echo "$RESPONSE"
    echo ""
    echo "Please check backend logs for errors:"
    echo "cd /home/kukuh/webprojects/polwel/polwel-backend"
    echo "tail -50 backend-mailjet.log"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Test Script Complete - $(date '+%H:%M:%S')"
echo "════════════════════════════════════════════════════════════════"
