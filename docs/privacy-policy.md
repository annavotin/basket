# Privacy Policy

**Batch — Meal Prep Tracker**
Last updated: June 25, 2026

---

## Who we are

Batch is a meal prep tracking app made by Anna Votin. If you have questions about this policy, email **avotin28@gmail.com**.

---

## What data we collect and why

### Account information
When you create an account, we collect your **email address** and a **password** (stored as a secure hash — we never see the plaintext). We use this solely to let you sign in and sync your data across devices.

You can use Batch in local-only mode without creating an account. In that case, no account data is collected.

### App content you create
When you use Batch, you create meal prep cycles, pantry items, extra meals, and custom food entries. This includes:
- Food names, weights, and calorie/macro values you enter
- Dates of your meal prep cycles
- Display name and unit preferences

If you are signed in, this data is synced to our servers (Supabase) so it is available across your devices. If you are not signed in, it stays only on your device.

### Receipt images
If you use the receipt scan feature, you select a photo from your photo library. That image is compressed on your device and sent to our server, which forwards it to a third-party AI service (Anthropic Claude) to extract food line items. **The image is not stored on our servers** — it is processed in memory and the result (a list of food names and estimated calories) is returned to your device. The temporary image transmission is encrypted in transit.

### Barcode scans
When you scan a product barcode or search for a food by name, the barcode number or search term is sent to two public nutritional databases to look up information:

- **Open Food Facts** (world.openfoodfacts.org) — tried first for branded products. No personal information is included.
- **USDA FoodData Central** (api.nal.usda.gov) — used as a fallback for barcodes not found in Open Food Facts, and in parallel for name searches. No personal information is included.

### Device permissions
- **Camera** — used only to scan barcodes. We do not access the camera at any other time.
- **Photo library** — accessed only when you choose to scan a receipt. We read only the image you select.

We do not access your contacts, location, microphone, or any other device data.

---

## What we do NOT collect

- Location data
- Device identifiers or advertising IDs
- Browsing or usage analytics
- Crash reports sent to third-party analytics services
- Any data from contacts, calendar, or other apps

---

## Who we share data with

| Recipient | Purpose | Data shared |
|-----------|---------|-------------|
| **Supabase** (supabase.com) | Database and authentication hosting | Account credentials, app content you create |
| **Open Food Facts** (world.openfoodfacts.org) | Barcode / name → nutrition lookup (primary) | Barcode number or food name only |
| **USDA FoodData Central** (api.nal.usda.gov) | Barcode / name → nutrition lookup (fallback) | Barcode number or food name only |
| **Anthropic** (anthropic.com) | Receipt image parsing | Receipt image (not stored by Anthropic per their API policy) |

We do not sell your data. We do not share it with advertisers.

---

## Data retention

- **Account and app data** is kept as long as your account exists.
- You can delete your account at any time from Settings → Account → Delete Account. This permanently deletes your account and all synced data from our servers.
- Local-only data (no account) is stored on your device and can be removed by deleting the app.

---

## Security

Your password is hashed by Supabase before storage. Data in transit is encrypted using TLS. We do not have access to your plaintext password.

---

## Children

Batch is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal data, contact us and we will delete it.

---

## Your rights

Depending on where you live, you may have the right to:
- Access the personal data we hold about you
- Correct inaccurate data
- Delete your data (use the in-app Delete Account feature, or email us)
- Export your data (email us)

To exercise any of these rights, email **avotin28@gmail.com**.

---

## Changes to this policy

If we make material changes, we will update the "Last updated" date above. Continued use of the app after changes constitutes acceptance of the updated policy.

---

## Contact

Anna Votin
avotin28@gmail.com
