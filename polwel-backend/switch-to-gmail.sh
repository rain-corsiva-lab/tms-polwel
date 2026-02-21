#!/bin/bash
# Quick fix: Switch back to Gmail SMTP for faster delivery

echo "════════════════════════════════════════════════════════════════"
echo "   🔄 SWITCHING TO GMAIL SMTP (Fast Delivery)"
echo "════════════════════════════════════════════════════════════════"
echo ""

cd /home/kukuh/webprojects/polwel/polwel-backend

echo "📝 Current configuration:"
grep "MAIL_HOST\|MAIL_FROM_ADDRESS" .env | grep -v "^#"
echo ""

echo "❓ Do you want to switch to Gmail SMTP?"
echo "   Gmail → Gmail delivery is usually 10-20 seconds (as you mentioned)"
echo ""
echo "⚠️  You'll need:"
echo "   1. Gmail address"
echo "   2. Gmail App Password (from https://myaccount.google.com/apppasswords)"
echo ""
echo "Press Ctrl+C to cancel or Enter to continue..."
read

echo ""
echo "Enter Gmail address (e.g., your.email@gmail.com):"
read GMAIL_ADDRESS

echo ""
echo "Enter Gmail App Password (16 characters, no spaces):"
read -s GMAIL_PASSWORD

echo ""
echo "🔧 Updating .env file..."

# Backup current .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Update .env to use Gmail
sed -i 's/^MAIL_HOST=.*/MAIL_HOST=smtp.gmail.com/' .env
sed -i 's/^MAIL_PORT=.*/MAIL_PORT=587/' .env
sed -i 's/^MAIL_ENCRYPTION=.*/MAIL_ENCRYPTION=STARTTLS/' .env
sed -i "s/^MAIL_FROM_ADDRESS=.*/MAIL_FROM_ADDRESS=$GMAIL_ADDRESS/" .env
sed -i "s/^MAIL_USERNAME=.*/MAIL_USERNAME=$GMAIL_ADDRESS/" .env
sed -i "s/^MAIL_PASSWORD=.*/MAIL_PASSWORD=$GMAIL_PASSWORD/" .env

echo "✅ Configuration updated!"
echo ""

echo "🔄 Restarting backend..."
killall -9 node nodemon ts-node 2>/dev/null
sleep 2
nohup npm run dev > backend-gmail.log 2>&1 &
sleep 5

echo ""
echo "✅ Backend restarted with Gmail SMTP"
echo ""
echo "📧 Sending test email..."
sleep 3

curl -X POST http://localhost:3001/api/test-email \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"$GMAIL_ADDRESS\",\"type\":\"course\",\"courseDetails\":{\"courseName\":\"TEST - Gmail SMTP - $(date +%T)\",\"courseCode\":\"GMAIL-TEST\"}}"

echo ""
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Done! Check your Gmail inbox now (should arrive in 10-20 sec)"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📊 Check backend log:"
echo "   tail -50 backend-gmail.log"
echo ""
echo "💡 Backup saved to: .env.backup.$(date +%Y%m%d)_*"
echo "════════════════════════════════════════════════════════════════"
