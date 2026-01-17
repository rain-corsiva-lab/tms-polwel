# Outlook 365 SMTP Configuration Guide - POLWEL Training System

## Problem: SmtpClientAuthentication is Disabled

The Outlook 365 tenant has SMTP authentication disabled by default for security reasons.

**Error Message:**
```
Invalid login: 535 5.7.139 Authentication unsuccessful, SmtpClientAuthentication is disabled for the Tenant.
```

## Solutions

### Solution 1: Use App Password (Recommended for Personal Accounts)

This is the easiest method for personal Outlook accounts.

#### Step 1: Generate App Password

1. Go to: https://account.microsoft.com/account/manage-my-microsoft-account
2. Click on **Security** in the left sidebar
3. Under "Advanced security options", click on **App passwords**
4. Select:
   - **App**: Mail
   - **Device**: Windows Phone (or other device)
5. Click **Create**
6. Microsoft will generate a 16-character password like: `xxxx xxxx xxxx xxxx`
7. **Copy this password exactly as shown** (including spaces)

#### Step 2: Update .env File

Replace the password in your `.env` file with the 16-character app password:

```dotenv
MAIL_PASSWORD=xxxx xxxx xxxx xxxx
```

**Important:** Remove any spaces when pasting into .env if your system doesn't support spaces in passwords:
```dotenv
MAIL_PASSWORD=xxxxxxxxxxxxxxxx
```

#### Step 3: Test Configuration

```bash
cd polwel-backend
node test-smtp.js
```

### Solution 2: Enable SMTP Auth in Azure AD (For Organizations)

This requires administrator access to the Microsoft 365 tenant.

#### Step 1: Access Admin Center

1. Go to: https://admin.microsoft.com/
2. Sign in with your admin account
3. Navigate to **Settings > Mail**
4. Find **SMTP AUTH** setting
5. Enable it

#### Step 2: Update .env File

Use your regular Microsoft account password (or app password):

```dotenv
MAIL_USERNAME=pdcs_tms@polwel.org.sg
MAIL_PASSWORD=YourPassword
```

#### Step 3: Test Configuration

```bash
cd polwel-backend
node test-smtp.js
```

## Current Configuration

Your `.env` is already configured with:

```dotenv
MAIL_HOST=smtp-mail.outlook.com
MAIL_PORT=587
MAIL_ENCRYPTION=STARTTLS
MAIL_FROM_ADDRESS=pdcs_tms@polwel.org.sg
```

These settings are **correct according to official Microsoft documentation**.

## What to Do Now

1. **Generate an App Password** following Solution 1 above
2. **Update the MAIL_PASSWORD** in `.env`
3. **Run the test**: `node test-smtp.js`
4. **Rebuild and restart** the backend:
   ```bash
   npm run build
   npm run dev
   ```

## Fallback: Use Mailjet

If you cannot use App Password or enable SMTP Auth, uncomment the Mailjet configuration in `.env`:

```dotenv
# Outlook 365 (Disabled - requires App Password or SMTP Auth enabled)
# MAIL_MAILER=smtp
# MAIL_HOST=smtp-mail.outlook.com
# ...

# Mailjet SMTP (Fallback)
MAIL_MAILER=smtp
MAIL_HOST=in-v3.mailjet.com
MAIL_PORT=587
MAIL_USERNAME=2ec681a88779802cbda385f4a0971039
MAIL_PASSWORD=bb77350e7dc5f6d112ec8d7b5771acf0
MAIL_FROM_ADDRESS=polwel@otgsmtp.com
```

## Verification Checklist

- [ ] Generated App Password from Microsoft account
- [ ] Updated MAIL_PASSWORD in .env with 16-char password
- [ ] Ran `npm run build` in polwel-backend
- [ ] Ran `node test-smtp.js` - got "✅ SMTP Connection SUCCESSFUL!"
- [ ] Ran `npm run dev` to restart backend
- [ ] Tested password reset email from frontend
- [ ] Email was received successfully

## Technical Details

**Official Microsoft Documentation:**
- IMAP: outlook.office365.com:993
- POP: outlook.office365.com:995  
- **SMTP: smtp-mail.outlook.com:587** ← We use this
- Encryption: STARTTLS (not SSL)
- Auth: OAuth2/Modern Auth (App Password or SMTP Auth enabled)

**Nodemailer Configuration:**
```javascript
{
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false,  // false for STARTTLS, true for SSL
  auth: {
    user: 'pdcs_tms@polwel.org.sg',
    pass: 'YOUR_APP_PASSWORD_HERE'  // 16-character app password
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  }
}
```

## Support

If you still get authentication errors:

1. **Verify the password**: Make sure you copied the full 16-character app password
2. **Check spaces**: The password may have spaces - check if your system requires them
3. **Wait a few minutes**: Sometimes it takes time for app password to activate
4. **Try different app**: Generate password for different app/device combo
5. **Contact Microsoft Support**: If SMTP Auth cannot be enabled by admin

---

**Next Step:** Follow Solution 1 to generate your App Password and update your .env file.
