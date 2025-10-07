
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup

def get_html(drug): 

    # Define the URL of the page you want to access
    url = 'https://www.goodrx.com/'+drug

    try:
        # Navigate to the URL
        print(f"Opening page: {url}")
        driver.get(url)

        # Get the page's HTML source
        # The .page_source attribute contains the full HTML of the rendered page
        html_content = driver.page_source

        # Print the HTML
        # print("\n--- Page HTML Source ---")
        # print(html_content)
        # print("------------------------")

    finally:
        # Close the browser window
        # This is important to free up system resources
        print("\nClosing browser...")
        driver.quit()

    return html_content

def get_name_price(html):
    data = []

    # Parse the HTML content using BeautifulSoup
    soup = BeautifulSoup(html_content, 'html.parser')

    tables = soup.find_all('div', class_='pt-2')

    relevant = tables[0]

    listitems = relevant.find_all('li')

    for li in listitems:

        seller_names = li.find_all('span', attrs={'data-qa': 'seller-name'})
        seller_price = li.find_all('span', attrs={'data-qa': 'seller-price'})

        if seller_names and seller_price:
            data.append(seller_names[0].text, seller_price[0].text)

    return data


# Set up the Chrome driver using webdriver-manager
# This automatically downloads and manages the correct driver for your browser
service = ChromeService(ChromeDriverManager().install())

# Initialize the Chrome browser
driver = webdriver.Chrome(service=service)

drugs = ['ibuprofen', 'acetaminophen', 'aspirin', 'amoxicillin', 'lisinopril', 'atorvastatin', 'metformin', 'omeprazole', 'simvastatin', 'hydrochlorothiazide', \
            'albuterol', 'gabapentin', 'sertraline', 'furosemide', 'tramadol', 'prednisone', 'fluoxetine', 'citalopram', 'bupropion', 'meloxicam', \
            'montelukast', 'clonazepam', 'rosuvastatin', 'duloxetine', 'venlafaxine', 'warfarin', 'cyclobenzaprine', 'tamsulosin', 'carvedilol', 'pravastatin']

all_data = []
for drug in drugs: 
    
    html_content = get_html(drug)
    name_price = get_name_price(html_content)
    all_data = all_data + name_price
    
print(all_data)