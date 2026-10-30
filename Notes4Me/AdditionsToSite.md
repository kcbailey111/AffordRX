# Additions/Revisions to Site
----------------------------------

# Insurance vs. Cash Price Comparator
**The Problem:** Many citizens blindly hand their insurance card to the pharmacist, assuming copays are always the lowest price. In reality, a cash discount card (like GoodRx or RxSaver) is frequently cheaper than a commercial insurance copay for generic medications.

**The Addition:** A toggle or input field allowing users to enter their insurance tier or copay estimate alongside cash prices, displaying a side-by-side comparison ("Your Insurance Copay: $25 | AffordRX Cash Price: $12").

**The Engineering Challenge:** You would need a rules engine or localized lookup table mapping insurance formularies, which change constantly. Is your current data pipeline robust enough to handle multi-variable pricing vectors?

# Intelligent Dosage & Quantity Normalization
**The Problem:** Pharmacy pricing is notoriously deceptive. A pharmacy might list a 30-day supply of a 10mg tablet as $15, but a 90-day supply of 20mg tablets (which can be safely split in half with a pill cutter) as $20—effectively quadrupling the value.

**The Addition:** An algorithm that automatically calculates and displays "Cost per Unit" (e.g., cost per pill or cost per milligram) and suggests cost-saving alternatives like quantity scaling or pill-splitting where medically viable (with appropriate disclaimers).

**The Engineering Challenge:** Your database schema must normalize disparate units (tablets, milliliters, inhaler puffs, patches) into a unified pricing model before sorting results.

# ~~Symptom Picker~~
**Addition:** (pain, allergies, heartburn, diarrhea) that maps to those drugs would match how people actually search. Brand names such as Advil or Zyrtec can sit on the same list; some aliases are already in the code.

# ~~What the Numbers Actually Mean~~
**Additions:** Prices are scaled from one baseline strength and quantity per drug, and the Spartanburg area is in the “Near” menu before that metro’s scrape exists. A short disclaimer — estimate, not a quote, not medical advice — plus a note when a price is modeled rather than scraped would keep the freshness badge and the “32% average savings” figure credible. A report a wrong price link would help the same way.

# AI Chatbot

## Minor Additions to Site
# Printable/Shareable Result
**Additions:** share or print one result for a family member, the generic-alternatives card that is already written and commented out, and a resource for community health centers, separate from the free-clinics card.
# ~~Membership Warning~~
**Additions:** Costco and Sam’s Club show up in the rankings. Call out that those prices usually require a membership.

# Price per tablet
**Additions:** Totals for 30, 60, and 90 count are hard to compare. A per-unit price next to the total would make the quantity dropdown meaningful.


# Priority List
**~~Symptom Picker~~, ~~Membership Warning~~, ~~What the Numbers Actually Mean~~, Price per Tablet, Printable/Shareable Results**
