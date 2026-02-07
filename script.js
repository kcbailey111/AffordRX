/**
 * Author: Kyler Bailey
 * Date: 2024-06-15
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
        quantityType: 'tablets'
    },
    aluminum: {
        guidance: 'Antacid products vary. Follow the product label; typical adult doses are taken after meals and at bedtime as needed.',
        quantityType: 'liquid'
    },
    amlodipine: {
        guidance: 'Adults (HTN/angina): typically 5 mg once daily; range 2.5–10 mg once daily.',
        options: ['2.5mg', '5mg', '10mg'],
        defaultOption: '5mg',
        quantityType: 'tablets'
    },
    aspirin: {
        guidance: 'Pain/fever: 325–650 mg every 4–6 hours as needed. Cardioprotection (if prescribed): commonly 81 mg once daily.',
        options: ['81mg', '325mg', '500mg'],
        defaultOption: '325mg',
        quantityType: 'tablets'
    },
    atorvastatin: {
        guidance: 'Adults: typically 10–20 mg once daily to start; range 10–80 mg once daily depending on cholesterol goals.',
        options: ['10mg', '20mg', '40mg', '80mg'],
        defaultOption: '20mg',
        quantityType: 'tablets'
    },
    azelastine: {
        guidance: 'Nasal spray: commonly 1–2 sprays in each nostril twice daily (depends on product/indication).',
        quantityType: 'nasalspray'
    },
    azithromycin: {
        guidance: 'Typical adult regimens depend on infection. Common “Z-Pak”: 500 mg on day 1, then 250 mg daily on days 2–5 (if prescribed).',
        options: ['250mg', '500mg'],
        defaultOption: '250mg',
        quantityType: 'tablets'
    },
    bactrim: {
        guidance: 'Formulations vary (TMP-SMX). A common adult regimen is DS 800/160 mg every 12 hours for certain infections (if prescribed).',
        options: ['80mg', '160mg', '400mg', '800mg'],
        quantityType: 'tablets'
    },
    benadryl: {
        guidance: 'Diphenhydramine (adult): 25–50 mg every 4–6 hours as needed; max 300 mg/day (check label).',
        options: ['25mg', '50mg'],
        defaultOption: '25mg',
        quantityType: 'tablets'
    },
    benzocaine: {
        guidance: 'Topical/oral products vary by % and form. Follow the product label; use the smallest amount needed.',
        quantityType: 'cream'
    },
    bisacodyl: {
        guidance: 'Constipation (adult): oral 5–15 mg once daily as needed; suppository 10 mg once daily as needed (follow label).',
        options: ['5mg', '10mg', '15mg'],
        defaultOption: '5mg',
        quantityType: 'tablets'
    },
    calcium: {
        guidance: 'Supplement/antacid products vary (carbonate vs citrate). Typical supplemental elemental calcium is often 500–600 mg per dose; follow label/clinician advice.',
        options: ['500mg', '600mg'],
        quantityType: 'tablets'
    },
    capsaicin: {
        guidance: 'Topical products vary by % (e.g., 0.025–0.1%). Apply thin layer as directed on label.',
        quantityType: 'cream'
    },
    cetirizine: {
        guidance: 'Allergies (adult): 10 mg once daily (some start with 5 mg).',
        options: ['5mg', '10mg'],
        defaultOption: '10mg',
        quantityType: 'tablets'
    },
    chlorpheniramine: {
        guidance: 'Allergies (adult): commonly 4 mg every 4–6 hours as needed; max 24 mg/day (check label).',
        options: ['4mg'],
        defaultOption: '4mg',
        quantityType: 'tablets'
    },
    clotrimazole: {
        guidance: 'Topical/vaginal products vary by % and form. Follow the product label for duration and frequency.',
        quantityType: 'cream'
    },
    dextromethorphan: {
        guidance: 'Cough: dosing depends on formulation (IR vs ER). Many adult IR products are 10–20 mg every 4 hours or 30 mg every 6–8 hours; follow label.',
        options: ['10mg', '20mg', '30mg'],
        quantityType: 'liquid'
    },
    diphenhydramine: {
        guidance: 'Allergy (adult): 25–50 mg every 4–6 hours as needed; max 300 mg/day (check label).',
        options: ['25mg', '50mg'],
        defaultOption: '25mg',
        quantityType: 'tablets'
    },
    duloxetine: {
        guidance: 'Adults: commonly 30 mg once daily to start, then 60 mg once daily; max varies by indication (if prescribed).',
        options: ['20mg', '30mg', '60mg'],
        defaultOption: '30mg',
        quantityType: 'capsules'
    },
    escitalopram: {
        guidance: 'Adults: commonly 10 mg once daily; some increase to 20 mg once daily (if prescribed).',
        options: ['5mg', '10mg', '20mg'],
        defaultOption: '10mg',
        quantityType: 'tablets'
    },
    esomeprazole: {
        guidance: 'GERD: commonly 20–40 mg once daily (duration varies).',
        options: ['20mg', '40mg'],
        defaultOption: '20mg',
        quantityType: 'capsules'
    },
    famotidine: {
        guidance: 'Heartburn/GERD: OTC often 10–20 mg once or twice daily; prescriptions may use higher doses (follow label/prescriber).',
        options: ['10mg', '20mg', '40mg'],
        defaultOption: '20mg',
        quantityType: 'tablets'
    },
    fexofenadine: {
        guidance: 'Allergies (adult): 60 mg twice daily or 180 mg once daily (depends on product).',
        options: ['60mg', '180mg'],
        defaultOption: '180mg',
        quantityType: 'tablets'
    },
    fluticasonesalmeterol: {
        guidance: 'Inhaler dosing varies by product strength. Common adult maintenance is 1 inhalation twice daily (if prescribed).',
        options: ['100/50mcg', '250/50mcg', '500/50mcg'],
        quantityType: 'inhaler'
    },
    guaifenesin: {
        guidance: 'Expectorant: IR often 200–400 mg every 4 hours as needed; ER often 600–1,200 mg every 12 hours (max varies; follow label).',
        options: ['200mg', '400mg', '600mg', '1200mg'],
        defaultOption: '600mg',
        quantityType: 'liquid'
    },
    hydrocortisone: {
        guidance: 'Topical products commonly 0.5–1%. Apply a thin layer 1–4 times daily as directed (follow label).',
        quantityType: 'cream'
    },
    ibuprofen: {
        guidance: 'Pain/fever (adult): 200–400 mg every 4–6 hours as needed; max 1,200 mg/day OTC (higher doses only if prescribed).',
        options: ['200mg', '400mg', '600mg', '800mg'],
        defaultOption: '200mg',
        quantityType: 'tablets'
    },
    lansoprazole: {
        guidance: 'GERD: commonly 15–30 mg once daily (duration varies).',
        options: ['15mg', '30mg'],
        defaultOption: '15mg',
        quantityType: 'capsules'
    },
    loperamide: {
        guidance: 'Diarrhea (adult): 4 mg initially, then 2 mg after each loose stool; max 8 mg/day OTC (follow label).',
        options: ['2mg'],
        defaultOption: '2mg',
        quantityType: 'tablets'
    },
    loratadine: {
        guidance: 'Allergies (adult): 10 mg once daily.',
        options: ['10mg'],
        defaultOption: '10mg',
        quantityType: 'tablets'
    },
    losartan: {
        guidance: 'Adults (HTN): commonly 50 mg once daily to start; range 25–100 mg/day (once daily or divided) (if prescribed).',
        options: ['25mg', '50mg', '100mg'],
        defaultOption: '50mg',
        quantityType: 'tablets'
    },
    meclizine: {
        guidance: 'Motion sickness/vertigo: commonly 25–50 mg once daily or every 24 hours as needed (follow label/prescriber).',
        options: ['25mg', '50mg'],
        defaultOption: '25mg',
        quantityType: 'tablets'
    },
    melatonin: {
        guidance: 'Sleep: commonly 1–5 mg 30–60 minutes before bedtime; start low (follow label).',
        options: ['1mg', '3mg', '5mg', '10mg'],
        defaultOption: '3mg',
        quantityType: 'tablets'
    },
    miconazole: {
        guidance: 'Topical/vaginal products vary by % and duration. Follow the product label.',
        quantityType: 'cream'
    },
    minoxidil: {
        guidance: 'Topical hair loss products commonly 2% or 5% solution/foam; apply as directed on the label.',
        quantityType: 'topicalsolution'
    },
    miralax: {
        guidance: 'Constipation: commonly 17 g powder dissolved in liquid once daily as needed (follow label).',
        options: ['17g'],
        defaultOption: '17g',
        quantityType: 'powder'
    },
    naproxen: {
        guidance: 'Pain (adult): OTC naproxen sodium 220 mg every 8–12 hours; max 660 mg/day OTC (follow label).',
        options: ['220mg', '250mg', '375mg', '500mg'],
        defaultOption: '220mg',
        quantityType: 'tablets'
    },
    nicotine: {
        guidance: 'Smoking cessation products vary (gum/lozenge/patch). Follow the product label for a taper schedule.',
        quantityType: 'patch'
    },
    omega3acid: {
        guidance: 'Omega-3 products vary. Prescription omega-3 acid ethyl esters are often 2 g twice daily with meals (if prescribed).',
        options: ['1000mg', '2000mg'],
        quantityType: 'softgel'
    },
    omeprazole: {
        guidance: 'Heartburn/GERD: commonly 20 mg once daily before a meal (OTC courses are typically 14 days).',
        options: ['10mg', '20mg', '40mg'],
        defaultOption: '20mg',
        quantityType: 'capsules'
    },
    pantoprazole: {
        guidance: 'GERD: commonly 40 mg once daily (if prescribed).',
        options: ['20mg', '40mg'],
        defaultOption: '40mg',
        quantityType: 'tablets'
    },
    phenylephrine: {
        guidance: 'Decongestant: many adult oral products are 10 mg every 4 hours as needed (follow label).',
        options: ['10mg'],
        defaultOption: '10mg',
        quantityType: 'tablets'
    },
    planb: {
        guidance: 'Emergency contraception (levonorgestrel): 1.5 mg as a single dose as soon as possible after unprotected sex (follow product label).',
        options: ['1.5mg'],
        defaultOption: '1.5mg',
        quantityType: 'single'
    },
    polyethylene: {
        guidance: 'Polyethylene glycol products vary. For PEG 3350 constipation products, a common adult dose is 17 g once daily (follow label).',
        options: ['17g'],
        defaultOption: '17g',
        quantityType: 'powder'
    },
    pseudoephedrine: {
        guidance: 'Decongestant: IR commonly 60 mg every 4–6 hours; ER commonly 120 mg every 12 hours (max varies; follow label).',
        options: ['30mg', '60mg', '120mg'],
        defaultOption: '60mg',
        quantityType: 'tablets'
    },
    sertraline: {
        guidance: 'Adults: commonly 25–50 mg once daily to start; may increase up to 200 mg/day depending on indication (if prescribed).',
        options: ['25mg', '50mg', '100mg', '150mg', '200mg'],
        defaultOption: '50mg',
        quantityType: 'tablets'
    },
    sildenafil: {
        guidance: 'Erectile dysfunction: commonly 50 mg taken as needed about 1 hour before sexual activity; range 25–100 mg (max once daily) (if prescribed).',
        options: ['25mg', '50mg', '100mg'],
        defaultOption: '50mg',
        quantityType: 'tablets'
    },
    simethicone: {
        guidance: 'Gas relief: products vary. Common adult dosing is 40–125 mg after meals and at bedtime as needed (follow label).',
        options: ['40mg', '80mg', '125mg'],
        defaultOption: '80mg',
        quantityType: 'tablets'
    },
    terbinafine: {
        guidance: 'Athlete’s foot/ringworm creams vary; oral terbinafine (if prescribed) is often 250 mg once daily. Follow label/prescriber.',
        options: ['250mg'],
        quantityType: 'cream'
    },
    tolnaftate: {
        guidance: 'Topical antifungal products vary by % and form. Follow the product label for frequency/duration.',
        quantityType: 'cream'
    },
    vitamin: {
        guidance: 'Vitamins vary by type and strength. Follow the product label or clinician advice.',
        quantityType: 'tablets'
    }
};

// Common aliases/brand names -> canonical keys used above
const DOSAGE_ALIASES = {
    tylenol: 'acetaminophen',
    benadryl: 'diphenhydramine',
    'polyethylene glycol': 'polyethylene',
    'polyethylene glycol 3350': 'miralax',
    advair: 'fluticasonesalmeterol',
    planb: 'planb',
    lipitor: 'atorvastatin',
    zpak: 'azithromycin',
    zithromax: 'azithromycin'
};

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

function populateMedicationDatalist() {
    const datalist = document.getElementById('medicationList');
    if (!datalist) return;

    const names = new Set();
    medicationData.forEach(row => {
        const name = (row.Name || '').toString().trim();
        if (name) names.add(name);
    });
    greenvilleMedicationData.forEach(row => {
        const name = (row.Name || '').toString().trim();
        if (name) names.add(name);
    });

    const sorted = Array.from(names).sort((a, b) => a.localeCompare(b));
    datalist.innerHTML = '';
    sorted.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        datalist.appendChild(opt);
    });
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
document.addEventListener('DOMContentLoaded', function() {
    // Initialize map centered on South Carolina (Columbia area) for a state-level view
    // Use a broader zoom so users see the whole state on first load
    map = L.map('map').setView([33.8361, -81.1637], 7);
    
    // Add CartoDB Voyager tiles for a colorful map
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);
    
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
                addItem('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png', 'default', 'Other pharmacies');

                return div;
            };
            legend.addTo(map);
        } catch (e) {
            // non-fatal: if Leaflet isn't available yet, skip legend
            console.warn('Could not add legend control:', e);
        }
    }, 100);

    // Load CSV data
    loadCSVData();
    
    // Add initial markers
    addInitialMarkers();
    
    // Setup form submission
    setupFormHandler();

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
        medicationInput.addEventListener('input', updateDosageGuidanceUI);
        medicationInput.addEventListener('change', updateDosageGuidanceUI);
    }
    updateDosageGuidanceUI();
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

// Locations of Pharmacies in Spartanburg, SC area
const pharmacies = [
    { name: "Walgreens", lat: 34.966263, lng: -81.895416, address: "1790 E Main St, Spartanburg, SC 29307", phone: "(864) 555-0131" },
    { name: "Publix Pharmacy", lat: 34.967105, lng: -81.890509, address: "1701 E Main St, Spartanburg, SC 29307", phone: "(864) 555-0132" },
    { name: "Publix Pharmacy at the Market at Boiling Springs", lat: 35.06583095100721, lng: -81.99863749814074, address: "4400 SC-9, Boiling Springs, SC 29316", phone: "(864) 274-6225" },
    { name: "Walgreens", lat: 35.05121984047732, lng: -81.98158116799644, address: "3681 Boiling Springs Rd, Boiling Springs, SC 29316", phone: "(864) 578-2414" },
    { name: "Boiling Springs Pharmacy", lat: 35.02134010093637, lng: -81.95976493176535, address: "2528 Boiling Springs Rd Suite D, Boiling Springs, SC 29316", phone: "(864) 515-2600" },
    { name: "CVS", lat: 35.020774675372714, lng: -81.9610189759189, address: "1888 Boiling Springs Rd, Boiling Springs, SC 29316", phone: "(864) 599-0920" },
    { name: "Spartanburg Regional Pharmacy - Physician Center - Spartanburg", lat: 34.971346250376314, lng: -81.93936656157912, address: "100 E Wood St #101, Spartanburg, SC 29303", phone: "(864) 560-9200" },
    { name: "Walgreens", lat: 34.9741850537861, lng: -81.93388128330479, address: "1000 N Pine St, Spartanburg, SC 29303", phone: "(864) 585-9136" },
    { name: "Publix Pharmacy at Hillcrest Shopping Center", lat: 34.97039996027779, lng: -81.88913295765462, address: "1905 E Main St, Spartanburg, SC 29307", phone: "(864) 253-1833" },
    { name: "Walgreens", lat: 34.926385420512275, lng: -81.8871120656588, address: "2198 Southport Rd, Spartanburg, SC 29306", phone: "(864) 582-5822" },
    { name: "CVS", lat: 34.92010471452222, lng: -81.99260180058504, address: "2397 Reidville Rd, Spartanburg, SC 29301", phone: "(864) 576-9268" },
    { name: "Walmart Supercenter", lat: 34.93364371932264, lng: -81.98464891678711, address: "141 Dorman Centre Dr, Spartanburg, SC 29301", phone: "(864) 574-6452" },
    { name: "Walmart Neighborhood Market", lat: 34.921052480750994, lng: -81.8845498539414, address: "203 Cedar Springs Rd, Spartanburg, SC 29302", phone: "(864) 381-6365" }, 
    { name: "Walmart Supercenter", lat: 34.97320191086142, lng: -81.87687609863929, address: "2151 E Main St, Spartanburg, SC 29307", phone: "(864) 529-0156" },
    { name: "Walgreens", lat: 34.9225310478231, lng: -81.99433399372431, address: "2410 Reidville Rd, Spartanburg, SC 29301", phone: "(864) 587-9486" },
    { name: "CVS", lat: 34.934579497121796, lng: -82.00891013499744, address: "8199 Warren H Abernathy Hwy, Spartanburg, SC 29301", phone: "(864) 576-7591" },


    // Additions of Greenville Pharmacies
    //Need to verify lat/lng values along with the actual addresses and phone numbers
    { name: "CVS", lat: 34.852617, lng: -82.394012, address: "201 E Butler Rd, Greenville, SC 29607", phone: "(864) 297-1234" },
    { name: "Walgreens", lat: 34.847123, lng: -82.400456, address: "1500 Woodruff Rd, Greenville, SC 29607", phone: "(864) 297-5678" },
    { name: "Publix Pharmacy", lat: 34.849876, lng: -82.391234, address: "1200 E North St, Greenville, SC 29607", phone: "(864) 297-9101" },
    {name: "Walmart", lat: 34.911906169106146, lng: -82.43086384247985, address: "5009 Old Buncombe Rd, Greenville, SC 29617", phone: "(864) 605-6370"},
    {name: "Walmart Pharmacy", lat: 34.86168092564008, lng: -82.26315161189558, address: "3925 Pelham Rd, Greenville, SC 29615", phone: "(864) 288-8171"},

    {name: "CVS",  lat: 34.849905999942756, lng: -82.39907721361867, address: "35 S Main St, Greenville, SC 29601", phone: "(864) 370-4848"},
    {name: "CVS",  lat: 34.83496584081104, lng: -82.35269326944147, address: "2210 Laurens Rd, Greenville, SC 29607", phone: "(864) 288-8280"},
    {name: "CVS",  lat: 34.89456999763415, lng: -82.43125552156793, address:"4102 Old Buncombe Rd, Greenville, SC 29617", phone: "(864) 371-3651"},
    {name: "CVS", lat: 34.8221701027552, lng: -82.41569138293511, address: "718 Mills Ave, Greenville, SC 29605", phone: "(864) 421-1586"},
    {name: "CVS", lat: 34.83680665742059, lng: -82.2788953350616, address: "1509 Roper Mountain Rd, Greenville, SC 29615", phone: "(864) 213-1082"},
    {name: "CVS", lat: 34.9048783820055, lng: -82.38764627128955, address: "1141 State Park Rd, Greenville, SC 29609", phone: "(864) 240-7421"},
    {name: "CVS", lat: 34.86944913958712, lng: -82.35777330012502, address: "2401 E North St, Greenville, SC 29615", phone: "(864) 244-1851"},
    {name: "CVS", lat: 34.81487069649635, lng: -82.2732805424541, address: "1200 E Butler Rd, Greenville, SC 29607", phone: "(864) 297-2501"},
    {name: "CVS", lat: 34.86053347901237, lng: -82.2651722136187, address: "3901 Pelham Rd, Greenville, SC 29615", phone: "(864) 288-3672"},
    {name: "CVS", lat: 34.824319340578526, lng: -82.3940478197198, address: "2100 Augusta St, Greenville, SC 29605", phone: "(864) 255-3878"},
    
    {name: "Walgreens", lat: 34.89758379288567, lng: -82.33893648108698, address: "2700 Wade Hampton Blvd, Greenville, SC 29615", phone: "(864) 268-7123"},
    {name: "Walgreens", lat: 34.86912415051832, lng: -82.35866010622615, address: "2323 E North St, Greenville, SC 29607", phone: "(864) 233-9401"},
    {name: "Walgreens", lat: 34.851497238012925, lng: -82.4517113019731, address: "6057 White Horse Rd, Greenville, SC 29611", phone: "(864) 295-0243"},
    {name: "Walgreens", lat: 34.85477357220053, lng: -82.32014825835267, address: "902 Pelham Rd, Greenville, SC 29615", phone: "(864) 234-6462"},
    {name: "Walgreens", lat: 34.78837370768248, lng: -82.4832648099224, address: "3501 SC-153, Greenville, SC 29611", phone: "(864) 295-2029"}
];

// Custom colored marker icons for highlighting top results
const greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const orangeIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// 3rd-best marker (violet)
const violetIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

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

// Extract ZIP code from pharmacy address
function extractZipCode(address) {
    const zipMatch = address.match(/\b\d{5}\b/);
    return zipMatch ? zipMatch[0] : null;
}

// Check if pharmacy is in Greenville based on ZIP code
function isGreenvillePharmacy(zipCode) {
    return greenvilleZips.includes(zipCode);
}

function clearMarkers() {
    currentMarkers.forEach(marker => map.removeLayer(marker));
    currentMarkers = [];
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
    
    // Normalize the drug name for comparison (case-insensitive)
    const normalizedDrug = drugName.trim().toLowerCase();
    
    // Find matching entries in the CSV data
    const matches = dataSource.filter(row => {
        const csvDrug = (row.Name || '').trim().toLowerCase();
        const csvPharmacy = (row.Pharmacy || '').trim().toLowerCase();
        const targetPharmacy = pharmacyName.trim().toLowerCase();
        
        // Match drug name and pharmacy name (check if pharmacy name contains the target)
        return csvDrug === normalizedDrug && csvPharmacy.includes(targetPharmacy.split(' ')[0].toLowerCase());
    });
    
    if (matches.length > 0) {
        // Return the first match's price (remove $ sign and convert to number)
        const priceStr = matches[0].Price || '$0';
        return parseFloat(priceStr.replace('$', '').replace(',', ''));
    }
    
    return null;
}

// Calculate price based on base price, dosage, quantity, and ZIP code
function calculatePrice(basePrice, dosage, quantity, zipCode, medicationName) {
    if (basePrice === null) {
        return null;
    }
    
    // Get the ZIP Code multiplier
    const zipMultiplier = getZipMultiplier(zipCode);

    // Dosage multiplier (assuming base price is for a standard dosage like 10mg or 50mg)
    const dosageValue = parseInt(dosage) || 0;
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
    
    // Get medication info to determine quantity type
    const medInfo = getDosageInfo(medicationName);
    const quantityType = medInfo?.quantityType || 'tablets';
    
    // Quantity multiplier based on product form type
    let quantityMultiplier = 1.0;
    const qtyVal = parseFloat(quantity) || 1;
    
    switch (quantityType) {
        case 'tablets':
        case 'capsules':
            // Tablet/capsule bulk pricing (base = 30 count)
            if (qtyVal <= 30) {
                quantityMultiplier = 1.0;
            } else if (qtyVal <= 60) {
                quantityMultiplier = 1.85;
            } else if (qtyVal <= 90) {
                quantityMultiplier = 2.6;
            } else {
                quantityMultiplier = 4.8;
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
            // Fallback to tablet-style pricing
            if (qtyVal <= 30) {
                quantityMultiplier = 1.0;
            } else if (qtyVal <= 60) {
                quantityMultiplier = 1.85;
            } else if (qtyVal <= 90) {
                quantityMultiplier = 2.6;
            } else {
                quantityMultiplier = 4.8;
            }
    }
    
    // Calculate final price with ZIP code multiplier
    const finalPrice = basePrice * dosageMultiplier * quantityMultiplier * zipMultiplier;
    return finalPrice;
}

function calculateSavings(prices) {
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    return Math.round(((maxPrice - minPrice) / maxPrice) * 100);
}

function displayResults(medication, dosage, quantity) {
    const resultsDiv = document.getElementById('results');
    
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
        // Check if the medication exists in either dataset
        const normalizedMedication = medication.trim().toLowerCase();
        const existsInMain = medicationData.some(row => ((row.Name || '').trim().toLowerCase()).includes(normalizedMedication));
        const existsInGreenville = greenvilleMedicationData.some(row => ((row.Name || '').trim().toLowerCase()).includes(normalizedMedication));
        
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

        // Get prices for each pharmacy
        const results = [];
        
        pharmacies.forEach(pharmacy => {
            // Extract ZIP code from pharmacy address
            const pharmacyZip = extractZipCode(pharmacy.address);
            
            // Get base price using the appropriate dataset
            const basePrice = getBasePriceFromData(medication, pharmacy.name, pharmacyZip);

            if (basePrice !== null) {
                // Calculate price with ZIP code multiplier
                const calculatedPrice = calculatePrice(basePrice, dosage, quantity, pharmacyZip, medication);
                
                results.push({
                    ...pharmacy,
                    price: calculatedPrice.toFixed(2),
                    zipCode: pharmacyZip,
                    zipMultiplier: getZipMultiplier(pharmacyZip)
                });
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
        
        const prices = results.map(r => parseFloat(r.price));
        const savings = calculateSavings(prices);

        clearMarkers();

        let resultsHTML = `<div class="results-banner">
            <strong class="banner-title">Searching for:</strong> ${escapeHtml(medication)} ${escapeHtml(dosage)} (${escapeHtml(quantity)} tablets)<br>
            <strong class="banner-best">Best Price:</strong> $${escapeHtml(results[0].price)} at ${escapeHtml(results[0].name)}<br>
            <strong class="banner-savings">You could save up to ${escapeHtml(savings)}%</strong> by choosing the best price!
        </div>`;

        results.forEach((pharmacy, index) => {
            const savingsAmount = index === 0 ? 0 : ((parseFloat(pharmacy.price) - parseFloat(results[0].price)) / parseFloat(results[0].price) * 100).toFixed(0);
            
            resultsHTML += `
                <div class="pharmacy-card" data-lat="${pharmacy.lat}" data-lng="${pharmacy.lng}">
                    <div class="pharmacy-name">${escapeHtml(pharmacy.name)}</div>
                    <div class="pharmacy-address">${escapeHtml(pharmacy.address)}</div>
                    <div class="price-info">
                        <div class="price">$${escapeHtml(pharmacy.price)}</div>
                        ${index === 0 ? '<div class="savings">BEST PRICE</div>' : savingsAmount > 0 ? `<div class="price-more">+$${escapeHtml((parseFloat(pharmacy.price) - parseFloat(results[0].price)).toFixed(2))} more</div>` : ''}
                    </div>
                </div>
            `;

            // Add marker to map and visually highlight the cheapest results
            let marker;
            const zipInfo = pharmacy.zipMultiplier !== 1.0 ? `<div class="zip-info">ZIP ${pharmacy.zipCode} multiplier: ${pharmacy.zipMultiplier}x</div>` : '';
            const popupHtml = `
                <div class="popup-content">
                    <div class="popup-pharmacy">${escapeHtml(pharmacy.name)}</div>
                    <div>${escapeHtml(pharmacy.address)}</div>
                    <div class="popup-price">$${escapeHtml(pharmacy.price)}</div>
                    ${index === 0 ? '<div class="popup-best">BEST PRICE</div>' : ''}
                    ${zipInfo}
                </div>
            `;

            if (index === 0) {
                // Best price: green marker icon
                marker = L.marker([pharmacy.lat, pharmacy.lng], { icon: greenIcon }).bindPopup(popupHtml).addTo(map);
            } else if (index === 1) {
                // 2nd best: orange marker icon
                marker = L.marker([pharmacy.lat, pharmacy.lng], { icon: orangeIcon }).bindPopup(popupHtml).addTo(map);
            } else if (index === 2) {
                // 3rd best: violet marker icon
                marker = L.marker([pharmacy.lat, pharmacy.lng], { icon: violetIcon }).bindPopup(popupHtml).addTo(map);
            } else {
                // Default marker for others
                marker = L.marker([pharmacy.lat, pharmacy.lng]).bindPopup(popupHtml).addTo(map);
            }

            currentMarkers.push(marker);
        });

        resultsDiv.innerHTML = resultsHTML;

        // Attach click handlers to pharmacy cards (avoid inline event handlers which CSP blocks)
        const cards = resultsDiv.querySelectorAll('.pharmacy-card');
        cards.forEach(card => {
            const lat = parseFloat(card.getAttribute('data-lat'));
            const lng = parseFloat(card.getAttribute('data-lng'));
            if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                card.addEventListener('click', () => focusPharmacy(lat, lng));
            }
        });

        // Fit map to show all markers
        if (currentMarkers.length > 0) {
            const group = new L.featureGroup(currentMarkers);
            map.fitBounds(group.getBounds().pad(0.1));
        }
        
        // Update stats with animation
        setTimeout(() => {
            document.getElementById('avgSavings').textContent = savings + '%';
        }, 500);
    }, 1000);
}

function focusPharmacy(lat, lng) {
    map.setView([lat, lng], 15);
}

// Handle form submission
function setupFormHandler() {
    document.getElementById('searchForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const medication = document.getElementById('medication').value.trim();
        const dosage = document.getElementById('dosage').value;
        const quantity = document.getElementById('quantity').value;
        
        if (medication && dosage && quantity) {
            displayResults(medication, dosage, quantity);
        } else {
            alert('Please fill in all fields');
        }
    });
}

// Add some initial sample markers
function addInitialMarkers() {
     pharmacies.slice(0, 4).forEach(pharmacy => {
         const marker = L.marker([pharmacy.lat, pharmacy.lng])
            .bindPopup(`
               <div class="popup-content">
                   <div class="popup-pharmacy">${escapeHtml(pharmacy.name)}</div>
                   <div>${escapeHtml(pharmacy.address)}</div>
                    <div class="popup-note">Search for a medication to see prices</div>
               </div>
           `)
            .addTo(map);
    });
}