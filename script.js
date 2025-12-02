/**
 * Author: Kyler Bailey
 * Date: 2024-06-15
 * Description: JavaScript code for AffordRX web 
 * application to find affordable medication prices.
 */

// Global variables
let medicationData = [];
let csvLoaded = false;
let map;
let currentMarkers = [];

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
});

// Function to load and parse CSV data
function loadCSVData() {
    Papa.parse('all_data.csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            medicationData = results.data;
            csvLoaded = true;
            console.log('CSV data loaded successfully:', medicationData.length, 'records');
        },
        error: function(error) {
            console.error('Error loading CSV:', error);
            alert('Error loading medication data. Please ensure all_data.csv is in the same directory.');
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

function clearMarkers() {
    currentMarkers.forEach(marker => map.removeLayer(marker));
    currentMarkers = [];
}

// Function to get base price from CSV data
function getBasePriceFromData(drugName, pharmacyName) {
    if (!csvLoaded || medicationData.length === 0) {
        return null;
    }
    
    // Normalize the drug name for comparison (case-insensitive)
    const normalizedDrug = drugName.trim().toLowerCase();
    
    // Find matching entries in the CSV data
    const matches = medicationData.filter(row => {
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
function calculatePrice(basePrice, dosage, quantity, zipCode) {
    if (basePrice === null) {
        return null;
    }
    
    // Get the ZIP Code multiplier
    const zipMultiplier = getZipMultiplier(zipCode);

    // Dosage multiplier (assuming base price is for a standard dosage like 10mg or 50mg)
    const dosageValue = parseInt(dosage);
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
    
    // Quantity multiplier (bulk discount)
    const quantityValue = parseInt(quantity);
    let quantityMultiplier = 1.0;
    
    if (quantityValue === 30) {
        quantityMultiplier = 1.0;
    } else if (quantityValue === 60) {
        quantityMultiplier = 1.85; // slight discount for bulk
    } else if (quantityValue === 90) {
        quantityMultiplier = 2.6; // better discount
    } else if (quantityValue === 180) {
        quantityMultiplier = 4.8; // best discount
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
    
    if (!csvLoaded) {
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
        // If the medication doesn't exist anywhere in the CSV, show a clear "not found" message
        const normalizedMedication = medication.trim().toLowerCase();
        const medicationExists = medicationData.some(row => ((row.Name || '').trim().toLowerCase()).includes(normalizedMedication));
        if (!medicationExists) {
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
            const basePrice = getBasePriceFromData(medication, pharmacy.name);

            if (basePrice !== null) {
                // Extract ZIP code from pharmacy address
                const pharmacyZip = extractZipCode(pharmacy.address);
                
                // Calculate price with ZIP code multiplier
                const calculatedPrice = calculatePrice(basePrice, dosage, quantity, pharmacyZip);
                
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