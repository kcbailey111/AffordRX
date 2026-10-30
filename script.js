/**
 * Author: Kyler Bailey
 * Date: 2026-10-29
 * Description: JavaScript code for AffordRX web 
 * application to find affordable medication prices.
 */

// Global variables
let medicationData = [];
let greenvilleMedicationData = [];  // NEW: Store Greenville-specific data
let csvLoaded = false;
let greenvilleCsvLoaded = false;    // NEW: Track Greenville CSV load status
let map;
let currentMarkers = [];
/** Additional markers when user enables “show all on map” (beyond top 10). */
let mapExtraMarkers = [];
/** Pin shown when a result card is clicked and that pharmacy is not already on the map. */
let focusMarker = null;
/** Loaded from pharmacies.json at runtime */
let pharmacies = [];

/** Max pharmacy rows to show after sorting by price (best first). */
const RESULTS_TOP_N = 10;

/** Approximate centers for “search near” (South Carolina). */
const SEARCH_CENTERS = {
    greenville: { lat: 34.8526, lng: -82.3940, label: 'Greenville area' },
    spartanburg: { lat: 34.9496, lng: -81.9310, label: 'Spartanburg area' },
    columbia: { lat: 34.0007, lng: -81.0348, label: 'Columbia area' },
    charleston: { lat: 32.7765, lng: -79.9311, label: 'Charleston area' },
    myrtlebeach: { lat: 33.6891, lng: -78.8867, label: 'Myrtle Beach area' }
};

// --- Trust & data freshness widget ---
const DATA_SOURCES = {
    all: { url: 'all_data.csv', label: 'GoodRx (scraped)' },
    greenville: { url: 'greenville_data.csv', label: 'GoodRx (scraped)' }
};

const FRESHNESS_THRESHOLDS_DAYS = {
    fresh: 14,
    aging: 45
};

// Store the original dosage dropdown options so we can restore them
let defaultDosageOptions = null;
let defaultQuantityOptions = null;

// Quantity options by product form type
const QUANTITY_OPTIONS = {
    tablets: [
        { value: '30', text: '30 tablets' },
        { value: '60', text: '60 tablets' },
        { value: '90', text: '90 tablets' },
        { value: '180', text: '180 tablets' }
    ],
    capsules: [
        { value: '30', text: '30 capsules' },
        { value: '60', text: '60 capsules' },
        { value: '90', text: '90 capsules' },
        { value: '180', text: '180 capsules' }
    ],
    cream: [
        { value: '15g', text: '15g tube' },
        { value: '30g', text: '30g tube' },
        { value: '45g', text: '45g tube' },
        { value: '60g', text: '60g tube' }
    ],
    ointment: [
        { value: '15g', text: '15g tube' },
        { value: '30g', text: '30g tube' },
        { value: '45g', text: '45g tube' }
    ],
    liquid: [
        { value: '120ml', text: '120ml (4 oz)' },
        { value: '240ml', text: '240ml (8 oz)' },
        { value: '480ml', text: '480ml (16 oz)' }
    ],
    powder: [
        { value: '1', text: '1 bottle (238g)' },
        { value: '2', text: '2 bottles' },
        { value: '3', text: '3 bottles' }
    ],
    inhaler: [
        { value: '1', text: '1 inhaler' },
        { value: '2', text: '2 inhalers' },
        { value: '3', text: '3 inhalers' }
    ],
    nasalspray: [
        { value: '1', text: '1 bottle' },
        { value: '2', text: '2 bottles' },
        { value: '3', text: '3 bottles' }
    ],
    patch: [
        { value: '7', text: '7 patches (1 week)' },
        { value: '14', text: '14 patches (2 weeks)' },
        { value: '28', text: '28 patches (4 weeks)' }
    ],
    gum: [
        { value: '20', text: '20 pieces' },
        { value: '40', text: '40 pieces' },
        { value: '100', text: '100 pieces' },
        { value: '200', text: '200 pieces' }
    ],
    lozenge: [
        { value: '24', text: '24 lozenges' },
        { value: '72', text: '72 lozenges' },
        { value: '108', text: '108 lozenges' }
    ],
    suppository: [
        { value: '8', text: '8 suppositories' },
        { value: '12', text: '12 suppositories' },
        { value: '50', text: '50 suppositories' }
    ],
    single: [
        { value: '1', text: '1 dose' }
    ],
    topicalsolution: [
        { value: '60ml', text: '60ml bottle' },
        { value: '1', text: '1 month supply' },
        { value: '3', text: '3 month supply' }
    ],
    softgel: [
        { value: '30', text: '30 softgels' },
        { value: '60', text: '60 softgels' },
        { value: '90', text: '90 softgels' },
        { value: '120', text: '120 softgels' }
    ]
};

// --- Usual dosage guidance (informational only) ---
// Notes:
// - Dosing varies by indication, age, kidney/liver function, and formulation.
// - This is a lightweight UX helper, not medical advice.
// - We keep values simple and human-readable.
const DOSAGE_GUIDANCE = {
    acetaminophen: {
        guidance: 'Adults: 325–1,000 mg every 4–6 hours as needed; do not exceed 3,000 mg/day OTC (some regimens allow up to 4,000 mg/day under clinician guidance).',
        options: ['325mg', '500mg', '650mg', '1000mg'],
        defaultOption: '500mg',
        quantityType: 'tablets',
        otc: true,
        baselineDosage: 500,
        baselineQuantity: 30
    },
    aluminum: {
        guidance: 'Antacid products vary. Follow the product label; typical adult doses are taken after meals and at bedtime as needed.',
        quantityType: 'liquid',
        otc: true
    },
    amlodipine: {
        guidance: 'Adults (HTN/angina): typically 5 mg once daily; range 2.5–10 mg once daily.',
        options: ['2.5mg', '5mg', '10mg'],
        defaultOption: '5mg',
        quantityType: 'tablets',
        baselineDosage: 5,
        baselineQuantity: 30
    },
    aspirin: {
        guidance: 'Pain/fever: 325–650 mg every 4–6 hours as needed. Cardioprotection (if prescribed): commonly 81 mg once daily.',
        options: ['81mg', '325mg', '500mg'],
        defaultOption: '325mg',
        quantityType: 'tablets',
        otc: true,
        baselineDosage: 325,
        baselineQuantity: 30
    },
    atorvastatin: {
        guidance: 'Adults: typically 10–20 mg once daily to start; range 10–80 mg once daily depending on cholesterol goals.',
        options: ['10mg', '20mg', '40mg', '80mg'],
        defaultOption: '20mg',
        quantityType: 'tablets',
        baselineDosage: 20,
        baselineQuantity: 30
    },
    azelastine: {
        guidance: 'Nasal spray: commonly 1–2 sprays in each nostril twice daily (depends on product/indication).',
        quantityType: 'nasalspray',
        otc: true
    },
    azithromycin: {
        guidance: 'Typical adult regimens depend on infection. Common “Z-Pak”: 500 mg on day 1, then 250 mg daily on days 2–5 (if prescribed).',
        options: ['250mg', '500mg'],
        defaultOption: '250mg',
        quantityType: 'tablets',
        baselineDosage: 250,
        baselineQuantity: 30
    },
    bactrim: {
        guidance: 'Formulations vary (TMP-SMX). A common adult regimen is DS 800/160 mg every 12 hours for certain infections (if prescribed).',
        options: ['80mg', '160mg', '400mg', '800mg'],
        quantityType: 'tablets',
        baselineDosage: 800,
        baselineQuantity: 30
    },
    benadryl: {
        guidance: 'Diphenhydramine (adult): 25–50 mg every 4–6 hours as needed; max 300 mg/day (check label).',
        options: ['25mg', '50mg'],
        defaultOption: '25mg',
        quantityType: 'tablets',
        otc: true,
        baselineDosage: 25,
        baselineQuantity: 30
    },
    benzocaine: {
        guidance: 'Topical/oral products vary by % and form. Follow the product label; use the smallest amount needed.',
        quantityType: 'cream',
        otc: true
    },
    bisacodyl: {
        guidance: 'Constipation (adult): oral 5–15 mg once daily as needed; suppository 10 mg once daily as needed (follow label).',
        options: ['5mg', '10mg', '15mg'],
        defaultOption: '5mg',
        quantityType: 'tablets',
        otc: true,
        baselineDosage: 5,
        baselineQuantity: 30
    },
    calcium: {
        guidance: 'Supplement/antacid products vary (carbonate vs citrate). Typical supplemental elemental calcium is often 500–600 mg per dose; follow label/clinician advice.',
        options: ['500mg', '600mg'],
        quantityType: 'tablets',
        otc: true,
        baselineDosage: 500,
        baselineQuantity: 30
    },
    capsaicin: {
        guidance: 'Topical products vary by % (e.g., 0.025–0.1%). Apply thin layer as directed on label.',
        quantityType: 'cream',
        otc: true
    },
    cetirizine: {
        guidance: 'Allergies (adult): 10 mg once daily (some start with 5 mg).',
        options: ['5mg', '10mg'],
        defaultOption: '10mg',
        quantityType: 'tablets',
        otc: true,
        baselineDosage: 10,
        baselineQuantity: 30
    },
    chlorpheniramine: {
        guidance: 'Allergies (adult): commonly 4 mg every 4–6 hours as needed; max 24 mg/day (check label).',
        options: ['4mg'],
        defaultOption: '4mg',
        quantityType: 'tablets',
        otc: true,
        baselineDosage: 4,
        baselineQuantity: 30
    },
    clotrimazole: {
        guidance: 'Topical/vaginal products vary by % and form. Follow the product label for duration and frequency.',
        quantityType: 'cream',
        otc: true
    },
    dextromethorphan: {
        guidance: 'Cough: dosing depends on formulation (IR vs ER). Many adult IR products are 10–20 mg every 4 hours or 30 mg every 6–8 hours; follow label.',
        options: ['10mg', '20mg', '30mg'],
        quantityType: 'liquid',
        otc: true,
        baselineDosage: 15,
        baselineQuantity: 120
    },
    diphenhydramine: {
        guidance: 'Allergy (adult): 25–50 mg every 4–6 hours as needed; max 300 mg/day (check label).',
        options: ['25mg', '50mg'],
        defaultOption: '25mg',
        quantityType: 'tablets',
        otc: true,
        baselineDosage: 25,
        baselineQuantity: 30
    },
    duloxetine: {
        guidance: 'Adults: commonly 30 mg once daily to start, then 60 mg once daily; max varies by indication (if prescribed).',
        options: ['20mg', '30mg', '60mg'],
        defaultOption: '30mg',
        quantityType: 'capsules',
        baselineDosage: 30,
        baselineQuantity: 30
    },
    escitalopram: {
        guidance: 'Adults: commonly 10 mg once daily; some increase to 20 mg once daily (if prescribed).',
        options: ['5mg', '10mg', '20mg'],
        defaultOption: '10mg',
        quantityType: 'tablets',
        baselineDosage: 10,
        baselineQuantity: 30
    },
    esomeprazole: {
        guidance: 'GERD: commonly 20–40 mg once daily (duration varies).',
        options: ['20mg', '40mg'],
        defaultOption: '20mg',
        quantityType: 'capsules',
        otc: true,
        baselineDosage: 20,
        baselineQuantity: 30
    },
    famotidine: {
        guidance: 'Heartburn/GERD: OTC often 10–20 mg once or twice daily; prescriptions may use higher doses (follow label/prescriber).',
        options: ['10mg', '20mg', '40mg'],
        defaultOption: '20mg',
        quantityType: 'tablets',
        otc: true,
        baselineDosage: 20,
        baselineQuantity: 30
    },
    fexofenadine: {
        guidance: 'Allergies (adult): 60 mg twice daily or 180 mg once daily (depends on product).',
        options: ['60mg', '180mg'],
        defaultOption: '180mg',
        quantityType: 'tablets',
        otc: true,
        baselineDosage: 180,
        baselineQuantity: 30
    },
    fluticasonesalmeterol: {
        guidance: 'Inhaler dosing varies by product strength. Common adult maintenance is 1 inhalation twice daily (if prescribed).',
        options: ['100/50mcg', '250/50mcg', '500/50mcg'],
        quantityType: 'inhaler',
        baselineDosage: 100,
        baselineQuantity: 1
    },
    guaifenesin: {
        guidance: 'Expectorant: IR often 200–400 mg every 4 hours as needed; ER often 600–1,200 mg every 12 hours (max varies; follow label).',
        options: ['200mg', '400mg', '600mg', '1200mg'],
        defaultOption: '600mg',
        quantityType: 'liquid',
        otc: true,
        baselineDosage: 400,
        baselineQuantity: 120
    },
    hydrocortisone: {
        guidance: 'Topical products commonly 0.5–1%. Apply a thin layer 1–4 times daily as directed (follow label).',
        quantityType: 'cream',
        otc: true
    },
    ibuprofen: {
        guidance: 'Pain/fever (adult): 200–400 mg every 4–6 hours as needed; max 1,200 mg/day OTC (higher doses only if prescribed).',
        options: ['200mg', '400mg'],
        defaultOption: '200mg',
        quantityType: 'tablets',
        otc: true,
        baselineDosage: 200,
        baselineQuantity: 30
    },
    lansoprazole: {
        guidance: 'GERD: commonly 15–30 mg once daily (duration varies).',
        options: ['15mg', '30mg'],
        defaultOption: '15mg',
        quantityType: 'capsules',
        otc: true,
        baselineDosage: 15,
        baselineQuantity: 30
    },
    loperamide: {
        guidance: 'Diarrhea (adult): 4 mg initially, then 2 mg after each loose stool; max 8 mg/day OTC (follow label).',
        options: ['2mg'],
        defaultOption: '2mg',
        quantityType: 'tablets',
        otc: true,
        baselineDosage: 2,
        baselineQuantity: 30
    },
    loratadine: {
        guidance: 'Allergies (adult): 10 mg once daily.',
        options: ['10mg'],
        defaultOption: '10mg',
        quantityType: 'tablets',
        otc: true,
        baselineDosage: 10,
        baselineQuantity: 30
    },
    losartan: {
        guidance: 'Adults (HTN): commonly 50 mg once daily to start; range 25–100 mg/day (once daily or divided) (if prescribed).',
        options: ['25mg', '50mg', '100mg'],
        defaultOption: '50mg',
        quantityType: 'tablets',
        baselineDosage: 50,
        baselineQuantity: 30
    },
    meclizine: {
        guidance: 'Motion sickness/vertigo: commonly 25–50 mg once daily or every 24 hours as needed (follow label/prescriber).',
        options: ['25mg', '50mg'],
        defaultOption: '25mg',
        quantityType: 'tablets',
        otc: true,
        baselineDosage: 25,
        baselineQuantity: 30
    },
    melatonin: {
        guidance: 'Sleep: commonly 1–5 mg 30–60 minutes before bedtime; start low (follow label).',
        options: ['1mg', '3mg', '5mg', '10mg'],
        defaultOption: '3mg',
        quantityType: 'tablets',
        otc: true,
        baselineDosage: 3,
        baselineQuantity: 30
    },
    miconazole: {
        guidance: 'Topical/vaginal products vary by % and duration. Follow the product label.',
        quantityType: 'cream',
        otc: true
    },
    minoxidil: {
        guidance: 'Topical hair loss products commonly 2% or 5% solution/foam; apply as directed on the label.',
        quantityType: 'topicalsolution',
        otc: true
    },
    miralax: {
        guidance: 'Constipation: commonly 17 g powder dissolved in liquid once daily as needed (follow label).',
        options: ['17g'],
        defaultOption: '17g',
        quantityType: 'powder',
        otc: true,
        baselineDosage: 17,
        baselineQuantity: 1
    },
    naproxen: {
        guidance: 'Pain (adult): OTC naproxen sodium 220 mg every 8–12 hours; max 660 mg/day OTC (follow label).',
        options: ['220mg', '250mg', '375mg', '500mg'],
        defaultOption: '220mg',
        quantityType: 'tablets',
        otc: true,
        baselineDosage: 220,
        baselineQuantity: 30
    },
    nicotine: {
        guidance: 'Smoking cessation products vary (gum/lozenge/patch). Follow the product label for a taper schedule.',
        quantityType: 'patch',
        otc: true
    },
    omega3acid: {
        guidance: 'Omega-3 products vary. Prescription omega-3 acid ethyl esters are often 2 g twice daily with meals (if prescribed).',
        options: ['1000mg', '2000mg'],
        quantityType: 'softgel',
        otc: true,
        baselineDosage: 1000,
        baselineQuantity: 30
    },
    omeprazole: {
        guidance: 'Heartburn/GERD: commonly 20 mg once daily before a meal (OTC courses are typically 14 days).',
        options: ['10mg', '20mg', '40mg'],
        defaultOption: '20mg',
        quantityType: 'capsules',
        otc: true,
        baselineDosage: 20,
        baselineQuantity: 30
    },
    pantoprazole: {
        guidance: 'GERD: commonly 40 mg once daily (if prescribed).',
        options: ['20mg', '40mg'],
        defaultOption: '40mg',
        quantityType: 'tablets',
        baselineDosage: 40,
        baselineQuantity: 30
    },
    phenylephrine: {
        guidance: 'Decongestant: many adult oral products are 10 mg every 4 hours as needed (follow label).',
        options: ['10mg'],
        defaultOption: '10mg',
        quantityType: 'tablets',
        otc: true,
        baselineDosage: 10,
        baselineQuantity: 30
    },
    planb: {
        guidance: 'Emergency contraception (levonorgestrel): 1.5 mg as a single dose as soon as possible after unprotected sex (follow product label).',
        options: ['1.5mg'],
        defaultOption: '1.5mg',
        quantityType: 'single',
        otc: true
    },
    polyethylene: {
        guidance: 'Polyethylene glycol products vary. For PEG 3350 constipation products, a common adult dose is 17 g once daily (follow label).',
        options: ['17g'],
        defaultOption: '17g',
        quantityType: 'powder',
        otc: true,
        baselineDosage: 17,
        baselineQuantity: 1
    },
    pseudoephedrine: {
        guidance: 'Decongestant: IR commonly 60 mg every 4–6 hours; ER commonly 120 mg every 12 hours (max varies; follow label).',
        options: ['30mg', '60mg', '120mg'],
        defaultOption: '60mg',
        quantityType: 'tablets',
        otc: true,
        baselineDosage: 60,
        baselineQuantity: 30
    },
    sertraline: {
        guidance: 'Adults: commonly 25–50 mg once daily to start; may increase up to 200 mg/day depending on indication (if prescribed).',
        options: ['25mg', '50mg', '100mg', '150mg', '200mg'],
        defaultOption: '50mg',
        quantityType: 'tablets',
        baselineDosage: 50,
        baselineQuantity: 30
    },
    sildenafil: {
        guidance: 'Erectile dysfunction: commonly 50 mg taken as needed about 1 hour before sexual activity; range 25–100 mg (max once daily) (if prescribed).',
        options: ['25mg', '50mg', '100mg'],
        defaultOption: '50mg',
        quantityType: 'tablets',
        baselineDosage: 50,
        baselineQuantity: 30
    },
    simethicone: {
        guidance: 'Gas relief: products vary. Common adult dosing is 40–125 mg after meals and at bedtime as needed (follow label).',
        options: ['40mg', '80mg', '125mg'],
        defaultOption: '80mg',
        quantityType: 'tablets',
        otc: true,
        baselineDosage: 80,
        baselineQuantity: 30
    },
    terbinafine: {
        guidance: 'Athlete’s foot/ringworm creams vary; oral terbinafine (if prescribed) is often 250 mg once daily. Follow label/prescriber.',
        options: ['250mg'],
        quantityType: 'cream',
        otc: true
    },
    tolnaftate: {
        guidance: 'Topical antifungal products vary by % and form. Follow the product label for frequency/duration.',
        quantityType: 'cream',
        otc: true
    },
    vitamin: {
        guidance: 'Vitamins vary by type and strength. Follow the product label or clinician advice.',
        quantityType: 'tablets',
        otc: true
    }
};

// Common aliases/brand names -> canonical keys used above.
// Brand names people type (Advil, Zyrtec) resolve to the priced generic.
const DOSAGE_ALIASES = {
    tylenol: 'acetaminophen',
    advil: 'ibuprofen',
    motrin: 'ibuprofen',
    aleve: 'naproxen',
    bayer: 'aspirin',
    zyrtec: 'cetirizine',
    claritin: 'loratadine',
    allegra: 'fexofenadine',
    chlortrimeton: 'chlorpheniramine',
    benadryl: 'diphenhydramine',
    pepcid: 'famotidine',
    prilosec: 'omeprazole',
    nexium: 'esomeprazole',
    prevacid: 'lansoprazole',
    imodium: 'loperamide',
    'polyethylene glycol': 'polyethylene',
    'polyethylene glycol 3350': 'miralax',
    advair: 'fluticasonesalmeterol',
    planb: 'planb',
    lipitor: 'atorvastatin',
    zpak: 'azithromycin',
    zithromax: 'azithromycin'
};

// Symptom picker: how people search, mapped to priced OTC drugs.
const SYMPTOMS = [
    {
        id: 'pain',
        label: 'Pain',
        keys: ['acetaminophen', 'ibuprofen', 'aspirin', 'naproxen']
    },
    {
        id: 'allergies',
        label: 'Allergies',
        keys: ['cetirizine', 'loratadine', 'diphenhydramine', 'fexofenadine', 'chlorpheniramine', 'benadryl']
    },
    {
        id: 'heartburn',
        label: 'Heartburn',
        keys: ['omeprazole', 'famotidine', 'esomeprazole', 'lansoprazole']
    },
    {
        id: 'diarrhea',
        label: 'Diarrhea',
        keys: ['loperamide']
    }
];

/** Currently selected symptom chip, or null. */
let activeSymptomId = null;

function normalizeMedicationName(name) {
    return (name || '')
        .toString()
        .trim()
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ');
}

function medicationKey(name) {
    // keep only a-z0-9 for stable lookups (e.g., "Plan B" -> "planb")
    return normalizeMedicationName(name).replace(/[^a-z0-9]/g, '');
}

function getDosageInfo(medicationName) {
    const normalized = normalizeMedicationName(medicationName);
    const key = medicationKey(normalized);

    // Also try alias matching with the normalized string
    const aliasKey = DOSAGE_ALIASES[normalized] || DOSAGE_ALIASES[key];
    const canonicalKey = aliasKey || key;
    return DOSAGE_GUIDANCE[canonicalKey] || null;
}

function isMedicationOtc(medicationName) {
    const info = getDosageInfo(medicationName);
    return !!(info && info.otc);
}

function formatDateForDisplay(d) {
    try {
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return String(d);
    }
}

function setFreshnessBadge(statusText, variant) {
    const badge = document.getElementById('freshnessBadge');
    if (!badge) return;
    badge.textContent = statusText;
    badge.classList.remove('trust-badge--fresh', 'trust-badge--aging', 'trust-badge--stale', 'trust-badge--unknown');
    badge.classList.add(`trust-badge--${variant}`);
}

async function fetchLastModified(url) {
    // Prefer HEAD; fall back to GET if HEAD isn't supported by host/CDN.
    try {
        const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
        const lm = res.headers.get('Last-Modified');
        return lm ? new Date(lm) : null;
    } catch (_) {
        // ignore
    }
    try {
        const res = await fetch(url, { method: 'GET', cache: 'no-cache' });
        const lm = res.headers.get('Last-Modified');
        return lm ? new Date(lm) : null;
    } catch (_) {
        return null;
    }
}

async function initTrustWidget() {
    const card = document.getElementById('trustCard');
    if (!card) return;

    const sourceEl = document.getElementById('dataSource');
    const updatedEl = document.getElementById('dataLastUpdated');
    const recordsEl = document.getElementById('dataRecords');
    const footnoteEl = document.getElementById('trustFootnote');

    if (sourceEl) sourceEl.textContent = DATA_SOURCES.all.label;
    if (updatedEl) updatedEl.textContent = 'Checking…';
    if (recordsEl) recordsEl.textContent = '—';
    setFreshnessBadge('Checking…', 'unknown');

    const lastMod = await fetchLastModified(DATA_SOURCES.all.url);
    if (!lastMod || Number.isNaN(lastMod.getTime())) {
        if (updatedEl) updatedEl.textContent = 'Unknown';
        setFreshnessBadge('Unknown', 'unknown');
        if (footnoteEl) footnoteEl.hidden = false;
        return;
    }

    const ageDays = Math.floor((Date.now() - lastMod.getTime()) / (1000 * 60 * 60 * 24));
    if (updatedEl) updatedEl.textContent = `${formatDateForDisplay(lastMod)} (${ageDays}d ago)`;

    if (ageDays <= FRESHNESS_THRESHOLDS_DAYS.fresh) {
        setFreshnessBadge('Fresh', 'fresh');
    } else if (ageDays <= FRESHNESS_THRESHOLDS_DAYS.aging) {
        setFreshnessBadge('Aging', 'aging');
    } else {
        setFreshnessBadge('Stale', 'stale');
    }
}

function updateTrustWidgetRecords(recordsCount) {
    const recordsEl = document.getElementById('dataRecords');
    if (!recordsEl) return;
    if (typeof recordsCount === 'number' && Number.isFinite(recordsCount)) {
        recordsEl.textContent = recordsCount.toLocaleString();
    }
}

function setDosageSelectOptions(dosageSelect, values) {
    const current = dosageSelect.value;
    dosageSelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select dosage';
    dosageSelect.appendChild(placeholder);

    values.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        dosageSelect.appendChild(opt);
    });

    // Restore prior selection if still available
    if (current && Array.from(dosageSelect.options).some(o => o.value === current)) {
        dosageSelect.value = current;
    }
}

function restoreDefaultDosageSelectOptions(dosageSelect) {
    if (!defaultDosageOptions) return;
    const current = dosageSelect.value;
    dosageSelect.innerHTML = '';
    defaultDosageOptions.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.text;
        dosageSelect.appendChild(opt);
    });
    if (current && Array.from(dosageSelect.options).some(o => o.value === current)) {
        dosageSelect.value = current;
    } else {
        dosageSelect.value = '';
    }
}

function setQuantitySelectOptions(quantitySelect, options) {
    if (!quantitySelect) return;
    const current = quantitySelect.value;
    quantitySelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select quantity';
    quantitySelect.appendChild(placeholder);

    options.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.text;
        quantitySelect.appendChild(opt);
    });

    // Restore prior selection if still available, otherwise select first real option
    if (current && Array.from(quantitySelect.options).some(o => o.value === current)) {
        quantitySelect.value = current;
    } else if (options.length > 0) {
        quantitySelect.value = options[0].value;
    }
}

function restoreDefaultQuantitySelectOptions(quantitySelect) {
    if (!quantitySelect || !defaultQuantityOptions) return;
    const current = quantitySelect.value;
    quantitySelect.innerHTML = '';
    defaultQuantityOptions.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.text;
        quantitySelect.appendChild(opt);
    });
    if (current && Array.from(quantitySelect.options).some(o => o.value === current)) {
        quantitySelect.value = current;
    } else {
        quantitySelect.value = '';
    }
}

function updateDosageGuidanceUI() {
    const medicationInput = document.getElementById('medication');
    const dosageSelect = document.getElementById('dosage');
    const quantitySelect = document.getElementById('quantity');
    const hint = document.getElementById('usualDosage');
    if (!medicationInput || !dosageSelect || !hint) return;

    const medication = medicationInput.value.trim();
    if (!medication) {
        hint.hidden = true;
        hint.textContent = '';
        restoreDefaultDosageSelectOptions(dosageSelect);
        restoreDefaultQuantitySelectOptions(quantitySelect);
        return;
    }

    const info = getDosageInfo(medication);
    if (!info) {
        hint.hidden = true;
        hint.textContent = '';
        restoreDefaultDosageSelectOptions(dosageSelect);
        restoreDefaultQuantitySelectOptions(quantitySelect);
        return;
    }

    hint.textContent = '💊 ' + info.guidance;
    hint.hidden = false;

    if (Array.isArray(info.options) && info.options.length > 0) {
        setDosageSelectOptions(dosageSelect, info.options);
        if (!dosageSelect.value && info.defaultOption) {
            dosageSelect.value = info.defaultOption;
        }
    } else {
        restoreDefaultDosageSelectOptions(dosageSelect);
    }

    // Update quantity dropdown based on medication form type
    if (info.quantityType && QUANTITY_OPTIONS[info.quantityType]) {
        setQuantitySelectOptions(quantitySelect, QUANTITY_OPTIONS[info.quantityType]);
    } else {
        restoreDefaultQuantitySelectOptions(quantitySelect);
    }
}

/** All medications available for typeahead (rebuilt when CSV loads). */
let medicationSuggestions = [];

/** Index of keyboard-highlighted suggestion (-1 = none). */
let medicationSuggestionActiveIndex = -1;

function formatMedicationDisplayName(name) {
    return (name || '').toString().trim().replace(/_/g, ' ');
}

function medicationNamesMatch(a, b) {
    return medicationKey(a) === medicationKey(b);
}

function findCatalogDisplayName(key) {
    const sources = [medicationData, greenvilleMedicationData];
    for (let s = 0; s < sources.length; s++) {
        const rows = sources[s];
        for (let i = 0; i < rows.length; i++) {
            const name = (rows[i].Name || '').toString().trim();
            if (name && medicationKey(name) === key) {
                return formatMedicationDisplayName(name);
            }
        }
    }
    return '';
}

/** Map a typed brand (Advil) to the catalog generic (Ibuprofen) when one exists. */
function resolveMedicationQuery(name) {
    const trimmed = (name || '').toString().trim();
    if (!trimmed) return '';
    const key = medicationKey(trimmed);
    const exact = findCatalogDisplayName(key);
    if (exact) return exact;
    const normalized = normalizeMedicationName(trimmed);
    const alias = DOSAGE_ALIASES[normalized] || DOSAGE_ALIASES[key];
    if (!alias) return trimmed;
    return findCatalogDisplayName(medicationKey(alias)) || trimmed;
}

function pharmacyRequiresMembership(pharmacy) {
    const chain = pharmacy && pharmacy.chain ? pharmacy.chain : '';
    const name = pharmacy && pharmacy.name ? pharmacy.name : '';
    const normalized = `${chain} ${name}`.toLowerCase().replace(/[\u2019']/g, '');
    return normalized.includes('costco') || normalized.includes('sams club');
}

function membershipNoteHtml(pharmacy) {
    if (!pharmacyRequiresMembership(pharmacy)) return '';
    return '<div class="membership-note">Membership usually required</div>';
}

/**
 * Snapshot of the search that produced the cards on screen.
 * Share and print read this instead of the form, so a later edit
 * does not change a note for a result the user already saw.
 * A geolocation search stores "your area" and never a lat/lng.
 */
let lastSearch = null;

const RESULT_SLIP_DISCLAIMER =
    'Estimate, not a pharmacy quote, and not medical advice. Prices change. Confirm at the pharmacy.';

/** Public resource pages. The same URLs are linked from the resource cards in index.html. */
const RESULT_SLIP_RESOURCES = {
    drugFactsLabel: 'https://www.fda.gov/drugs/understanding-over-counter-medicines/over-counter-drug-facts-label',
    freeClinics: 'https://www.scfreeclinics.org',
    healthCenters: 'https://findahealthcenter.hrsa.gov/'
};

/** True when the typed name is a brand that prices as a different generic. */
function brandWasResolved(typedName, pricedAs) {
    const typed = (typedName || '').toString().trim();
    const generic = (pricedAs || '').toString().trim();
    if (!typed || !generic) return false;
    return medicationKey(typed) !== medicationKey(generic);
}

/** Banner sentence for a brand search. Empty when the query is already the generic. */
function brandGenericSentence(typedName, pricedAs) {
    if (!brandWasResolved(typedName, pricedAs)) return '';
    const brand = formatMedicationDisplayName(typedName);
    const generic = formatMedicationDisplayName(pricedAs);
    return `${brand} is a brand name. Prices below are for ${generic}, the generic active ingredient.`;
}

/** Area wording for a shared note. Omits coordinates on purpose. */
function slipAreaLabel(searchMode, locationLabel) {
    if (searchMode === 'state') return 'Entire South Carolina';
    if (searchMode === 'geolocation') return 'your area';
    const label = (locationLabel || '').toString().trim();
    return label || 'the selected area';
}

function slipAreaSentence(areaLabel) {
    if (areaLabel === 'Entire South Carolina') return 'Prices across South Carolina.';
    if (areaLabel === 'your area') return 'Prices near your area.';
    const area = (areaLabel || '').toString().trim();
    return area ? `Prices for the ${area}.` : '';
}

/**
 * Keep the ranked pharmacies from the search that just rendered.
 * Inputs: details from displayResults (typed name, priced generic, dose, quantity, area, results).
 * Output: lastSearch is replaced, or cleared when the payload is incomplete.
 */
function rememberSearchSnapshot(details) {
    if (!details || !Array.isArray(details.results) || details.results.length === 0) {
        lastSearch = null;
        return;
    }
    const pricedAs = (details.pricedAs || '').toString().trim();
    const dosage = (details.dosage || '').toString().trim();
    const quantity = (details.quantity || '').toString().trim();
    if (!pricedAs || !dosage || !quantity) {
        console.error('Search snapshot is missing the medication, dosage, or quantity.');
        lastSearch = null;
        return;
    }
    lastSearch = {
        typedName: (details.typedName || '').toString().trim(),
        pricedAs,
        dosage,
        quantity,
        areaLabel: slipAreaLabel(details.searchMode, details.locationLabel),
        brandResolved: brandWasResolved(details.typedName, pricedAs),
        bestPrice: details.bestPrice,
        generatedAt: details.generatedAt instanceof Date ? details.generatedAt : new Date(),
        results: details.results
    };
}

/** Pharmacy object for a card button, or null when the index is stale. */
function pharmacyForSlip(resultIndexValue) {
    if (!lastSearch || !Array.isArray(lastSearch.results)) return null;
    const index = Number(resultIndexValue);
    if (!Number.isInteger(index) || index < 0 || index >= lastSearch.results.length) return null;
    return lastSearch.results[index];
}

function assertSlipInputs(pharmacy, snapshot) {
    if (!snapshot || !snapshot.pricedAs || !snapshot.dosage || snapshot.quantity == null || snapshot.quantity === '') {
        throw new Error('Result slip requires a completed search snapshot.');
    }
    if (!pharmacy || !pharmacy.name || !pharmacy.address || pharmacy.price == null || pharmacy.price === '') {
        throw new Error('Result slip requires a pharmacy name, address, and price.');
    }
}

function slipBuyLine(snapshot) {
    const generic = formatMedicationDisplayName(snapshot.pricedAs);
    const product = `${generic} ${snapshot.dosage}, qty ${snapshot.quantity}`;
    if (!snapshot.brandResolved) return `Buy ${product}.`;
    const brand = formatMedicationDisplayName(snapshot.typedName);
    return `You asked about ${brand}. Buy ${product}.`;
}

function slipRankLine(pharmacy, snapshot) {
    const price = parseFloat(pharmacy.price);
    const best = parseFloat(snapshot.bestPrice);
    if (!Number.isFinite(price) || !Number.isFinite(best)) return '';
    if (Math.abs(price - best) < 0.005) return 'Best price in this search.';
    return `$${(price - best).toFixed(2)} more than the lowest in this search.`;
}

/** Print-only footer. The text message stays the pharmacy errand. */
function appendSlipResourceLines(lines) {
    lines.push(
        '',
        'The same active ingredient under a store brand is often cheaper. Compare the Drug Facts label:',
        RESULT_SLIP_RESOURCES.drugFactsLabel,
        '',
        'If the cost is still too high, a free clinic or a community health center on a sliding scale may help:',
        RESULT_SLIP_RESOURCES.freeClinics,
        RESULT_SLIP_RESOURCES.healthCenters
    );
}

/**
 * One note for both Share and Print, so the two cannot drift.
 * includeFooter is true for the printed page only.
 */
function buildResultSlipLines(pharmacy, snapshot, includeFooter) {
    assertSlipInputs(pharmacy, snapshot);
    const when = snapshot.generatedAt instanceof Date ? snapshot.generatedAt : new Date();
    const lines = [
        `AffordRX price note (${formatDateForDisplay(when)})`,
        slipAreaSentence(snapshot.areaLabel),
        '',
        slipBuyLine(snapshot),
        String(pharmacy.name),
        String(pharmacy.address),
        `$${pharmacy.price}`
    ];
    const rankLine = slipRankLine(pharmacy, snapshot);
    if (rankLine) lines.push(rankLine);
    if (pharmacyRequiresMembership(pharmacy)) lines.push('Membership usually required.');
    if (pharmacy.priceModeled) lines.push('Modeled estimate.');
    lines.push('', RESULT_SLIP_DISCLAIMER);
    if (includeFooter) appendSlipResourceLines(lines);
    return lines;
}

function buildResultSlipText(pharmacy, snapshot, includeFooter) {
    return buildResultSlipLines(pharmacy, snapshot, includeFooter).join('\n');
}

function slipParagraph(className, text) {
    if (!text) return '';
    return `<p class="${className}">${escapeHtml(text)}</p>`;
}

/** Printable sheet. Pharmacy names are escaped because they are external data. */
function buildResultSlipHtml(pharmacy, snapshot) {
    assertSlipInputs(pharmacy, snapshot);
    const when = snapshot.generatedAt instanceof Date ? snapshot.generatedAt : new Date();
    const flags = [];
    if (pharmacyRequiresMembership(pharmacy)) flags.push('Membership usually required.');
    if (pharmacy.priceModeled) flags.push('Modeled estimate.');
    const flagHtml = flags.map((line) => slipParagraph('result-slip__flag', line)).join('');
    return `
        <article class="result-slip__sheet">
            <h1>AffordRX price note</h1>
            ${slipParagraph('result-slip__date', formatDateForDisplay(when))}
            ${slipParagraph('result-slip__area', slipAreaSentence(snapshot.areaLabel))}
            ${slipParagraph('result-slip__buy', slipBuyLine(snapshot))}
            ${slipParagraph('result-slip__pharmacy', pharmacy.name)}
            ${slipParagraph('result-slip__address', pharmacy.address)}
            ${slipParagraph('result-slip__price', `$${pharmacy.price}`)}
            ${slipParagraph('result-slip__rank', slipRankLine(pharmacy, snapshot))}
            ${flagHtml}
            ${slipParagraph('result-slip__disclaimer', RESULT_SLIP_DISCLAIMER)}
            <footer class="result-slip__footer">
                <p>The same active ingredient under a store brand is often cheaper. Compare the Drug Facts label.</p>
                <p><a href="${escapeHtml(RESULT_SLIP_RESOURCES.drugFactsLabel)}">${escapeHtml(RESULT_SLIP_RESOURCES.drugFactsLabel)}</a></p>
                <p>If the cost is still too high, a free clinic or a community health center on a sliding scale may help.</p>
                <p>Free clinics: <a href="${escapeHtml(RESULT_SLIP_RESOURCES.freeClinics)}">${escapeHtml(RESULT_SLIP_RESOURCES.freeClinics)}</a></p>
                <p>Community health centers: <a href="${escapeHtml(RESULT_SLIP_RESOURCES.healthCenters)}">${escapeHtml(RESULT_SLIP_RESOURCES.healthCenters)}</a></p>
            </footer>
        </article>
    `;
}

function resultSlipActionsHtml(resultIndex, pharmacyName) {
    const index = Number(resultIndex);
    if (!Number.isInteger(index) || index < 0) return '';
    const safeName = escapeHtml(pharmacyName || 'this pharmacy');
    return `
        <div class="result-slip-actions">
            <button type="button" class="result-slip-btn" data-slip-action="share" data-result-index="${index}" aria-label="Share the ${safeName} price">Share</button>
            <button type="button" class="result-slip-btn" data-slip-action="print" data-result-index="${index}" aria-label="Print the ${safeName} price">Print</button>
        </div>
    `;
}

function showSlipActionStatus(button, message) {
    if (!button) return;
    const actions = button.closest('.result-slip-actions');
    if (!actions) return;
    let status = actions.querySelector('.result-slip-status');
    if (!status) {
        status = document.createElement('p');
        status.className = 'result-slip-status';
        status.setAttribute('role', 'status');
        actions.appendChild(status);
    }
    status.textContent = message;
}

function finishResultSlipPrint() {
    document.body.classList.remove('is-printing-slip');
    const slip = document.getElementById('resultSlip');
    if (slip) {
        slip.hidden = true;
        slip.innerHTML = '';
    }
    window.removeEventListener('afterprint', finishResultSlipPrint);
}

/** Fill the hidden slip and print only that sheet. */
function printResultSlip(pharmacy) {
    const slip = document.getElementById('resultSlip');
    if (!slip) {
        console.error('Print slip element is missing from the page.');
        return;
    }
    finishResultSlipPrint();
    slip.innerHTML = buildResultSlipHtml(pharmacy, lastSearch);
    slip.hidden = false;
    document.body.classList.add('is-printing-slip');
    window.addEventListener('afterprint', finishResultSlipPrint);
    window.print();
}

async function writeSlipToClipboard(text) {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
        throw new Error('Clipboard API is unavailable.');
    }
    await navigator.clipboard.writeText(text);
}

/** Shown when share and clipboard both fail, so the note can still be copied by hand. */
function openSlipCopyFallback(text) {
    const dialog = document.getElementById('resultSlipFallback');
    const field = document.getElementById('resultSlipFallbackText');
    if (!dialog || !field || typeof dialog.showModal !== 'function') {
        console.error('Could not open the copy dialog for the price note.');
        return false;
    }
    field.value = text;
    if (!dialog.open) dialog.showModal();
    field.focus();
    field.select();
    return true;
}

function setupResultSlipFallback() {
    const dialog = document.getElementById('resultSlipFallback');
    const closeButton = document.getElementById('resultSlipFallbackClose');
    if (!dialog || !closeButton) return;
    closeButton.addEventListener('click', () => {
        dialog.close();
    });
}

/**
 * Share one pharmacy note. Web Share first, then the clipboard,
 * then a selectable dialog. Cancelling the share sheet does not copy.
 */
async function shareResultSlip(pharmacy, button) {
    const text = buildResultSlipText(pharmacy, lastSearch, false);
    if (typeof navigator.share === 'function') {
        try {
            await navigator.share({ title: 'AffordRX price note', text });
            showSlipActionStatus(button, 'Shared.');
            return;
        } catch (error) {
            if (error && error.name === 'AbortError') return;
            console.error('Web Share failed. Copying the price note instead.', error);
        }
    }
    try {
        await writeSlipToClipboard(text);
        showSlipActionStatus(button, 'Copied. Paste it into a text or email.');
    } catch (error) {
        console.error('Could not copy the price note.', error);
        const opened = openSlipCopyFallback(text);
        showSlipActionStatus(
            button,
            opened ? 'Copy the note in the box, then send it.' : 'Could not share this note. Try print instead.'
        );
    }
}

/**
 * Capture-phase listener so Share and Print do not also focus the map.
 * The card click handler runs later, on bubble, and stopPropagation blocks it.
 */
function handleResultSlipClick(event) {
    const button = event.target.closest('.result-slip-btn');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const pharmacy = pharmacyForSlip(button.getAttribute('data-result-index'));
    if (!pharmacy) {
        console.error('Share or print was used without a matching search result.');
        showSlipActionStatus(button, 'This result is no longer available. Search again.');
        return;
    }
    const action = button.getAttribute('data-slip-action');
    if (action === 'print') {
        try {
            printResultSlip(pharmacy);
        } catch (error) {
            console.error('Could not print this price note.', error);
            showSlipActionStatus(button, 'Could not print this note.');
        }
        return;
    }
    if (action === 'share') {
        shareResultSlip(pharmacy, button).catch((error) => {
            console.error('Could not share this price note.', error);
            showSlipActionStatus(button, 'Could not share this note. Try print instead.');
        });
        return;
    }
    console.error(`Unknown result slip action: ${action}`);
}

function setupResultSlipActions() {
    const results = document.getElementById('results');
    if (!results || results.dataset.slipActionsBound === 'true') return;
    results.dataset.slipActionsBound = 'true';
    results.addEventListener('click', handleResultSlipClick, true);
}

const PRICE_REPORT_URL = 'https://github.com/kcbailey111/AffordRX.github.io/issues/new';

function isSpartanburgPharmacy(pharmacy) {
    const address = (pharmacy && pharmacy.address ? pharmacy.address : '').toLowerCase();
    const zip = pharmacy && pharmacy.zipCode ? String(pharmacy.zipCode) : extractZipCode(address);
    return address.includes('spartanburg') || (zip && String(zip).startsWith('293'));
}

function matchesScrapedBaseline(medicationName, dosage, quantity) {
    const medInfo = getDosageInfo(medicationName);
    if (!medInfo || !medInfo.baselineDosage || !medInfo.baselineQuantity) return false;
    const dosageValue = parseInt(dosage, 10);
    const qtyVal = parseFloat(quantity);
    return dosageValue === medInfo.baselineDosage && qtyVal === medInfo.baselineQuantity;
}

/** True when the shown amount is scaled, or the pharmacy is outside a scraped metro. */
function pharmacyPriceIsModeled(pharmacy, medicationName, dosage, quantity, searchMode) {
    const scaled = !matchesScrapedBaseline(medicationName, dosage, quantity);
    const zip = pharmacy && pharmacy.zipCode ? pharmacy.zipCode : extractZipCode((pharmacy && pharmacy.address) || '');
    const greenvilleScrape = isGreenvillePharmacy(zip);
    const spartanburgArea = searchMode === 'spartanburg' || isSpartanburgPharmacy(pharmacy);
    const locationModeled = spartanburgArea && !greenvilleScrape;
    return scaled || locationModeled;
}

function searchPriceNote(medicationName, dosage, quantity, searchMode, results) {
    const medInfo = getDosageInfo(medicationName);
    const dosageValue = parseInt(dosage, 10);
    const qtyVal = parseFloat(quantity);
    const hasBaseline = !!(medInfo && medInfo.baselineDosage && medInfo.baselineQuantity);
    const matchesBaseline =
        hasBaseline && dosageValue === medInfo.baselineDosage && qtyVal === medInfo.baselineQuantity;
    const parts = [];
    const spartanburgResults = (results || []).filter(isSpartanburgPharmacy);
    const greenvilleInSpartanburgSearch =
        searchMode === 'spartanburg' &&
        (results || []).some((pharmacy) => {
            const zip = pharmacy.zipCode || extractZipCode(pharmacy.address || '');
            return isGreenvillePharmacy(zip);
        });

    if (searchMode === 'spartanburg' && greenvilleInSpartanburgSearch) {
        parts.push(
            'Spartanburg does not have its own price scrape yet. Pharmacies there are marked modeled and use statewide GoodRx prices. A Greenville pharmacy in this radius can still show a scraped price when the strength and quantity match the baseline.'
        );
    } else if (searchMode === 'spartanburg') {
        parts.push(
            'Modeled, not scraped. Spartanburg does not have its own price scrape yet, so these prices use statewide GoodRx prices.'
        );
    } else if (spartanburgResults.length && spartanburgResults.length < (results || []).length) {
        parts.push(
            'Spartanburg pharmacies are marked modeled. That area does not have its own price scrape yet.'
        );
    } else if (spartanburgResults.length) {
        parts.push(
            'Modeled, not scraped. These pharmacies are in Spartanburg, which does not have its own price scrape yet.'
        );
    }

    if (hasBaseline && !matchesBaseline) {
        parts.push(
            `Modeled, not scraped. Scaled from one baseline of ${medInfo.baselineDosage} mg, quantity ${medInfo.baselineQuantity}.`
        );
    } else if (!hasBaseline) {
        parts.push(
            'Modeled, not scraped. This drug is not tied to one scraped strength and quantity, so the amount is estimated from a base GoodRx price.'
        );
    }

    return parts.join(' ');
}

function priceReportHref(details) {
    const medication = details && details.medication ? details.medication : '';
    const dosage = details && details.dosage ? details.dosage : '';
    const quantity = details && details.quantity ? details.quantity : '';
    const title = medication
        ? `Wrong price: ${medication} ${dosage} qty ${quantity}`.replace(/\s+/g, ' ').trim()
        : 'Wrong price on AffordRX';
    const lines = [
        'What looks wrong:',
        '',
        `Medication: ${medication}`,
        `Dosage: ${dosage}`,
        `Quantity: ${quantity}`,
        `Area: ${details && details.area ? details.area : ''}`,
        `Pharmacy: ${details && details.pharmacy ? details.pharmacy : ''}`,
        `Listed price: ${details && details.price ? '$' + details.price : ''}`,
        '',
        'These prices are estimates, not pharmacy quotes.'
    ];
    const params = new URLSearchParams({
        title: title.slice(0, 120),
        body: lines.join('\n')
    });
    return `${PRICE_REPORT_URL}?${params.toString()}`;
}

function updateAreaEstimateHint() {
    const hint = document.getElementById('areaEstimateHint');
    const searchNear = document.getElementById('searchNear');
    if (!hint || !searchNear) return;
    if (searchNear.value === 'spartanburg') {
        hint.hidden = false;
        hint.textContent =
            'Spartanburg does not have its own price scrape yet. Results for this area are estimates based on statewide GoodRx prices.';
    } else {
        hint.hidden = true;
        hint.textContent = '';
    }
}

function rebuildMedicationSuggestions() {
    const names = new Set();
    medicationData.forEach((row) => {
        const name = (row.Name || '').toString().trim();
        if (name) names.add(name);
    });
    greenvilleMedicationData.forEach((row) => {
        const name = (row.Name || '').toString().trim();
        if (name) names.add(name);
    });

    const items = [];
    const seenValues = new Set();
    const nameByKey = new Map();

    function addSuggestion(value, label, extraTerms) {
        const canonical = value.trim();
        const displayLabel = (label || '').trim() || formatMedicationDisplayName(canonical);
        const dedupeKey = medicationKey(displayLabel);
        if (!canonical || seenValues.has(dedupeKey)) return;
        if (!isMedicationOtc(canonical)) return;
        seenValues.add(dedupeKey);
        if (!nameByKey.has(medicationKey(canonical))) {
            nameByKey.set(medicationKey(canonical), canonical);
        }
        const terms = [
            normalizeMedicationName(canonical),
            normalizeMedicationName(displayLabel),
            ...(extraTerms || []).map(normalizeMedicationName)
        ].join(' ');
        items.push({ value: canonical, label: displayLabel, terms });
    }

    Array.from(names)
        .sort((a, b) => formatMedicationDisplayName(a).localeCompare(formatMedicationDisplayName(b)))
        .forEach((name) => addSuggestion(name, formatMedicationDisplayName(name)));

    Object.entries(DOSAGE_ALIASES).forEach(([alias, canonicalKey]) => {
        // Skip brands that are already their own priced catalog row (Benadryl).
        if (nameByKey.has(medicationKey(alias))) return;
        const canonical = nameByKey.get(canonicalKey) || nameByKey.get(medicationKey(canonicalKey));
        if (!canonical) return;
        const aliasLabels = { chlortrimeton: 'Chlor-Trimeton' };
        const aliasLabel = aliasLabels[alias] || alias.replace(/\b\w/g, (c) => c.toUpperCase());
        addSuggestion(canonical, aliasLabel, [formatMedicationDisplayName(canonical)]);
    });

    medicationSuggestions = items;
    renderSymptomDrugs();
}

/** @deprecated kept as alias for CSV load hooks */
function populateMedicationDatalist() {
    rebuildMedicationSuggestions();
    const input = document.getElementById('medication');
    if (input && document.activeElement === input) {
        renderMedicationSuggestions(input.value);
    }
}

function scoreMedicationMatch(item, query) {
    const q = normalizeMedicationName(query);
    if (!q) return 0;
    const label = normalizeMedicationName(item.label);
    const value = normalizeMedicationName(item.value);
    if (label === q || value === q) return 100;
    if (label.startsWith(q) || value.startsWith(q)) return 80;
    if (item.terms.startsWith(q)) return 70;
    if (label.includes(q) || value.includes(q) || item.terms.includes(q)) return 50;
    return 0;
}

function filterMedicationSuggestions(query, limit = 8) {
    const q = (query || '').trim();
    if (!q) {
        return medicationSuggestions.slice(0, limit);
    }
    return medicationSuggestions
        .map((item) => ({ item, score: scoreMedicationMatch(item, q) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.item.label.localeCompare(b.item.label);
        })
        .slice(0, limit)
        .map((entry) => entry.item);
}

function setMedicationSuggestionsOpen(open) {
    const input = document.getElementById('medication');
    const list = document.getElementById('medicationSuggestions');
    if (!input || !list) return;
    input.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!open) {
        list.hidden = true;
        medicationSuggestionActiveIndex = -1;
    }
}

function selectMedicationSuggestion(item) {
    const input = document.getElementById('medication');
    if (!input || !item) return;
    input.value = formatMedicationDisplayName(item.value);
    setMedicationSuggestionsOpen(false);
    updateDosageGuidanceUI();
    renderSymptomDrugs();
}

function symptomItemMatches(item, keys) {
    const valueKey = medicationKey(item.value);
    const labelKey = medicationKey(item.label);
    if (keys.has(valueKey) || keys.has(labelKey)) return true;
    const normalized = normalizeMedicationName(item.label);
    const alias = DOSAGE_ALIASES[normalized] || DOSAGE_ALIASES[labelKey];
    return !!(alias && keys.has(medicationKey(alias)));
}

function renderSymptomDrugs() {
    const wrap = document.getElementById('symptomDrugs');
    if (!wrap) return;
    wrap.innerHTML = '';

    if (!activeSymptomId) {
        wrap.hidden = true;
        return;
    }

    const symptom = SYMPTOMS.find((entry) => entry.id === activeSymptomId);
    wrap.hidden = false;
    wrap.setAttribute('aria-label', symptom ? `Medicines for ${symptom.label}` : 'Medicines');

    if (!symptom) return;

    if (!medicationSuggestions.length) {
        const empty = document.createElement('p');
        empty.className = 'symptom-drugs__empty';
        empty.textContent = 'Loading medicines…';
        wrap.appendChild(empty);
        return;
    }

    const keys = new Set(symptom.keys);
    const matches = medicationSuggestions
        .filter((item) => symptomItemMatches(item, keys))
        .sort((a, b) => a.label.localeCompare(b.label));

    if (!matches.length) {
        const empty = document.createElement('p');
        empty.className = 'symptom-drugs__empty';
        empty.textContent = 'No priced medicines for this symptom yet.';
        wrap.appendChild(empty);
        return;
    }

    const input = document.getElementById('medication');
    const current = medicationKey(input ? input.value : '');

    matches.forEach((item) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'symptom-drug';
        const labelKey = medicationKey(item.label);
        const valueKey = medicationKey(item.value);
        const selected = current === labelKey || (current === valueKey && labelKey === valueKey);
        if (selected) btn.classList.add('symptom-drug--selected');
        btn.setAttribute('aria-pressed', selected ? 'true' : 'false');

        const name = document.createElement('span');
        name.className = 'symptom-drug__name';
        name.textContent = item.label;
        btn.appendChild(name);

        if (normalizeMedicationName(item.label) !== normalizeMedicationName(item.value)) {
            const generic = document.createElement('span');
            generic.className = 'symptom-drug__generic';
            generic.textContent = formatMedicationDisplayName(item.value);
            btn.appendChild(generic);
        }

        btn.addEventListener('click', () => selectMedicationSuggestion(item));
        wrap.appendChild(btn);
    });
}

function setupSymptomPicker() {
    document.querySelectorAll('.symptom-chip').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.symptom;
            activeSymptomId = activeSymptomId === id ? null : id;
            document.querySelectorAll('.symptom-chip').forEach((chip) => {
                const on = chip.dataset.symptom === activeSymptomId;
                chip.classList.toggle('symptom-chip--active', on);
                chip.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
            renderSymptomDrugs();
        });
    });
}

function renderMedicationSuggestions(query) {
    const input = document.getElementById('medication');
    const list = document.getElementById('medicationSuggestions');
    if (!input || !list) return;

    const matches = filterMedicationSuggestions(query);
    list.innerHTML = '';
    medicationSuggestionActiveIndex = -1;

    if (!matches.length) {
        const empty = document.createElement('li');
        empty.className = 'medication-suggestions__empty';
        empty.setAttribute('role', 'option');
        empty.textContent = query.trim()
            ? 'No matching medications — check spelling or try another name'
            : 'No medications loaded yet';
        list.appendChild(empty);
        list.hidden = false;
        input.setAttribute('aria-expanded', 'true');
        return;
    }

    matches.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'medication-suggestions__item';
        li.setAttribute('role', 'option');
        li.id = `medication-suggestion-${index}`;
        li.dataset.index = String(index);

        const showAlias = normalizeMedicationName(item.label) !== normalizeMedicationName(item.value);
        if (showAlias) {
            li.innerHTML = `${escapeHtml(item.label)}<span class="medication-suggestions__alias">${escapeHtml(formatMedicationDisplayName(item.value))}</span>`;
        } else {
            li.textContent = item.label;
        }

        li.addEventListener('mousedown', (event) => {
            event.preventDefault();
            selectMedicationSuggestion(item);
        });
        list.appendChild(li);
    });

    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
}

function highlightMedicationSuggestion(index) {
    const list = document.getElementById('medicationSuggestions');
    if (!list) return;
    const items = list.querySelectorAll('.medication-suggestions__item');
    if (!items.length) return;

    medicationSuggestionActiveIndex = Math.max(0, Math.min(index, items.length - 1));
    items.forEach((el, i) => {
        el.classList.toggle('medication-suggestions__item--active', i === medicationSuggestionActiveIndex);
        if (i === medicationSuggestionActiveIndex) {
            el.scrollIntoView({ block: 'nearest' });
        }
    });
}

function setupMedicationAutocomplete() {
    const input = document.getElementById('medication');
    const list = document.getElementById('medicationSuggestions');
    if (!input || !list) return;

    input.addEventListener('input', () => {
        renderMedicationSuggestions(input.value);
        updateDosageGuidanceUI();
    });

    input.addEventListener('focus', () => {
        renderMedicationSuggestions(input.value);
    });

    input.addEventListener('blur', () => {
        window.setTimeout(() => setMedicationSuggestionsOpen(false), 150);
    });

    input.addEventListener('keydown', (event) => {
        const items = list.querySelectorAll('.medication-suggestions__item');
        if (!items.length || list.hidden) {
            if (event.key === 'ArrowDown' && medicationSuggestions.length) {
                renderMedicationSuggestions(input.value);
                highlightMedicationSuggestion(0);
                event.preventDefault();
            }
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            highlightMedicationSuggestion(medicationSuggestionActiveIndex + 1);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            highlightMedicationSuggestion(
                medicationSuggestionActiveIndex <= 0 ? items.length - 1 : medicationSuggestionActiveIndex - 1
            );
        } else if (event.key === 'Enter' && medicationSuggestionActiveIndex >= 0) {
            const query = input.value.trim();
            const matches = filterMedicationSuggestions(query);
            const selected = matches[medicationSuggestionActiveIndex];
            if (selected) {
                event.preventDefault();
                selectMedicationSuggestion(selected);
            }
        } else if (event.key === 'Escape') {
            setMedicationSuggestionsOpen(false);
        }
    });

    input.addEventListener('change', updateDosageGuidanceUI);
}

// Define Greenville ZIP codes for identification
const greenvilleZips = ["29601", "29605", "29607", "29609", "29611", "29615", "29617"];

// Escape user-provided or external strings before inserting into HTML
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Wait for the page to fully load before initializing
document.addEventListener('DOMContentLoaded', async function() {
    // CARTO raster tiles stopped loading without an API key (Sept 2026).
    // OpenFreeMap vector tiles stay current and do not need a key.
    // Initialize map centered on South Carolina (Columbia area) for a state-level view
    // Use a broader zoom so users see the whole state on first load
    map = L.map('map', { maxZoom: 19 }).setView([33.8361, -81.1637], 7);

    try {
        if (typeof L.maplibreGL !== 'function') {
            throw new Error('L.maplibreGL missing');
        }
        L.maplibreGL({
            style: 'https://tiles.openfreemap.org/styles/liberty',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://openfreemap.org">OpenFreeMap</a>'
        }).addTo(map);
    } catch (err) {
        console.error('Map basemap failed to load:', err);
    }
    
    // Force the map to refresh its size after a brief delay and re-center it
    setTimeout(function() {
        map.invalidateSize();
        // ensure map stays centered on South Carolina after size fix (prevents off-center render)
        map.setView([33.8361, -81.1637], 7);
        // Add a small legend control explaining marker colors
        try {
            const legend = L.control({ position: 'topright' });
            legend.onAdd = function(map) {
                const div = L.DomUtil.create('div', 'map-legend');
                const title = document.createElement('div');
                title.className = 'legend-title';
                title.textContent = 'Legend';
                div.appendChild(title);

                const addItem = (imgSrc, alt, text) => {
                    const item = document.createElement('div');
                    item.className = 'legend-item';
                    const img = document.createElement('img');
                    img.src = imgSrc;
                    img.alt = alt;
                    item.appendChild(img);
                    const span = document.createElement('span');
                    span.textContent = ' ' + text;
                    item.appendChild(span);
                    div.appendChild(item);
                };

                addItem('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', 'green', 'Best price');
                addItem('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png', 'orange', '2nd best');
                addItem('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png', 'violet', '3rd best');
                addItem('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', 'blue', 'Other pharmacies');

                return div;
            };
            legend.addTo(map);
        } catch (e) {
            // non-fatal: if Leaflet isn't available yet, skip legend
            console.warn('Could not add legend control:', e);
        }
    }, 100);

    // Load pharmacy locations (required for map + price search by store)
    try {
        await loadPharmacies();
    } catch (err) {
        console.error('Failed to load pharmacies.json:', err);
        alert('Could not load pharmacy locations. Ensure pharmacies.json is available and try again.');
    }

    // Load CSV data
    loadCSVData();

    // Add initial markers
    addInitialMarkers();
    
    // Setup form submission
    setupFormHandler();
    setupSearchNearControls();
    setupResultSlipActions();
    setupResultSlipFallback();

    // Initialize dynamic dosage guidance UI
    const dosageSelect = document.getElementById('dosage');
    if (dosageSelect && !defaultDosageOptions) {
        defaultDosageOptions = Array.from(dosageSelect.options).map(o => ({ value: o.value, text: o.textContent }));
    }
    const quantitySelect = document.getElementById('quantity');
    if (quantitySelect && !defaultQuantityOptions) {
        defaultQuantityOptions = Array.from(quantitySelect.options).map(o => ({ value: o.value, text: o.textContent }));
    }
    const medicationInput = document.getElementById('medication');
    if (medicationInput) {
        setupMedicationAutocomplete();
    }
    setupSymptomPicker();
    updateDosageGuidanceUI();

    // Initialize trust / data freshness widget
    initTrustWidget();
});

// Function to load and parse CSV data
function loadCSVData() {
    // Load main CSV (all_data.csv)
    Papa.parse('all_data.csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            medicationData = results.data;
            csvLoaded = true;
            console.log('CSV data loaded successfully:', medicationData.length, 'records');
            populateMedicationDatalist();
            updateTrustWidgetRecords(medicationData.length);
        },
        error: function(error) {
            console.error('Error loading CSV:', error);
            alert('Error loading medication data. Please ensure all_data.csv is in the same directory.');
        }
    });

    // Load Greenville CSV (greenville_data.csv)
    Papa.parse('greenville_data.csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            greenvilleMedicationData = results.data;
            greenvilleCsvLoaded = true;
            console.log('Greenville CSV data loaded successfully:', greenvilleMedicationData.length, 'records');
            populateMedicationDatalist();
        },
        error: function(error) {
            console.error('Error loading Greenville CSV:', error);
            console.warn('Greenville data not available, will use main data as fallback.');
        }
    });
}

async function loadPharmacies() {
    const res = await fetch('pharmacies.json', { cache: 'no-cache' });
    if (!res.ok) {
        throw new Error(`pharmacies.json HTTP ${res.status}`);
    }
    const data = await res.json();
    const list = Array.isArray(data.pharmacies) ? data.pharmacies : [];
    pharmacies = list
        .map((p) => {
            const lat = Number(p.lat);
            const lng = Number(p.lng);
            return {
                name: String(p.name || '').trim(),
                lat,
                lng,
                address: String(p.address || '').trim(),
                phone: String(p.phone || '').trim(),
                chain: String(p.chain || '').trim(),
                placeId: String(p.placeId || '').trim()
            };
        })
        .filter((p) => p.name && Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.address);

    const countEl = document.getElementById('pharmacyCount');
    if (countEl && pharmacies.length > 0) {
        countEl.textContent = pharmacies.length.toLocaleString();
    }

    console.log('Pharmacies loaded from pharmacies.json:', pharmacies.length);
}

// Custom colored marker icons for highlighting top results
function markerIcon(color) {
    return new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-' + color + '.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
}

const greenIcon = markerIcon('green');
const orangeIcon = markerIcon('orange');
const violetIcon = markerIcon('violet');
const blueIcon = markerIcon('blue');

// Narrow ZIP multipliers for OTCs (small neighborhood effect)
// OTC drugs have minimal price variation by location due to:
// - Standardized manufacturer pricing and national chain competition
// - High price transparency (easy comparison shopping)
// Range: 0.99-1.03 (±3% max) reflects subtle differences in local competition
// Higher income areas (29615, 29601) = slightly lower prices (more competition)
// Lower income areas (29611, 29617) = slightly higher prices (fewer options)
const zipMultipliers = {
  "29615": 0.99,  // Pelham Rd - highest income, heavy retail competition
  "29601": 0.995, // Downtown - high income, multiple pharmacy options
  "29607": 1.00,  // Baseline - mid income, high store density
  "29605": 1.01,  // Lower-mid income, moderate competition
  "29609": 1.01,  // Lower-mid income, similar to 29605
  "29617": 1.02,  // Lower income, fewer pharmacy options
  "29611": 1.03   // Lowest income, limited competition
};

// Fallback if ZIP is not listed
function getZipMultiplier(zip) {
    return zipMultipliers[zip] || 1.0;
}

function extractZipCode(address) {
    const match = address.match(/\b[A-Z]{2}\s+(\d{5})\b/);
    if (match) return match[1];
    const allFive = address.match(/\b\d{5}\b/g);
    return allFive ? allFive[allFive.length - 1] : null;
}

/** Great-circle distance in miles (WGS84 sphere approximation). */
function milesBetween(lat1, lng1, lat2, lng2) {
    const R = 3958.8;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
    return R * c;
}

// Check if pharmacy is in Greenville based on ZIP code
function isGreenvillePharmacy(zipCode) {
    return greenvilleZips.includes(zipCode);
}

function clearFocusMarker() {
    if (focusMarker && map) {
        map.removeLayer(focusMarker);
    }
    focusMarker = null;
}

function clearMarkers() {
    currentMarkers.forEach(marker => map.removeLayer(marker));
    currentMarkers = [];
    mapExtraMarkers.forEach(marker => map.removeLayer(marker));
    mapExtraMarkers = [];
    clearFocusMarker();
}

function fitMapToMarkerList(markers) {
    if (!markers || !markers.length) return;
    const group = new L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.1));
}

function pharmacyPopupHtml(pharmacy, options) {
    const rankLabel = options.rankLabel || '';
    const showBest = !!options.showBest;
    const zipInfo =
        pharmacy.zipMultiplier !== 1.0
            ? `<div class="zip-info">ZIP ${pharmacy.zipCode} multiplier: ${pharmacy.zipMultiplier}x</div>`
            : '';
    const rankLine = rankLabel ? `<div class="popup-rank">${escapeHtml(rankLabel)}</div>` : '';
    return `
                <div class="popup-content">
                    ${rankLine}
                    <div class="popup-pharmacy">${escapeHtml(pharmacy.name)}</div>
                    <div>${escapeHtml(pharmacy.address)}</div>
                    <div class="popup-price">$${escapeHtml(pharmacy.price)}</div>
                    ${showBest ? '<div class="popup-best">BEST PRICE</div>' : ''}
                    ${pharmacyRequiresMembership(pharmacy) ? '<div class="popup-membership">Membership usually required</div>' : ''}
                    ${pharmacy.priceModeled ? '<div class="popup-modeled">Modeled estimate</div>' : ''}
                    ${zipInfo}
                </div>
            `;
}

function pharmacyCardHtml(pharmacy, rankIndex, bestPriceNum) {
    const priceNum = parseFloat(pharmacy.price);
    const savingsAmount =
        rankIndex === 0 ? 0 : ((priceNum - bestPriceNum) / bestPriceNum * 100).toFixed(0);
    const extraCost = rankIndex === 0 ? '' : (priceNum - bestPriceNum).toFixed(2);
    return `
                <div class="pharmacy-card" data-lat="${pharmacy.lat}" data-lng="${pharmacy.lng}">
                    <div class="pharmacy-name">${escapeHtml(pharmacy.name)}</div>
                    <div class="pharmacy-address">${escapeHtml(pharmacy.address)}</div>
                    <div class="price-info">
                        <div class="price">$${escapeHtml(pharmacy.price)}</div>
                        ${
                            rankIndex === 0
                                ? '<div class="savings">BEST PRICE</div>'
                                : Number(savingsAmount) > 0
                                  ? `<div class="price-more">+$${escapeHtml(extraCost)} more</div>`
                                  : ''
                        }
                    </div>
                    ${membershipNoteHtml(pharmacy)}
                    ${pharmacy.priceModeled ? '<div class="price-source-note">Modeled estimate</div>' : ''}
                    ${resultSlipActionsHtml(rankIndex, pharmacy.name)}
                </div>
            `;
}

function attachPharmacyCardClicks(container) {
    if (!container) return;
    container.querySelectorAll('.pharmacy-card').forEach(card => {
        const lat = parseFloat(card.getAttribute('data-lat'));
        const lng = parseFloat(card.getAttribute('data-lng'));
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            card.addEventListener('click', () => focusPharmacy(lat, lng, card));
        }
    });
}

function addMarkerForRankedResult(pharmacy, indexInTopList, popupHtml) {
    let marker;
    if (indexInTopList === 0) {
        marker = L.marker([pharmacy.lat, pharmacy.lng], { icon: greenIcon }).bindPopup(popupHtml).addTo(map);
    } else if (indexInTopList === 1) {
        marker = L.marker([pharmacy.lat, pharmacy.lng], { icon: orangeIcon }).bindPopup(popupHtml).addTo(map);
    } else if (indexInTopList === 2) {
        marker = L.marker([pharmacy.lat, pharmacy.lng], { icon: violetIcon }).bindPopup(popupHtml).addTo(map);
    } else {
        marker = L.marker([pharmacy.lat, pharmacy.lng], { icon: blueIcon }).bindPopup(popupHtml).addTo(map);
    }
    currentMarkers.push(marker);
}

// Function to get base price from CSV data
function getBasePriceFromData(drugName, pharmacyName, zipCode) {
    // Determine which dataset to use based on location
    const isGreenville = isGreenvillePharmacy(zipCode);
    const dataSource = isGreenville && greenvilleCsvLoaded ? greenvilleMedicationData : medicationData;
    
    if ((!csvLoaded && !isGreenville) || (!greenvilleCsvLoaded && isGreenville)) {
        return null;
    }
    
    if (dataSource.length === 0) {
        return null;
    }
    
    // Normalize the drug name for comparison (case-insensitive, ignores spaces/underscores)
    const normalizedDrug = medicationKey(drugName);
    
    // Find matching entries in the CSV data
    const matches = dataSource.filter(row => {
        const csvDrug = (row.Name || '').trim();
        const csvPharmacy = (row.Pharmacy || '').trim().toLowerCase().replace(/[\u2019']/g, '');
        const targetPharmacy = pharmacyName.trim().toLowerCase().replace(/[\u2019']/g, '');

        return medicationNamesMatch(normalizedDrug, csvDrug) && csvPharmacy.includes(targetPharmacy.split(' ')[0]);
    });
    
    if (matches.length > 0) {
        // Return the first match's price (remove $ sign and convert to number)
        const priceStr = matches[0].Price || '$0';
        return parseFloat(priceStr.replace('$', '').replace(',', ''));
    }
    
    return null;
}

// Calculate price based on base price, dosage, quantity, and ZIP code
//
// Pricing model (designed to avoid runaway prices, e.g. Ibuprofen >$200):
//   1. If the medication declares a baselineDosage/baselineQuantity, we scale
//      the CSV base price as a *ratio* against those baselines, using a
//      sub-linear power curve (mimics real bulk/strength discounts).
//   2. If no baseline is declared, we fall back to the original stepwise
//      multipliers (with a flatter tablet curve).
//   3. The combined dosage × quantity multiplier is always clamped to
//      MAX_COMBINED_MULTIPLIER as a safety net.
//   4. OTC drugs get an even tighter cap because OTC prices barely move with
//      strength or bottle size in the real world.
const MAX_COMBINED_MULTIPLIER = 6.0;      // Rx / unknown drugs
const MAX_COMBINED_MULTIPLIER_OTC = 3.5;  // OTC drugs (ibuprofen, acetaminophen, etc.)
const DOSAGE_SCALING_POWER = 0.6;         // Sub-linear: doubling mg < doubles price
const QUANTITY_SCALING_POWER = 0.75;      // Sub-linear: bulk discount built in

function calculatePrice(basePrice, dosage, quantity, zipCode, medicationName) {
    if (basePrice === null) {
        return null;
    }

    const zipMultiplier = getZipMultiplier(zipCode);

    const medInfo = getDosageInfo(medicationName);
    const quantityType = medInfo?.quantityType || 'tablets';
    const isOtc = !!medInfo?.otc;

    const dosageValue = parseInt(dosage) || 0;
    const qtyVal = parseFloat(quantity) || 1;

    // --- Calibrated path: medication has explicit baselines ---
    if (medInfo?.baselineDosage && medInfo?.baselineQuantity && dosageValue > 0) {
        const dosageRatio = dosageValue / medInfo.baselineDosage;
        const qtyRatio = qtyVal / medInfo.baselineQuantity;

        const dosageMult = Math.pow(Math.max(dosageRatio, 0.01), DOSAGE_SCALING_POWER);
        const qtyMult = Math.pow(Math.max(qtyRatio, 0.01), QUANTITY_SCALING_POWER);

        const cap = isOtc ? MAX_COMBINED_MULTIPLIER_OTC : MAX_COMBINED_MULTIPLIER;
        const combined = Math.min(dosageMult * qtyMult, cap);

        return basePrice * combined * zipMultiplier;
    }

    // --- Legacy path: stepwise multipliers (with flatter quantity curve) ---
    let dosageMultiplier = 1.0;
    if (dosageValue <= 10) {
        dosageMultiplier = 0.8;
    } else if (dosageValue <= 25) {
        dosageMultiplier = 1.0;
    } else if (dosageValue <= 100) {
        dosageMultiplier = 1.3;
    } else if (dosageValue <= 500) {
        dosageMultiplier = 1.6;
    } else {
        dosageMultiplier = 2.0;
    }
    
    // Quantity multiplier based on product form type
    let quantityMultiplier = 1.0;

    switch (quantityType) {
        case 'tablets':
        case 'capsules':
            // Tablet/capsule bulk pricing (base = 30 count).
            // Flattened from 4.8 -> 3.0 at 180 ct so OTC bulk packs don't
            // compound with the dosage multiplier into >$200 prices.
            if (qtyVal <= 30) {
                quantityMultiplier = 1.0;
            } else if (qtyVal <= 60) {
                quantityMultiplier = 1.7;
            } else if (qtyVal <= 90) {
                quantityMultiplier = 2.3;
            } else {
                quantityMultiplier = 3.0;
            }
            break;
            
        case 'cream':
        case 'ointment':
            // Cream/ointment pricing (base = 15g tube)
            if (quantity === '15g') {
                quantityMultiplier = 1.0;
            } else if (quantity === '30g') {
                quantityMultiplier = 1.7;
            } else if (quantity === '45g') {
                quantityMultiplier = 2.3;
            } else if (quantity === '60g') {
                quantityMultiplier = 2.9;
            } else {
                quantityMultiplier = qtyVal / 15;
            }
            break;
            
        case 'liquid':
            // Liquid pricing (base = 120ml)
            if (quantity === '120ml') {
                quantityMultiplier = 1.0;
            } else if (quantity === '240ml') {
                quantityMultiplier = 1.8;
            } else if (quantity === '480ml') {
                quantityMultiplier = 3.2;
            } else {
                quantityMultiplier = qtyVal / 120;
            }
            break;
            
        case 'powder':
            // Powder bottles (base = 1 bottle)
            quantityMultiplier = qtyVal * 0.95; // slight bulk discount
            if (quantityMultiplier < 1) quantityMultiplier = 1;
            break;
            
        case 'inhaler':
            // Inhalers (base = 1 inhaler)
            if (qtyVal === 1) {
                quantityMultiplier = 1.0;
            } else if (qtyVal === 2) {
                quantityMultiplier = 1.9;
            } else {
                quantityMultiplier = qtyVal * 0.93;
            }
            break;
            
        case 'nasalspray':
            // Nasal spray bottles (base = 1 bottle)
            if (qtyVal === 1) {
                quantityMultiplier = 1.0;
            } else if (qtyVal === 2) {
                quantityMultiplier = 1.85;
            } else {
                quantityMultiplier = qtyVal * 0.9;
            }
            break;
            
        case 'patch':
            // Patches (base = 7 patches / 1 week)
            if (qtyVal <= 7) {
                quantityMultiplier = 1.0;
            } else if (qtyVal <= 14) {
                quantityMultiplier = 1.9;
            } else if (qtyVal <= 28) {
                quantityMultiplier = 3.5;
            } else {
                quantityMultiplier = qtyVal / 7 * 0.9;
            }
            break;
            
        case 'gum':
            // Nicotine gum pieces (base = 20 pieces)
            if (qtyVal <= 20) {
                quantityMultiplier = 1.0;
            } else if (qtyVal <= 40) {
                quantityMultiplier = 1.8;
            } else if (qtyVal <= 100) {
                quantityMultiplier = 4.0;
            } else {
                quantityMultiplier = 7.5;
            }
            break;
            
        case 'lozenge':
            // Lozenges (base = 24 lozenges)
            if (qtyVal <= 24) {
                quantityMultiplier = 1.0;
            } else if (qtyVal <= 72) {
                quantityMultiplier = 2.7;
            } else {
                quantityMultiplier = 3.8;
            }
            break;
            
        case 'suppository':
            // Suppositories (base = 8 count)
            if (qtyVal <= 8) {
                quantityMultiplier = 1.0;
            } else if (qtyVal <= 12) {
                quantityMultiplier = 1.4;
            } else {
                quantityMultiplier = 4.5;
            }
            break;
            
        case 'single':
            // Single dose products (Plan B, etc.)
            quantityMultiplier = 1.0;
            break;
            
        case 'topicalsolution':
            // Topical solutions like Minoxidil (base = 1 month)
            if (quantity === '60ml' || qtyVal === 1) {
                quantityMultiplier = 1.0;
            } else if (qtyVal === 3) {
                quantityMultiplier = 2.7;
            } else {
                quantityMultiplier = qtyVal * 0.9;
            }
            break;
            
        case 'softgel':
            // Softgels like Omega-3 (base = 30 count)
            if (qtyVal <= 30) {
                quantityMultiplier = 1.0;
            } else if (qtyVal <= 60) {
                quantityMultiplier = 1.85;
            } else if (qtyVal <= 90) {
                quantityMultiplier = 2.6;
            } else {
                quantityMultiplier = 3.4;
            }
            break;
            
        default:
            // Fallback to tablet-style pricing (flattened curve)
            if (qtyVal <= 30) {
                quantityMultiplier = 1.0;
            } else if (qtyVal <= 60) {
                quantityMultiplier = 1.7;
            } else if (qtyVal <= 90) {
                quantityMultiplier = 2.3;
            } else {
                quantityMultiplier = 3.0;
            }
    }

    // Safety net: cap the combined dosage × quantity multiplier so no drug
    // can balloon past a reasonable ceiling (OTCs capped more tightly).
    const cap = isOtc ? MAX_COMBINED_MULTIPLIER_OTC : MAX_COMBINED_MULTIPLIER;
    const combined = Math.min(dosageMultiplier * quantityMultiplier, cap);

    return basePrice * combined * zipMultiplier;
}

function calculateSavings(prices) {
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    return Math.round(((maxPrice - minPrice) / maxPrice) * 100);
}

function displayResults(medication, dosage, quantity, center, radiusMiles, locationLabel, searchMode) {
    const resultsDiv = document.getElementById('results');
    lastSearch = null;
    
    if (!csvLoaded && !greenvilleCsvLoaded) {
        resultsDiv.innerHTML = '';
        const ld = document.createElement('div');
        ld.className = 'loading';
        ld.textContent = 'Loading medication data...';
        resultsDiv.appendChild(ld);
        return;
    }
    resultsDiv.innerHTML = '';
    const searching = document.createElement('div');
    searching.className = 'loading';
    searching.textContent = 'Searching pharmacies...';
    resultsDiv.appendChild(searching);
    
    setTimeout(() => {
        if (!pharmacies.length) {
            resultsDiv.innerHTML = `
                <div class="no-results">
                    <strong>Pharmacy locations unavailable.</strong><br>
                    The site could not load <code>pharmacies.json</code>. Refresh the page or check that the file is deployed with the site.
                </div>
            `;
            return;
        }

        // Brand names (Advil, Zyrtec) price as the catalog generic.
        const pricedAs = resolveMedicationQuery(medication);
        const searchLabel =
            medicationKey(medication) !== medicationKey(pricedAs)
                ? `${pricedAs} (${medication})`
                : pricedAs;

        // Check if the medication exists in either dataset
        const existsInMain = medicationData.some((row) => medicationNamesMatch(pricedAs, row.Name));
        const existsInGreenville = greenvilleMedicationData.some((row) => medicationNamesMatch(pricedAs, row.Name));
        
        if (!existsInMain && !existsInGreenville) {
            resultsDiv.innerHTML = `
                <div class="no-results">
                    <strong>Drug not found:</strong> <span id="nf-med">""</span> was not found in our database.<br>
                    Please check the spelling or try another medication.
                </div>
            `;
            const nfSpan = resultsDiv.querySelector('#nf-med');
            if (nfSpan) nfSpan.textContent = '"' + medication + '"';
            console.warn(`Medication "${medication}" not found in CSV.`);
            return;
        }

        let pharmacyPool = pharmacies;
        let areaSummary = '';

        if (
            center != null &&
            typeof center.lat === 'number' &&
            typeof center.lng === 'number' &&
            Number.isFinite(radiusMiles) &&
            radiusMiles > 0
        ) {
            const label = (locationLabel || 'selected location').trim();
            pharmacyPool = pharmacies.filter(
                (p) => milesBetween(center.lat, center.lng, p.lat, p.lng) <= radiusMiles
            );
            areaSummary = `Within ${radiusMiles} mi of ${label}. `;
            if (!pharmacyPool.length) {
                resultsDiv.innerHTML = `
                <div class="no-results">
                    <strong>No pharmacies in this area.</strong><br>
                    No locations in our directory fall within ${escapeHtml(String(radiusMiles))} miles of ${escapeHtml(label)}.
                    Try a larger radius or choose <strong>Entire South Carolina</strong>.
                </div>
            `;
                return;
            }
        }

        // Get prices for each pharmacy in the pool
        const results = [];

        pharmacyPool.forEach(pharmacy => {
            // Extract ZIP code from pharmacy address
            const pharmacyZip = extractZipCode(pharmacy.address);
            
            // Get base price using the appropriate dataset
            const basePrice = getBasePriceFromData(pricedAs, pharmacy.name, pharmacyZip);

            if (basePrice !== null) {
                // Calculate price with ZIP code multiplier
                const calculatedPrice = calculatePrice(basePrice, dosage, quantity, pharmacyZip, pricedAs);
                
                const pricedPharmacy = {
                    ...pharmacy,
                    price: calculatedPrice.toFixed(2),
                    zipCode: pharmacyZip,
                    zipMultiplier: getZipMultiplier(pharmacyZip)
                };
                pricedPharmacy.priceModeled = pharmacyPriceIsModeled(
                    pricedPharmacy,
                    pricedAs,
                    dosage,
                    quantity,
                    searchMode
                );
                results.push(pricedPharmacy);
            }
        });
        
        // Check if we found any results
        if (results.length === 0) {
            resultsDiv.innerHTML = `
                <div class="no-results">
                    <strong>No results found for "<span id=nr-med></span>"</strong><br>
                    Please check the spelling or try another medication.<br><br>
                    <em>Available medications include: Ibuprofen, Acetaminophen, Amlodipine, Atorvastatin, Metformin, and more.</em>
                </div>
            `;
            const nrSpan = resultsDiv.querySelector('#nr-med');
            if (nrSpan) nrSpan.textContent = escapeHtml(medication);
            return;
        }
        
        // Sort by price (lowest first)
        results.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

        const totalWithPrice = results.length;
        const topResults = results.slice(0, RESULTS_TOP_N);
        const restResults = results.slice(RESULTS_TOP_N);
        const bestPriceNum = parseFloat(results[0].price);

        const prices = topResults.map(r => parseFloat(r.price));
        const savings = calculateSavings(prices);

        clearMarkers();

        const showingLine =
            totalWithPrice > RESULTS_TOP_N
                ? `Top ${RESULTS_TOP_N} matches are listed first (by price). ${totalWithPrice - RESULTS_TOP_N} more below. Map shows these top ${RESULTS_TOP_N} only unless you opt in. `
                : `Showing ${totalWithPrice} match${totalWithPrice === 1 ? '' : 'es'} (by price). `;

        const areaLabel =
            searchMode === 'state' ? 'Entire South Carolina' : (locationLabel || 'selected location').trim();
        const modeledNote = searchPriceNote(pricedAs, dosage, quantity, searchMode, results);
        const brandNote = brandGenericSentence(medication, pricedAs);
        rememberSearchSnapshot({
            typedName: medication,
            pricedAs,
            dosage,
            quantity,
            searchMode,
            locationLabel,
            bestPrice: topResults[0].price,
            generatedAt: new Date(),
            results
        });
        const reportHref = priceReportHref({
            medication: searchLabel,
            dosage,
            quantity,
            area: areaLabel,
            pharmacy: topResults[0].name,
            price: topResults[0].price
        });

        let resultsHTML = `<div class="results-banner">
            <strong class="banner-title">Searching for:</strong> ${escapeHtml(searchLabel)} ${escapeHtml(dosage)} (qty: ${escapeHtml(quantity)})<br>
            <span class="banner-area">${escapeHtml(areaSummary)}${escapeHtml(showingLine)}</span><br>
            <strong class="banner-best">Best Price:</strong> $${escapeHtml(topResults[0].price)} at ${escapeHtml(topResults[0].name)}<br>
            <strong class="banner-savings">You could save up to ${escapeHtml(savings)}%</strong> among the top results by choosing the best price!
            ${brandNote ? `<p class="banner-brand">${escapeHtml(brandNote)}</p>` : ''}
            <p class="banner-disclaimer">Estimate, not a pharmacy quote, and not medical advice. That savings figure is the spread between these listed prices.</p>
            ${modeledNote ? `<p class="banner-modeled">${escapeHtml(modeledNote)}</p>` : ''}
            <a class="report-price-link" href="${escapeHtml(reportHref)}" target="_blank" rel="noopener noreferrer">Report a wrong price</a>
        </div>`;

        if (totalWithPrice > RESULTS_TOP_N) {
            resultsHTML += `<div class="map-match-controls">
                <label class="map-show-all-label">
                    <input type="checkbox" id="mapShowAllCheckbox" />
                    <span>Show all ${totalWithPrice} matches on the map <span class="map-match-hint">(adds ${restResults.length} beyond the top ${RESULTS_TOP_N})</span></span>
                </label>
            </div>`;
        }

        resultsHTML += `<div class="results-section-label">Top ${Math.min(RESULTS_TOP_N, totalWithPrice)} by price</div>`;
        resultsHTML += `<div class="results-list results-list--top" id="resultsTopList">`;

        topResults.forEach((pharmacy, index) => {
            resultsHTML += pharmacyCardHtml(pharmacy, index, bestPriceNum);
            const popupHtml = pharmacyPopupHtml(pharmacy, {
                showBest: index === 0,
                rankLabel: `#${index + 1} of ${totalWithPrice}`
            });
            addMarkerForRankedResult(pharmacy, index, popupHtml);
        });

        resultsHTML += `</div>`;

        if (restResults.length > 0) {
            const moreCount = restResults.length;
            resultsHTML += `<details class="results-details" id="resultsDetailsAll">
                <summary class="results-details-summary">Show all ${totalWithPrice} matches <span class="results-details-badge">(${moreCount} more)</span></summary>
                <div class="results-list results-list--rest" id="resultsRestList">`;
            restResults.forEach((pharmacy, i) => {
                const rankIndex = RESULTS_TOP_N + i;
                resultsHTML += pharmacyCardHtml(pharmacy, rankIndex, bestPriceNum);
            });
            resultsHTML += `</div></details>`;
        }

        resultsDiv.innerHTML = resultsHTML;

        attachPharmacyCardClicks(resultsDiv);

        const mapShowAllCheckbox = document.getElementById('mapShowAllCheckbox');
        if (mapShowAllCheckbox && restResults.length > 0) {
            mapShowAllCheckbox.addEventListener('change', () => {
                if (mapShowAllCheckbox.checked) {
                    restResults.forEach((pharmacy, i) => {
                        const rankIndex = RESULTS_TOP_N + i;
                        const popupHtml = pharmacyPopupHtml(pharmacy, {
                            showBest: false,
                            rankLabel: `#${rankIndex + 1} of ${totalWithPrice}`
                        });
                        const marker = L.marker([pharmacy.lat, pharmacy.lng], { icon: blueIcon }).bindPopup(popupHtml).addTo(map);
                        mapExtraMarkers.push(marker);
                    });
                    fitMapToMarkerList([...currentMarkers, ...mapExtraMarkers]);
                } else {
                    mapExtraMarkers.forEach(m => map.removeLayer(m));
                    mapExtraMarkers = [];
                    fitMapToMarkerList(currentMarkers);
                }
            });
        }

        fitMapToMarkerList(currentMarkers);
        
        // Update stats with animation
        const headerReport = document.getElementById('reportPriceLink');
        if (headerReport) headerReport.href = reportHref;

        setTimeout(() => {
            document.getElementById('avgSavings').textContent = savings + '%';
            const savingsNote = document.getElementById('avgSavingsNote');
            if (savingsNote) {
                savingsNote.textContent =
                    'Estimate: gap between the highest and lowest prices in these results, not a quote.';
            }
        }, 500);
    }, 1000);
}

function markerMatches(marker, lat, lng) {
    const pos = marker.getLatLng();
    return Math.abs(pos.lat - lat) < 0.00005 && Math.abs(pos.lng - lng) < 0.00005;
}

function focusPharmacy(lat, lng, card) {
    if (!map) return;
    const match = currentMarkers.concat(mapExtraMarkers).find((marker) => markerMatches(marker, lat, lng));
    clearFocusMarker();
    map.setView([lat, lng], 16);
    if (match) {
        match.openPopup();
    } else {
        const name = card?.querySelector('.pharmacy-name')?.textContent || 'Pharmacy';
        const address = card?.querySelector('.pharmacy-address')?.textContent || '';
        focusMarker = L.marker([lat, lng], { icon: blueIcon, zIndexOffset: 1000 })
            .bindPopup(`
                <div class="popup-content">
                    <div class="popup-pharmacy">${escapeHtml(name)}</div>
                    <div>${escapeHtml(address)}</div>
                </div>
            `)
            .addTo(map)
            .openPopup();
    }

    const mapEl = document.getElementById('map');
    if (mapEl) {
        const rect = mapEl.getBoundingClientRect();
        const onScreen = rect.bottom > 80 && rect.top < window.innerHeight - 40;
        if (!onScreen) {
            mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    setTimeout(() => map.invalidateSize(), 300);
}

function setupSearchNearControls() {
    const searchNear = document.getElementById('searchNear');
    const radiusSelect = document.getElementById('radiusMiles');
    const radiusGroup = document.getElementById('radiusGroup');
    if (!searchNear || !radiusSelect) return;

    function sync() {
        const entire = searchNear.value === 'state';
        radiusSelect.disabled = entire;
        if (radiusGroup) radiusGroup.classList.toggle('is-disabled', entire);
        updateAreaEstimateHint();
    }

    searchNear.addEventListener('change', sync);
    sync();
}

// Handle form submission
function setupFormHandler() {
    document.getElementById('searchForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const medication = document.getElementById('medication').value.trim();
        const dosage = document.getElementById('dosage').value;
        const quantity = document.getElementById('quantity').value;
        const mode = document.getElementById('searchNear').value;
        const radiusMiles = parseFloat(document.getElementById('radiusMiles').value);
        
        if (!medication || !dosage || !quantity) {
            alert('Please fill in all fields');
            return;
        }

        if (!isMedicationOtc(medication)) {
            alert('Please choose an OTC medication. Prescription-only medications are not supported.');
            return;
        }

        const run = (center, label) =>
            displayResults(medication, dosage, quantity, center, radiusMiles, label, mode);

        if (mode === 'state') {
            displayResults(medication, dosage, quantity, null, null, null, mode);
        } else if (mode === 'geolocation') {
            if (!navigator.geolocation) {
                alert('This browser does not support location. Choose a city or Entire South Carolina.');
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) =>
                    run(
                        { lat: pos.coords.latitude, lng: pos.coords.longitude },
                        'your location'
                    ),
                () =>
                    alert(
                        'Could not read your location. Allow location access for this site, or pick a city instead.'
                    ),
                { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
            );
        } else {
            const c = SEARCH_CENTERS[mode];
            if (!c) {
                displayResults(medication, dosage, quantity, null, null, null, mode);
                return;
            }
            run({ lat: c.lat, lng: c.lng }, c.label);
        }
    });
}

function addInitialMarkers() {
    if (!pharmacies.length) return;
    pharmacies.slice(0, 4).forEach(pharmacy => {
        const marker = L.marker([pharmacy.lat, pharmacy.lng], { icon: blueIcon })
            .bindPopup(`
               <div class="popup-content">
                   <div class="popup-pharmacy">${escapeHtml(pharmacy.name)}</div>
                   <div>${escapeHtml(pharmacy.address)}</div>
                   <div class="popup-note">Search for a medication to see prices</div>
               </div>
           `)
            .addTo(map);
        currentMarkers.push(marker);
    });
}