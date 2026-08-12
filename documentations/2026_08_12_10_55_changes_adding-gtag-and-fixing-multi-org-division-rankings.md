# Multi-Stage Division Resolution & Google Tag Manager Integration

**Date & Time**: 2026-08-12 10:55 SGT  
**Modules Modified**: `polwel-backend` (`organizationAnalyticsController.ts`), Frontend (`index.html`)  
**Scope**: 
1. Resolved single-division grouping issue on Organization Analytics Dashboard for Multi-Organization Training Coordinators.
2. Integrated Google Tag Manager (`G-92PJQJ7C3E` / `gtag.js`) into the `<head>` of all application pages.

---

## 1. Multi-Stage Division Resolution Enhancement

### Root Cause Analysis
When a Training Coordinator assigned to multiple client organizations (e.g. `Ang Mo Kio Division`, `Choa Chu Kang Division`, `Woodlands Division`, `P Division`) viewed division rankings, all enrollments were collapsing into a single generic row (`SPF`).
- `enrollment.departmentName` and `enrollment.division` were `null` for some records.
- The previous fallback stopped at `enrollment.clientOrganization?.name`, which returned generic `"SPF"`.
- Consequently, all enrollments were grouped under one single name `"SPF"`.

### Technical Solution
Updated `getDivisionsByLearnersRanking` in `polwel-backend/src/controllers/organizationAnalyticsController.ts` with a multi-stage prioritized resolution chain:

```typescript
const getDivisionName = (): string => {
  // 1. Explicit departmentName on enrollment (if specific and non-generic)
  const dept = enrollment.departmentName?.trim();
  if (dept && !['unassigned', 'n/a', 'polwel', 'spf'].includes(dept.toLowerCase())) {
    return dept;
  }

  // 2. Explicit division on enrollment
  const div = enrollment.division?.trim();
  if (div && !['unassigned', 'n/a', 'polwel', 'spf'].includes(div.toLowerCase())) {
    return div;
  }

  // 3. Client Organization Name (e.g. "Singapore Police Force - Ang Mo Kio Division", "P Division")
  const orgName = enrollment.clientOrganization?.name?.trim();
  if (orgName && !['polwel', 'spf'].includes(orgName.toLowerCase())) {
    return orgName;
  }

  // 4. Training Coordinator's Division
  const tcDiv = enrollment.trainingCoordinator?.division?.trim();
  if (tcDiv && !['unassigned', 'n/a', 'polwel', 'spf'].includes(tcDiv.toLowerCase())) {
    return tcDiv;
  }

  // 5. Training Coordinator's Organization Name
  const tcOrgName = enrollment.trainingCoordinator?.organization?.name?.trim();
  if (tcOrgName && !['polwel', 'spf'].includes(tcOrgName.toLowerCase())) {
    return tcOrgName;
  }

  // 6. Generic fallbacks
  if (dept && !['unassigned', 'n/a'].includes(dept.toLowerCase())) return dept;
  if (div && !['unassigned', 'n/a'].includes(div.toLowerCase())) return div;
  if (orgName && orgName.toLowerCase() !== 'polwel') return orgName;
  if (tcDiv) return tcDiv;
  if (tcOrgName) return tcOrgName;

  return '';
};
```

This ensures distinct, specific division and organization names (`Ang Mo Kio Division`, `Choa Chu Kang Division`, `Woodlands Division`, `P Division`, `Bedok Division / Changi NPC`, `ERT`, etc.) are rendered cleanly in the ranking table.

---

## 2. Google Tag Manager Integration (`G-92PJQJ7C3E`)

Added Google Tag Manager (`gtag.js`) directly inside the `<head>` element of `index.html` following best practices:

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-92PJQJ7C3E"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-92PJQJ7C3E');
</script>
```

---

## 3. Verification & Build Results

- **Backend TypeScript Compilation (`npx tsc --noEmit`)**: Clean build with **0 errors**.
- **Backend Production Build (`npm run build`)**: Clean build with **0 errors**.
- **Frontend TypeScript Compilation (`npx tsc --noEmit`)**: Clean build with **0 errors**.
- **Frontend Production Build (`npm run build`)**: Clean build with **0 errors**.
