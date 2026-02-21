#!/bin/bash

echo "════════════════════════════════════════════════════════════════"
echo "   🔍 EMAIL AUTHENTICATION DIAGNOSTIC"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Check DNS records for otgsmtp.com
DOMAIN="otgsmtp.com"

echo "📧 Checking DNS records for: $DOMAIN"
echo ""

echo "1️⃣  SPF Record (Sender Policy Framework):"
echo "   Verifies sender is authorized..."
dig +short TXT $DOMAIN | grep -i "spf" || echo "   ❌ No SPF record found"
echo ""

echo "2️⃣  DKIM Record (DomainKeys Identified Mail):"
echo "   Verifies email hasn't been tampered..."
dig +short TXT default._domainkey.$DOMAIN || echo "   ❌ No DKIM record found"
dig +short TXT mailjet._domainkey.$DOMAIN || echo "   ✅ Checking Mailjet DKIM..."
echo ""

echo "3️⃣  DMARC Record (Domain-based Message Authentication):"
echo "   Policy for failed auth..."
dig +short TXT _dmarc.$DOMAIN || echo "   ❌ No DMARC record found"
echo ""

echo "4️⃣  MX Records (Mail Exchange):"
echo "   Mail servers for this domain..."
dig +short MX $DOMAIN || echo "   ⚠️  No MX records found"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "   📊 DIAGNOSIS"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "If any of the above show ❌, Gmail may be filtering emails"
echo "to Spam or blocking them entirely."
echo ""
echo "✅ SOLUTION OPTIONS:"
echo ""
echo "1. Use official POLWEL domain email:"
echo "   pdcs_tms@polwel.org.sg (needs proper SMTP auth)"
echo ""
echo "2. Configure SPF/DKIM/DMARC for otgsmtp.com"
echo "   (requires DNS access)"
echo ""
echo "3. Use Gmail SMTP with App Password"
echo "   (but Gmail may still filter test emails)"
echo ""
echo "════════════════════════════════════════════════════════════════"
