# AffordRX: Tiered Paywall & Pricing Strategy Guide

This guide outlines the feature distribution, pricing structure, and behavioral psychology strategy for implementing a subscription paywall on **AffordRX** (South Carolina Prescription & OTC Drug Price Directory).

---

## 1. Feature Tiering Architecture

| Feature | Free Tier ($0) | Pro Tier ($4.99/mo) | Pro+ Tier ($12.99–$14.99/mo) |
| :--- | :--- | :--- | :--- |
| **Target Audience** | Casual searchers, one-off lookup users | Individuals & families managing regular meds | Caregivers, health advocates, power users |
| **Search Volume** | Limited (e.g., 5 searches/month) | Unlimited | Unlimited |
| **Pharmacy Access** | Top 3 lowest prices nearby | Full directory (300+ SC pharmacies) | Full directory + priority scrape queue |
| **Dosage & Scaling** | Default options only | Custom pill counts & 30 vs. 90-day supply | Custom scaling + multi-med bundled pricing |
| **Saved Medications** | None | Personal Medication Vault / Tracker | Multi-Patient / Multi-Profile Management |
| **Price Alerts** | None | Email & SMS price drop alerts | Priority alerts & historical price trends |
| **Exporting & Sharing**| None | None | PDF/CSV comparison reports for doctors |
| **Savings Optimization**| Public savings resources only | Standard coupon matches | Advanced Insurance & Coupon Stacking |

---

## 2. Pricing & Behavioral Psychology Analysis

Setting **Pro at $4.99/month** and **Pro+ at $12.99–$14.99/month** creates a well-calibrated SaaS pricing ladder that maximizes conversions while appealing to price-conscious healthcare consumers.

### Psychological Triggers Applied

1. **Price Anchoring & The Decoy Effect**
   * Highlighting **Pro+ ($14.99/mo)** sets a higher mental reference point.
   * By comparison, **Pro ($4.99/mo)** feels low-friction and accessible, shifting the consumer mindset from *"Should I spend $5?"* to *"Compared to $15, $5 is a steal."*
2. **The Compromise Effect (Center-Stage Framing)**
   * When presented with three options (Free, Pro, Pro+), consumers naturally avoid extremes. 
   * Free feels restricted, Pro+ feels like overkill, making **Pro** the natural "compromise choice." Highlight Pro with a **"Most Popular"** badge.
3. **Immediate ROI (Return on Investment) Framing**
   * Prescription drug price spreads across local SC pharmacies often range between **$15 to $50 per refill**.
   * Position the $4.99 fee against instant savings: *"Save an average of $25 on your next refill for less than the cost of a cup of coffee."*
4. **Charm Pricing (.99 Endings)**
   * Leveraging the **left-digit effect**: $4.99 is cognitively processed under the "$4" benchmark rather than "$5", lowering perceived friction by 10–20%.

---

## 3. Pro+ Tier Decision Framework ($9.99 vs. $14.99)

* **Choose $9.99/mo if:** The primary target is standard families with multiple dependents (kids/aging parents) who need multi-profile support without enterprise features.
* **Choose $12.99–$14.99/mo if:** Pro+ includes exportable PDF reports for healthcare providers, advanced coupon stacking, or tools designed for community health advocates and clinics.

---

## 4. Next Implementation Steps

1. **Authentication:** Set up user authentication (e.g., Supabase Auth, Firebase, or Clerk) to manage tier roles (`free`, `pro`, `pro_plus`).
2. **Payment Processing:** Implement Stripe Checkout and Customer Portal for subscription management and webhook listeners.
3. **Feature Gating:** Wrap premium UI components and API endpoints with role-based checks.