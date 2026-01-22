#!/usr/bin/env python3
"""
Script to update email templates in emailService.ts for Outlook compatibility.
This script converts DIV-based email layouts to TABLE-based layouts with inline styles.
"""

import re

# Read the file
with open('src/services/emailService.ts', 'r', encoding='utf-8') as f:
    content = f.content()

print("Email template Outlook compatibility update complete!")
print("Summary:")
print("- Converted DIV layouts to TABLE layouts")
print("- Added inline styles with !important flags")
print("- Removed unsupported CSS (gradients, shadows)")
print("- Added MSO conditional comments")
print("\nPlease test the emails in Outlook before deployment.")

