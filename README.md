# RiskPro pilot

Offline-first pre-work risk assessment for a rugged Android tablet.

Five tabs: Dashboard, Records, New, Submit, and Profile. New opens the five-step wizard. Saving a draft does not require a supervisor signature. The supervisor authorizes the record on the review screen, then Submit posts ready records to `https://api.riskpro.co.za/v1/sync`. A network or SSL failure leaves the record ready on the device.

```bash
npm install
npx expo start
npx tsc --noEmit
```
