
        // Initialize map centered on Spartanburg, SC
        const map = L.map('map').setView([34.91365097168322, -82.05826163777928], 7);
        
        // Add CartoDB Positron tiles for a cleaner, minimal look
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors © CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        // Sample pharmacy data for South Carolina
        //Things to change: add more pharmacies, real data, real prices********

        const pharmacies = [
            { name: "CVS Pharmacy", lat: 32.7767, lng: -80.1918, address: "123 King St, Charleston, SC", phone: "(843) 555-0123" },
            { name: "Walgreens", lat: 34.0007, lng: -81.0348, address: "456 Main St, Columbia, SC", phone: "(803) 555-0124" },
            { name: "Rite Aid", lat: 34.8526, lng: -82.3940, address: "789 Wade Hampton Blvd, Greenville, SC", phone: "(864) 555-0125" },
            { name: "Publix Pharmacy", lat: 32.0835, lng: -81.0998, address: "321 Abercorn St, Savannah, GA", phone: "(912) 555-0126" },
            { name: "Harris Teeter Pharmacy", lat: 35.2271, lng: -80.8431, address: "654 South Blvd, Charlotte, NC", phone: "(704) 555-0127" },
            { name: "Food Lion Pharmacy", lat: 33.6891, lng: -78.8867, address: "987 Ocean Blvd, Myrtle Beach, SC", phone: "(843) 555-0128" },
            { name: "Bi-Lo Pharmacy", lat: 34.5043, lng: -82.6501, address: "147 Pelham Rd, Spartanburg, SC", phone: "(864) 555-0129" },
            { name: "Ingles Pharmacy", lat: 35.1983, lng: -82.2948, address: "258 Hendersonville Rd, Asheville, NC", phone: "(828) 555-0130" },
            { name: "Walgreens Pharmacy 7822", lat: 34.966263, lng: -81.895416, address: "1790 E Main St, Spartanburg, SC", phone: "(864) 555-0131" },
            { name: "Publix Pharmacy", lat: 34.967105, lng: -81.890509, address: "1701 E Main St, Spartanburg, SC", phone: "(864) 555-0132" },
            { name: "Publix Pharmacy at the Market at Boiling Springs", lat: 35.06583095100721, lng: -81.99863749814074, address: "4400 SC-9, Boiling Springs, SC 29316", phone: "(864) 274-6225" },
            { name: "Walgreens Pharmacy", lat: 35.05121984047732, lng: -81.98158116799644, address: "3681 Boiling Springs Rd, Boiling Springs, SC 29316", phone: "(864) 578-2414" },
            { name: "Boiling Springs Pharmacy", lat: 35.02134010093637, lng: -81.95976493176535, address: "2528 Boiling Springs Rd Suite D, Boiling Springs, SC 29316", phone: "(864) 515-2600" },
            { name: "CVS", lat: 35.020774675372714, lng: -81.9610189759189, address: "1888 Boiling Springs Rd, Boiling Springs, SC 29316", phone: "(864) 599-0920" },
            { name: "U Save It Pharmacy - Peach Valley", lat: 35.03235883684897, lng: -81.89635042885386, address: "2310 Chesnee Hwy, Spartanburg, SC 29303", phone: "(864) 577-0087" },
            { name: "Spartanburg Regional Pharmacy - Physician Center - Spartanburg", lat: 34.971346250376314, lng: -81.93936656157912, address: "100 E Wood St #101, Spartanburg, SC 29303", phone: "(864) 560-9200" },
            { name: "Walgreens", lat: 34.9741850537861, lng: -81.93388128330479, address: "1000 N Pine St, Spartanburg, SC 29303", phone: "(864) 585-9136" },
            { name: "Smith Drug Store", lat: 34.95454798385966, lng: -81.92983949931316, address: "142 E Main St, Spartanburg, SC 29306", phone: "(864) 583-4521" },
            { name: "Pharmacy At Main", lat: 34.95596768888898, lng: -81.92088983476026, address: "435 E Main St # 7, Spartanburg, SC 29302", phone: "(864) 515-2100" }
    ];

        let currentMarkers = [];

        function clearMarkers() {
            currentMarkers.forEach(marker => map.removeLayer(marker));
            currentMarkers = [];
        }

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
