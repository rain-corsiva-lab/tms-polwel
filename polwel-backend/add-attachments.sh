#!/bin/bash
# Script to add attachment field to all mailOptions in emailService.ts

FILE="/home/kukuh/webprojects/polwel/polwel-backend/src/services/emailService.ts"

# This will find patterns like:
#   `,
#   };
# And replace with:
#   `,
#   attachments: logoAttachment ? [logoAttachment] : [],
#   };

# But only where we haven't already added it

echo "Adding attachments field to all mailOptions..."

# Using perl for multi-line replacement
perl -i -pe 's/(\s+)`\s*,\s*\n(\s+)\};/\1\`,\n\2attachments: logoAttachment ? [logoAttachment] : [],\n\2};/g unless /attachments:/' "$FILE"

echo "Done! Checking results..."
grep -n "attachments:" "$FILE" | wc -l
echo "attachments fields found"
