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

// Wait for the page to fully load before initializing
document.addEventListener('DOMContentLoaded', function() {
    // Initialize map centered on Spartanburg, SC
    map = L.map('map').setView([34.91365097168322, -82.05826163777928], 13);
    
    // Add CartoDB Voyager tiles for a colorful map
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);
    
    // Force the map to refresh its size after a brief delay
    setTimeout(function() {
        map.invalidateSize();
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
    { name: "Walgreens", lat: 34.966263, lng: -81.895416, address: "1790 E Main St, Spartanburg, SC", phone: "(864) 555-0131" },
    { name: "Publix Pharmacy", lat: 34.967105, lng: -81.890509, address: "1701 E Main St, Spartanburg, SC", phone: "(864) 555-0132" },
    { name: "Publix Pharmacy at the Market at Boiling Springs", lat: 35.06583095100721, lng: -81.99863749814074, address: "4400 SC-9, Boiling Springs, SC 29316", phone: "(864) 274-6225" },
    { name: "Walgreens", lat: 35.05121984047732, lng: -81.98158116799644, address: "3681 Boiling Springs Rd, Boiling Springs, SC 29316", phone: "(864) 578-2414" },
    { name: "Boiling Springs Pharmacy", lat: 35.02134010093637, lng: -81.95976493176535, address: "2528 Boiling Springs Rd Suite D, Boiling Springs, SC 29316", phone: "(864) 515-2600" },
    { name: "CVS", lat: 35.020774675372714, lng: -81.9610189759189, address: "1888 Boiling Springs Rd, Boiling Springs, SC 29316", phone: "(864) 599-0920" },
    { name: "U Save It Pharmacy - Peach Valley", lat: 35.03235883684897, lng: -81.89635042885386, address: "2310 Chesnee Hwy, Spartanburg, SC 29303", phone: "(864) 577-0087" },
    { name: "Spartanburg Regional Pharmacy - Physician Center - Spartanburg", lat: 34.971346250376314, lng: -81.93936656157912, address: "100 E Wood St #101, Spartanburg, SC 29303", phone: "(864) 560-9200" },
    { name: "Walgreens", lat: 34.9741850537861, lng: -81.93388128330479, address: "1000 N Pine St, Spartanburg, SC 29303", phone: "(864) 585-9136" },
    { name: "Smith Drug Store", lat: 34.95454798385966, lng: -81.92983949931316, address: "142 E Main St, Spartanburg, SC 29306", phone: "(864) 583-4521" },
    { name: "Pharmacy At Main", lat: 34.95596768888898, lng: -81.92088983476026, address: "435 E Main St # 7, Spartanburg, SC 29302", phone: "(864) 515-2100" },
    { name: "Publix Pharmacy at Hillcrest Shopping Center", lat: 34.97039996027779, lng: -81.88913295765462, address: "1905 E Main St, Spartanburg, SC 29307", phone: "(864) 253-1833" },
    { name: "Walgreens", lat: 34.926385420512275, lng: -81.8871120656588, address: "2198 Southport Rd, Spartanburg, SC 29306", phone: "(864) 582-5822" },
    { name: "Hub City Pharmacy", lat: 34.92591201708974, lng: -81.98498098351865, address: "1735 John B White Sr Blvd # 8, Spartanburg, SC 29301", phone: "(864) 586-3886" },
    { name: "CVS", lat: 34.92010471452222, lng: -81.99260180058504, address: "2397 Reidville Rd, Spartanburg, SC 29301", phone: "(864) 576-9268" },
    { name: "Walgreens", lat: 34.9225310478231, lng: -81.99433399372431, address: "2410 Reidville Rd, Spartanburg, SC 29301", phone: "(864) 587-9486" },
    { name: "Reidville Road Pharmacy", lat: 34.92075568909083, lng: -82.00061319449726, address: "2660 Reidville Rd #8, Spartanburg, SC 29301", phone: "(864) 435-9400" },
    { name: "CVS", lat: 34.934579497121796, lng: -82.00891013499744, address: "8199 Warren H Abernathy Hwy, Spartanburg, SC 29301", phone: "(864) 576-7591" },
    { name: "Buy Low Pharmacy", lat: 34.93633859193823, lng: -82.00418944666549, address: "8007 Warren H Abernathy Hwy, Spartanburg, SC 29301", phone: "(864) 572-5727" }
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

const blueIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

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

// Calculate price based on base price, dosage, and quantity
function calculatePrice(basePrice, dosage, quantity) {
    if (basePrice === null) {
        return null;
    }
    
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
    
    // Calculate final price
    const finalPrice = basePrice * dosageMultiplier * quantityMultiplier;
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
        resultsDiv.innerHTML = '<div class="loading">Loading medication data...</div>';
        return;
    }
    
    resultsDiv.innerHTML = '<div class="loading">Searching pharmacies...</div>';
    
    setTimeout(() => {
        // If the medication doesn't exist anywhere in the CSV, show a clear "not found" message
        const normalizedMedication = medication.trim().toLowerCase();
        const medicationExists = medicationData.some(row => ((row.Name || '').trim().toLowerCase()).includes(normalizedMedication));
        if (!medicationExists) {
            resultsDiv.innerHTML = `
                <div class="no-results">
                    <strong>Drug not found:</strong> "${medication}" was not found in our database.<br>
                    Please check the spelling or try another medication.
                </div>
            `;
            console.warn(`Medication "${medication}" not found in CSV.`);
            return;
        }

        // Get prices for each pharmacy
        const results = [];
        
        pharmacies.forEach(pharmacy => {
            const basePrice = getBasePriceFromData(medication, pharmacy.name);
            
            if (basePrice !== null) {
                const calculatedPrice = calculatePrice(basePrice, dosage, quantity);
                results.push({
                    ...pharmacy,
                    price: calculatedPrice.toFixed(2)
                });
            }
        });
        
        // Check if we found any results
        if (results.length === 0) {
            resultsDiv.innerHTML = `
                <div class="no-results">
                    <strong>No results found for "${medication}"</strong><br>
                    Please check the spelling or try another medication.<br><br>
                    <em>Available medications include: Ibuprofen, Acetaminophen, Amlodipine, Atorvastatin, Metformin, and more.</em>
                </div>
            `;
            return;
        }
        
        // Sort by price (lowest first)
        results.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        
        const prices = results.map(r => parseFloat(r.price));
        const savings = calculateSavings(prices);

        clearMarkers();

        let resultsHTML = `<div style="margin-bottom: 20px; padding: 20px; background: linear-gradient(135deg, #e8f4fd 0%, #d6eaf8 100%); border-radius: 12px; border-left: 5px solid #3498db; box-shadow: 0 4px 15px rgba(52, 152, 219, 0.1);">
            <strong style="color: #1e3c72;">Searching for:</strong> ${medication} ${dosage} (${quantity} tablets)<br>
            <strong style="color: #27ae60;">Best Price:</strong> $${results[0].price} at ${results[0].name}<br>
            <strong style="color: #e74c3c;">You could save up to ${savings}%</strong> by choosing the best price!
        </div>`;

        results.forEach((pharmacy, index) => {
            const savingsAmount = index === 0 ? 0 : ((parseFloat(pharmacy.price) - parseFloat(results[0].price)) / parseFloat(results[0].price) * 100).toFixed(0);
            
            resultsHTML += `
                <div class="pharmacy-card" onclick="focusPharmacy(${pharmacy.lat}, ${pharmacy.lng})">
                    <div class="pharmacy-name">${pharmacy.name}</div>
                    <div class="pharmacy-address">${pharmacy.address}</div>
                    <div class="price-info">
                        <div class="price">$${pharmacy.price}</div>
                        ${index === 0 ? '<div class="savings">BEST PRICE</div>' : savingsAmount > 0 ? `<div style="color: #dc3545; font-weight: 600;">+$${(parseFloat(pharmacy.price) - parseFloat(results[0].price)).toFixed(2)} more</div>` : ''}
                    </div>
                </div>
            `;

            // Add marker to map and visually highlight the cheapest results
            let marker;
            const popupHtml = `
                <div class="popup-content">
                    <div class="popup-pharmacy">${pharmacy.name}</div>
                    <div>${pharmacy.address}</div>
                    <div class="popup-price">$${pharmacy.price}</div>
                    ${index === 0 ? '<div style="color: #28a745; font-weight: bold;">BEST PRICE</div>' : ''}
                </div>
            `;

            if (index === 0) {
                // Best price: green marker icon
                marker = L.marker([pharmacy.lat, pharmacy.lng], { icon: greenIcon }).bindPopup(popupHtml).addTo(map);
            } else if (index === 1) {
                // 2nd best: orange marker icon
                marker = L.marker([pharmacy.lat, pharmacy.lng], { icon: orangeIcon }).bindPopup(popupHtml).addTo(map);
            } else if (index === 2) {
                // 3rd best: blue marker icon
                marker = L.marker([pharmacy.lat, pharmacy.lng], { icon: blueIcon }).bindPopup(popupHtml).addTo(map);
            } else {
                // Default marker for others
                marker = L.marker([pharmacy.lat, pharmacy.lng]).bindPopup(popupHtml).addTo(map);
            }

            currentMarkers.push(marker);
        });

        resultsDiv.innerHTML = resultsHTML;

        // Fit map to show all markers
        if (currentMarkers.length > 0) {
            const group = new L.featureGroup(currentMarkers);
            map.fitBounds(group.getBounds().pad(0.1));
        }
        
        // Update stats with animation
        setTimeout(() => {
            document.getElementById('pharmacyCount').textContent = results.length + '+';
            document.getElementById('avgSavings').textContent = savings + '%';
            document.getElementById('searchesCount').textContent = (Math.floor(Math.random() * 10 + 15)) + 'K+';
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

// function addInitialMarkers() {
//     pharmacies.slice(0, 4).forEach(pharmacy => {
//         const marker = L.marker([pharmacy.lat, pharmacy.lng])
//             .bindPopup(`
//                 <div class="popup-content">
//                     <div class="popup-pharmacy">${pharmacy.name}</div>
//                     <div>${pharmacy.address}</div>
//                     <div style="margin-top: 8px; color: #666;">Search for a medication to see prices</div>
//                 </div>
//             `)
//             .addTo(map);
//     });
// }