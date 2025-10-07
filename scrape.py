
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import time
import logging
import argparse
import traceback

def get_html(driver, drug, timeout=10):
    """Navigate to the GoodRx page for `drug`, wait for results, and return HTML.

    Args:
        driver: an open Selenium WebDriver instance.
        drug: the drug name (string) to append to GoodRx URL.
        timeout: seconds to wait for page elements.

    Returns:
        The page HTML as a string, or an empty string on failure.
    """

    url = 'https://www.goodrx.com/' + drug
    logging.info(f"Opening page: {url}")

    try:
        driver.get(url)

        # Wait for the container that usually holds prices to appear.
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, 'div.pt-2'))
        )

        # Small pause to let dynamic content settle
        time.sleep(0.5)

        return driver.page_source
    except Exception as e:
        logging.warning(f"Failed to load {url}: {e}")
        return ""

def get_name_price(html):
    data = []

    # Parse the HTML content using the passed-in argument
    soup = BeautifulSoup(html, 'html.parser')

    # Find container divs. If none are found, return empty list to avoid IndexError
    tables = soup.find_all('div', class_='pt-2')
    if not tables:
        return data

    relevant = tables[0]
    listitems = relevant.find_all('li')

    for li in listitems:
        seller_names = li.find_all('span', attrs={'data-qa': 'seller-name'})
        seller_prices = li.find_all('span', attrs={'data-qa': 'seller-price'})

        # Only access [0] if lists are non-empty
        if seller_names and seller_prices:
            name = seller_names[0].get_text(strip=True)
            price = seller_prices[0].get_text(strip=True)
            # append a tuple (name, price)
            data.append((name, price))

    return data


# Note: driver is created below inside __main__ with retries/fallbacks.

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    def create_driver(headless=True, max_attempts=3):
        """Create a Chrome WebDriver with retries. Try headless first, then fallback to non-headless."""
        attempts = 0
        last_exc = None
        while attempts < max_attempts:
            try:
                chrome_options = Options()
                if headless:
                    chrome_options.add_argument('--headless=new')
                chrome_options.add_argument('--no-sandbox')
                chrome_options.add_argument('--disable-dev-shm-usage')

                service = ChromeService(ChromeDriverManager().install())
                driver = webdriver.Chrome(service=service, options=chrome_options)
                return driver
            except Exception as e:
                logging.warning(f"Driver creation attempt {attempts+1} failed: {e}")
                last_exc = e
                attempts += 1
                time.sleep(1)

        # Fallback: try once without headless
        if headless:
            logging.info('Falling back to non-headless Chrome')
            try:
                return create_driver(headless=False, max_attempts=1)
            except Exception as e:
                logging.error(f"Fallback driver creation failed: {e}")
                raise last_exc
        else:
            raise last_exc

    # Parse CLI args
    parser = argparse.ArgumentParser(description='GoodRx scraper')
    parser.add_argument('--no-headless', action='store_true', help='Run Chrome with a visible window')
    args = parser.parse_args()

    # Create the driver (headless preferred unless overridden)
    driver = create_driver(headless=not args.no_headless)

    # Small list for quick test runs. Expand as needed.
    # Will probably have to do two drugs at a time to avoid timeouts. GoddRx seems to limit requests.
    
    # Also, something to keep in mind is that these prices are the discounted prices, not the actual prices.
    #Will need to change the html look for actual prices. And make sure the location is based on Spartanburg, SC..
    drugs = ['ibuprofen', 'acetaminophen', 'aspirin']

    all_data = []
    try:
        for drug in drugs:
            html_content = get_html(driver, drug, timeout=15)
            if not html_content:
                logging.info(f"No HTML returned for {drug}; skipping")
                continue
            name_price = get_name_price(html_content)
            all_data.extend(name_price)

        print(all_data)
    except Exception as e:
        logging.error(f"Unhandled exception: {e}")
        traceback.print_exc()
    finally:
        logging.info('Closing browser...')
        try:
            driver.quit()
        except Exception:
            logging.warning('driver.quit() failed')