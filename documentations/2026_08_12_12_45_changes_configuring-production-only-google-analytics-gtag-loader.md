# Production-Only Google Analytics (GTAG) Guard Configuration

**Date & Time**: 2026-08-12 12:45 SGT  
**Modules Modified**: Frontend (`index.html`, `.env.production`, `.env.staging`, `.env`)  
**Scope**: Restricting Google Tag Manager (`G-92PJQJ7C3E` / `gtag.js`) strictly to the Production environment while completely disabling it on Staging and Local Development environments.

---

## 1. Context & Business Requirement

The client requested that Google Analytics tracking (`G-92PJQJ7C3E`) be loaded strictly on the **Production** deployment (`tms.polwel.org.sg`) and **NOT** on the **Staging** environment or local development to prevent mixing non-production test traffic with production analytics.

---

## 2. Technical Solution & Changes Made

### A. Environment Variable Isolation
1. **`.env.production`**:
   - `VITE_NODE_ENV=production`
   - `VITE_ENABLE_ANALYTICS=true`
   - `VITE_GTAG_ID=G-92PJQJ7C3E`
2. **`.env.staging`**:
   - `VITE_NODE_ENV=staging`
   - `VITE_ENABLE_ANALYTICS=false`
   - `VITE_GTAG_ID=`
3. **`.env` (Local / Default)**:
   - `VITE_NODE_ENV=development`
   - `VITE_ENABLE_ANALYTICS=false`
   - `VITE_GTAG_ID=`

### B. 4-Layer Guarded Script Injection (`index.html`)
Replaced the unconditional `<script>` tag in `index.html` with a 4-layer runtime guard script:

```html
<!-- Google tag (gtag.js) - Production Environment Only -->
<script>
  (function() {
    var gtagId = "%VITE_GTAG_ID%";
    var enableAnalytics = "%VITE_ENABLE_ANALYTICS%";
    var mode = "%MODE%";
    var host = window.location.hostname;

    // Strict Production Guard: GTAG is strictly loaded ONLY in production builds on non-staging/non-local domains
    var isValidGtagId = gtagId && !gtagId.startsWith("%") && gtagId.startsWith("G-");
    var isAnalyticsEnabled = enableAnalytics === "true";
    var isProdBuild = mode === "production";
    var isStagingOrLocal = host.includes("staging") || host.includes("localhost") || host === "127.0.0.1";

    if (isValidGtagId && isAnalyticsEnabled && isProdBuild && !isStagingOrLocal) {
      var script = document.createElement("script");
      script.async = true;
      script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(gtagId);
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', gtagId);
    }
  })();
</script>
```

#### Guard Logic Matrix:
| Environment | Build Command | `mode` | `VITE_ENABLE_ANALYTICS` | `VITE_GTAG_ID` | Domain / Host | GTAG Injected? |
|---|---|---|---|---|---|---|
| **Production** | `npm run build:production` | `production` | `true` | `G-92PJQJ7C3E` | `tms.polwel.org.sg` | ✅ **YES** |
| **Staging** | `npm run build:staging` | `staging` | `false` | *(empty)* | `polwelpdms-staging...` | ❌ **NO** |
| **Local Dev** | `npm run dev` | `development` | `false` | *(empty)* | `localhost` | ❌ **NO** |

---

## 3. Verification & Build Results

- **Production Build (`npm run build:production`)**: Clean build with **0 errors**.
- **Staging Build (`npx vite build --mode staging`)**: Clean build with **0 errors**.
- **TypeScript Compilation (`npx tsc --noEmit`)**: Clean build with **0 errors**.
