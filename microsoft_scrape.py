from selenium import webdriver
from selenium.webdriver.edge.service import Service as EdgeService
from webdriver_manager.microsoft import EdgeChromiumDriverManager
from bs4 import BeautifulSoup
import time

def get_html(drug, driver): 
    # Define the URL of the page you want to access
    url = 'https://www.goodrx.com/'+drug

    # Navigate to the URL
    print(f"Opening page: {url}")
    driver.get(url)
    
    # Wait for page to load
    time.sleep(10)  # Give the page time to fully load

    # Get the page's HTML source
    html_content = driver.page_source

    return html_content

def get_name_price(html, drug_name):
    data = []

    # Parse the HTML content using BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')

    tables = soup.find_all('div', class_='pt-2')
    
    # Debug: Check if tables were found
    print(f"\nFound {len(tables)} div elements with class 'pt-2'")
    
    if len(tables) == 0:
        print(f"Warning: No tables found for {drug_name}")
        # Save HTML to file for inspection
        with open(f'{drug_name}_debug.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"HTML saved to {drug_name}_debug.html for inspection")
        return data
    
    relevant = tables[0]
    listitems = relevant.find_all('li')
    
    print(f"Found {len(listitems)} list items")

    for li in listitems:
        seller_names = li.find_all('span', attrs={'data-qa': 'seller-name'})
        seller_price = li.find_all('span', attrs={'data-qa': 'seller-price'})

        if seller_names and seller_price:
            data.append({'name': seller_names[0].text, 'price': seller_price[0].text})
            print(f"  Found: {seller_names[0].text} - {seller_price[0].text}")

    return data


# Set up the Edge driver using webdriver-manager
service = EdgeService(EdgeChromiumDriverManager().install())

# Initialize the Edge browser
driver = webdriver.Edge(service=service)

try:
    drugs = ['aspirin', 'ibuprofen'] #, 'acetaminophen', 'aspirin', 'amoxicillin', 'lisinopril', 'atorvastatin', 'metformin', 'omeprazole', 'simvastatin', 'hydrochlorothiazide', \
                #'albuterol', 'gabapentin', 'sertraline', 'furosemide', 'tramadol', 'prednisone', 'fluoxetine', 'citalopram', 'bupropion', 'meloxicam', \
                #'montelukast', 'clonazepam', 'rosuvastatin', 'duloxetine', 'venlafaxine', 'warfarin', 'cyclobenzaprine', 'tamsulosin', 'carvedilol', 'pravastatin']

    all_data = []
    for drug in drugs: 
        print(f"\n{'='*50}")
        print(f"Processing: {drug}")
        print('='*50)
        
        html_content = get_html(drug, driver)
        name_price = get_name_price(html_content, drug)
        all_data = all_data + name_price
        
        # Small delay between requests
        time.sleep(7)

    print(f"\n{'='*50}")
    print("FINAL RESULTS:")
    print('='*50)
    print(all_data)
    
finally:
    # Close the browser window
    print("\nClosing browser...")
    driver.quit()