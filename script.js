/**
 * Author: Kyler Bailey
 * Date: 2024-06-15
 * Description: JavaScript code for AffordRX web 
 * application to find affordable medication prices.
 */
        
// Wait for the page to fully load before initializing the map
document.addEventListener('DOMContentLoaded', function() {
    // Initialize map centered on Spartanburg, SC
    const map = L.map('map').setView([34.91365097168322, -82.05826163777928], 13);
    
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
});
        
// Addition of Map 
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors © CARTO',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

        // Locations of Pharmacies in Spartanburg, SC area
        const pharmacies = [
            { name: "Walgreens", lat: 34.0007, lng: -81.0348, address: "456 Main St, Columbia, SC", phone: "(803) 555-0124" },
            { name: "Rite Aid", lat: 34.8526, lng: -82.3940, address: "789 Wade Hampton Blvd, Greenville, SC", phone: "(864) 555-0125" },
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

        let currentMarkers = [];

        function clearMarkers() {
            currentMarkers.forEach(marker => map.removeLayer(marker));
            currentMarkers = [];
        }

        // Pull price and drug name from all_data.csv instead of generating random prices
        function getPriceFromData(drugName) {
            // This function would read from all_data.csv and return the price for the given drugName
            // For now, we will return a placeholder value
            return (50 + Math.random() * 100).toFixed(2);
        }



        // Generate random price for demonstration purposes *ONLY*
        function generateRandomPrice(basePrice = 50) {
            return (basePrice + Math.random() * 100).toFixed(2);
        }

        function calculateSavings(prices) {
            const maxPrice = Math.max(...prices);
            const minPrice = Math.min(...prices);
            return Math.round(((maxPrice - minPrice) / maxPrice) * 100);
        }

        function displayResults(medication, dosage, quantity) {
            const resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML = '<div class="loading">Searching pharmacies...</div>';
            
            setTimeout(() => {
                const results = pharmacies.map(pharmacy => ({
                    ...pharmacy,
                    price: generateRandomPrice()
                })).sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

                const prices = results.map(r => parseFloat(r.price));
                const savings = calculateSavings(prices);

                clearMarkers();

                let resultsHTML = `<div style="margin-bottom: 20px; padding: 20px; background: linear-gradient(135deg, #e8f4fd 0%, #d6eaf8 100%); border-radius: 12px; border-left: 5px solid #3498db; box-shadow: 0 4px 15px rgba(52, 152, 219, 0.1);">
                    <strong style="color: #1e3c72;">Searching for:</strong> ${medication} ${dosage} (${quantity} tablets)<br>
                    <strong style="color: #27ae60;">Best Price:</strong> ${results[0].price} | <strong style="color: #e74c3c;">You could save up to ${savings}%</strong>
                </div>`;

                results.forEach((pharmacy, index) => {
                    const savingsAmount = index === 0 ? 0 : ((parseFloat(pharmacy.price) - parseFloat(results[0].price)) / parseFloat(results[0].price) * 100).toFixed(0);
                    
                    resultsHTML += `
                        <div class="pharmacy-card" onclick="focusPharmacy(${pharmacy.lat}, ${pharmacy.lng})">
                            <div class="pharmacy-name">${pharmacy.name}</div>
                            <div class="pharmacy-address">${pharmacy.address}</div>
                            <div class="price-info">
                                <div class="price">$${pharmacy.price}</div>
                                ${index === 0 ? '<div class="savings">BEST PRICE</div>' : savingsAmount > 0 ? `<div style="color: #dc3545; font-weight: 600;">+$${(parseFloat(pharmacy.price) - parseFloat(results[0].price)).toFixed(2)}</div>` : ''}
                            </div>
                        </div>
                    `;

                    // Add marker to map
                    const marker = L.marker([pharmacy.lat, pharmacy.lng])
                        .bindPopup(`
                            <div class="popup-content">
                                <div class="popup-pharmacy">${pharmacy.name}</div>
                                <div>${pharmacy.address}</div>
                                <div class="popup-price">$${pharmacy.price}</div>
                                ${index === 0 ? '<div style="color: #28a745; font-weight: bold;">BEST PRICE</div>' : ''}
                            </div>
                        `)
                        .addTo(map);
                    
                    currentMarkers.push(marker);
                });

                resultsDiv.innerHTML = resultsHTML;

                // Fit map to show all markers
                if (currentMarkers.length > 0) {
                    const group = new L.featureGroup(currentMarkers);
                    map.fitBounds(group.getBounds().pad(0.1));
                }
            }, 1500);
        }

        function focusPharmacy(lat, lng) {
            map.setView([lat, lng], 15);
        }

        // Handle form submission
        document.getElementById('searchForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const medication = document.getElementById('medication').value;
            const dosage = document.getElementById('dosage').value;
            const quantity = document.getElementById('quantity').value;
            
            if (medication && dosage && quantity) {
                displayResults(medication, dosage, quantity);
                
                // Update stats with animation
                setTimeout(() => {
                    document.getElementById('pharmacyCount').textContent = Math.floor(Math.random() * 50 + 200) + '+';
                    document.getElementById('avgSavings').textContent = Math.floor(Math.random() * 20 + 25) + '%';
                    document.getElementById('searchesCount').textContent = (Math.floor(Math.random() * 10 + 15)) + 'K+';
                }, 2000);
            }
        });

        // Add some sample markers initially
        pharmacies.slice(0, 4).forEach(pharmacy => {
            const marker = L.marker([pharmacy.lat, pharmacy.lng])
                .bindPopup(`
                    <div class="popup-content">
                        <div class="popup-pharmacy">${pharmacy.name}</div>
                        <div>${pharmacy.address}</div>
                        <div style="margin-top: 8px; color: #666;">Search for a medication to see prices</div>
                    </div>
                `)
                .addTo(map);
        });
