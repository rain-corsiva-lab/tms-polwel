# Universal Email Template Guide
## Outlook-Compatible Email Styling for POLWEL

**Date:** January 22, 2026  
**Issue:** Email templates showing white text on white background in Outlook  
**Solution:** Universal table-based layouts with aggressive inline styling

---

## 🎯 The Problem

Outlook 2016+ uses the **Microsoft Word rendering engine**, which has extremely limited CSS support:
- ❌ No `border-radius`, `box-shadow`, `background-image`
- ❌ No gradients, transforms, or modern CSS
- ❌ No external/embedded stylesheets (strips `<style>` tags)
- ❌ No flexbox, grid, or modern layouts
- ⚠️ Only supports basic inline styles with `!important` flags

---

## ✅ The Solution: Universal Email Template Pattern

### Core Principles

1. **Table-based layouts only** - No DIVs for structure
2. **Inline styles with `!important`** - Every single style property
3. **`bgcolor` HTML attributes** - Critical for background colors in Outlook
4. **Outlook VML conditional comments** - For dark backgrounds
5. **Arial font only** - Universally available
6. **No CSS properties Outlook doesn't support**

---

## 📋 Universal Template Structure

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!--[if mso]>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
    <![endif]-->
    <title>Email Title</title>
  </head>
  <body style="margin: 0 !important; padding: 0 !important; background-color: #f5f5f5 !important; font-family: Arial, sans-serif !important;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5 !important;">
      <tr>
        <td align="center" style="padding: 40px 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%;">
            
            <!-- HEADER WITH DARK BACKGROUND -->
            <tr>
              <td bgcolor="#1f2937" style="padding: 32px 24px; background-color: #1f2937 !important; text-align: center;">
                <!--[if mso]>
                <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fillcolor="#1f2937" stroke="false" style="width:552px;height:auto;">
                <v:textbox inset="0,0,0,0">
                <![endif]-->
                <h1 style="margin: 0 0 8px 0 !important; padding: 0 !important; font-size: 26px !important; font-weight: 700 !important; color: #ffffff !important; font-family: Arial, sans-serif !important;">Email Title</h1>
                <p style="margin: 0 !important; padding: 0 !important; font-size: 14px !important; color: #e5e7eb !important; font-family: Arial, sans-serif !important;">Subtitle</p>
                <!--[if mso]>
                </v:textbox>
                </v:rect>
                <![endif]-->
              </td>
            </tr>
            
            <!-- CONTENT WITH WHITE BACKGROUND -->
            <tr>
              <td bgcolor="#ffffff" style="padding: 32px 24px; background-color: #ffffff !important;">
                <p style="font-size: 16px !important; margin: 0 0 16px 0 !important; padding: 0 !important; color: #1f2937 !important; font-family: Arial, sans-serif !important;">Content here</p>
              </td>
            </tr>
            
            <!-- FOOTER WITH DARK BACKGROUND -->
            <tr>
              <td bgcolor="#1f2937" style="padding: 24px; text-align: center; background-color: #1f2937 !important;">
                <!--[if mso]>
                <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fillcolor="#1f2937" stroke="false" style="width:552px;height:auto;">
                <v:textbox inset="0,0,0,0">
                <![endif]-->
                <p style="margin: 0 !important; padding: 0 !important; font-size: 12px !important; color: #d1d5db !important; font-family: Arial, sans-serif !important;">Footer content</p>
                <!--[if mso]>
                </v:textbox>
                </v:rect>
                <![endif]-->
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 🎨 Safe Color Palette

Use these colors that work universally:

### Dark Backgrounds (with VML comments)
```
#1f2937 - Primary dark (headers/footers)
#374151 - Secondary dark
#4b5563 - Tertiary dark
```

### Light Backgrounds
```
#ffffff - White (content areas)
#f8fafc - Very light gray (cards/highlights)
#f5f5f5 - Light gray (page background)
```

### Text Colors
```
#ffffff - White text (on dark backgrounds)
#1f2937 - Primary dark text
#374151 - Secondary text
#475569 - Tertiary text
#6b7280 - Muted text
#d1d5db - Light text (on dark backgrounds)
#e5e7eb - Very light text (on dark backgrounds)
```

### Borders
```
#d1d5db - Standard borders
#e5e7eb - Light borders
```

---

## 🔧 Required Attributes for Every Element

### Table Cells with Background Colors
```html
<td bgcolor="#1f2937" style="background-color: #1f2937 !important;">
```

### Text Elements
```html
<p style="margin: 0 !important; padding: 0 !important; font-size: 14px !important; color: #1f2937 !important; font-family: Arial, sans-serif !important;">
```

### Links
```html
<a href="URL" style="color: #9ca3af !important; text-decoration: underline !important; font-family: Arial, sans-serif !important;">
```

### Buttons (as links)
```html
<a href="URL" style="display: inline-block; background-color: #1f2937 !important; color: #ffffff !important; padding: 15px 30px; text-decoration: none; font-weight: 700 !important; font-size: 16px !important; font-family: Arial, sans-serif !important;">
```

---

## 📦 Common Components

### Code Display Box
```html
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
  <tr>
    <td bgcolor="#f8fafc" style="background-color: #f8fafc !important; border: 2px solid #d1d5db; padding: 24px; text-align: center;">
      <div style="text-transform: uppercase; font-size: 13px !important; letter-spacing: 2px; color: #4b5563 !important; font-weight: 600 !important; margin-bottom: 12px; font-family: Arial, sans-serif !important;">LABEL</div>
      <div style="font-size: 38px !important; letter-spacing: 12px; font-weight: 700 !important; color: #1f2937 !important; font-family: Arial, sans-serif !important;">CODE123</div>
    </td>
  </tr>
</table>
```

### Information Card
```html
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
  <tr>
    <td bgcolor="#f8fafc" style="padding: 20px 24px; background-color: #f8fafc !important; border: 1px solid #e5e7eb;">
      <p style="margin: 0 0 12px 0 !important; padding: 0 !important; font-size: 15px !important; font-weight: 600 !important; color: #1f2937 !important; font-family: Arial, sans-serif !important;">Title:</p>
      <p style="margin: 0 !important; padding: 0 !important; font-size: 14px !important; color: #475569 !important; font-family: Arial, sans-serif !important;">Content here</p>
    </td>
  </tr>
</table>
```

### Numbered List
```html
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
  <tr>
    <td style="padding-bottom: 10px; font-size: 14px !important; color: #475569 !important; font-family: Arial, sans-serif !important;">
      <span style="display: inline-block; width: 20px; height: 20px; background-color: #4b5563 !important; color: #ffffff !important; font-weight: 700 !important; font-size: 12px !important; text-align: center; margin-right: 10px; font-family: Arial, sans-serif !important;">1</span>
      First item text
    </td>
  </tr>
  <tr>
    <td style="padding-bottom: 10px; font-size: 14px !important; color: #475569 !important; font-family: Arial, sans-serif !important;">
      <span style="display: inline-block; width: 20px; height: 20px; background-color: #4b5563 !important; color: #ffffff !important; font-weight: 700 !important; font-size: 12px !important; text-align: center; margin-right: 10px; font-family: Arial, sans-serif !important;">2</span>
      Second item text
    </td>
  </tr>
</table>
```

---

## 🚫 What NOT to Use

### Forbidden CSS Properties
- `border-radius` - Outlook ignores it
- `box-shadow` - Not supported
- `background-image` - Stripped
- `background: linear-gradient()` - Stripped
- `background: radial-gradient()` - Stripped
- `transform` - Not supported
- `display: flex` - Not supported
- `display: grid` - Not supported
- Custom fonts via `@font-face` - Won't load

### Forbidden HTML
- `<div>` for layout structure (use `<table>` instead)
- `<style>` tags in `<head>` - Outlook strips them
- External stylesheets - Won't load
- `class` attributes without inline styles - Ignored

---

## ✅ Fixed Email Templates

### Completed (Universal Outlook-Compatible)
1. **MFA Code Email** (`sendMfaCodeEmail`) - ✅ Lines 411-555
2. **POLWEL User Setup Email** (`sendPolwelUserSetupEmail`) - ✅ Lines 583-684

### Pending Fixes (Use Same Pattern)
3. **Password Reset Email** (`sendPasswordResetEmail`) - Line 300
4. **Trainer Setup Email** (`sendTrainerSetupEmail`) - Line 82
5. **Coordinator Setup Email** (`sendCoordinatorSetupEmail`) - Line 188
6. **Trainer Assignment Email** (`sendTrainerAssignmentEmail`) - Line 672
7. **Course Confirmation Email** (`sendLearnerCourseConfirmationEmail`) - Line 907
8. **Course Cancellation Email** (`sendCourseCancellationEmail`) - Line 1192
9. **Course Completion Email** (`sendCourseCompletionEmail`) - Line 1372

---

## 🧪 Testing Checklist

After updating each template, test in:

### Email Clients
- ✅ Outlook 2016/2019/365 (Windows)
- ✅ Outlook.com (Web)
- ✅ Gmail (Web + Mobile)
- ✅ Apple Mail (macOS + iOS)
- ✅ Thunderbird

### Dark Mode
- Test in clients with dark mode enabled
- Ensure text remains readable
- Verify background colors don't invert

### Mobile Responsive
- Test on iOS and Android email apps
- Verify 600px width constraint works
- Check readability on small screens

---

## 📝 Implementation Steps

For each remaining email template:

1. **Locate the template** in [emailService.ts](../polwel-backend/src/services/emailService.ts)
2. **Replace `<style>` tags** - Remove all embedded CSS
3. **Convert DIVs to TABLEs** - Use nested tables for layout
4. **Add `bgcolor` attributes** - On all `<td>` with background colors
5. **Add VML comments** - For dark backgrounds (#1f2937)
6. **Inline all styles** - Every property with `!important`
7. **Use Arial font** - Replace all font families
8. **Remove forbidden properties** - No border-radius, shadows, gradients
9. **Test in Outlook** - Send test emails and verify rendering
10. **Document changes** - Update this guide with any new patterns

---

## 🎯 Quick Reference

### Inline Style Template
```html
style="margin: 0 !important; padding: 0 !important; font-size: 14px !important; color: #1f2937 !important; font-family: Arial, sans-serif !important;"
```

### Dark Header Template
```html
<td bgcolor="#1f2937" style="padding: 32px 24px; background-color: #1f2937 !important; text-align: center;">
  <!--[if mso]>
  <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fillcolor="#1f2937" stroke="false" style="width:552px;height:auto;">
  <v:textbox inset="0,0,0,0">
  <![endif]-->
  <h1 style="margin: 0 0 8px 0 !important; padding: 0 !important; font-size: 26px !important; font-weight: 700 !important; color: #ffffff !important; font-family: Arial, sans-serif !important;">Title</h1>
  <!--[if mso]>
  </v:textbox>
  </v:rect>
  <![endif]-->
</td>
```

---

## 📚 Resources

- [Outlook CSS Support](https://www.campaignmonitor.com/css/style-element/style-in-head/)
- [Email Client CSS Support Matrix](https://www.caniemail.com/)
- [Litmus Email Testing](https://www.litmus.com/)
- [Can I Email?](https://www.caniemail.com/)

---

## 🔄 Maintenance Notes

- Always test email changes in Outlook before deploying
- Keep this guide updated with new patterns discovered
- Document any client-specific issues encountered
- Maintain color palette consistency across all templates

---

**Status:** 2 of 10 templates fixed (January 22, 2026)  
**Next Priority:** Password Reset Email (most critical for user auth)
