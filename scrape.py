
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
import random
import os
from datetime import datetime

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

        # Small randomized pause to mimic human reading/scrolling and let dynamic assets load
        human_pause(1.0, 3.0)

        # small scroll to trigger lazy-loaded content if present
        try:
            driver.execute_script('window.scrollBy(0, 200)')
            time.sleep(0.2)
        except Exception:
            # scrolling can fail in some contexts; ignore
            pass

        return driver.page_source
    except Exception as e:
        logging.warning(f"Failed to load {url}: {e}")
        # Save a small HTML snapshot for debugging
        save_html_on_failure(driver, drug)
        return ""

def human_pause(min_s=1.0, max_s=3.0):
    """Pause for a random duration between min_s and max_s to mimic human behavior."""
    time.sleep(random.uniform(min_s, max_s))

def save_html_on_failure(driver, drug):
    """Save the current page HTML to tmp/ for offline inspection when page load fails."""
    try:
        os.makedirs('tmp', exist_ok=True)
        filename = os.path.join('tmp', f"failed_{drug}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html")
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(driver.page_source if driver else '')
        logging.info(f"Saved failure snapshot to {filename}")
    except Exception as e:
        logging.warning(f"Could not save failure snapshot: {e}")

def fetch_with_retries(driver, drug, max_attempts=3):
    """Fetch page HTML with exponential backoff retries on failure.

    Returns the HTML string or empty string if all attempts fail.
    """
    for attempt in range(1, max_attempts + 1):
        html = get_html(driver, drug, timeout=15)
        if html:
            return html
        # exponential backoff with jitter
        sleep_time = (2 ** (attempt - 1)) + random.uniform(0.5, 2.0)
        logging.info(f"Attempt {attempt} failed for {drug}. Backing off {sleep_time:.1f}s before retry.")
        time.sleep(sleep_time)
    logging.warning(f"All retries failed for {drug}")
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
    drugs = ['ibuprofen', 'acetaminophen']

    all_data = []
    try:
        for drug in drugs:
            # Use retry wrapper to be resilient against transient failures and anti-bot measures
            html_content = fetch_with_retries(driver, drug, max_attempts=3)
            if not html_content:
                logging.info(f"No HTML returned for {drug}; skipping")
                continue
            name_price = get_name_price(html_content)
            all_data.extend(name_price)

            # Pause between drugs to avoid hammering the site (longer randomized pause)
            human_pause(6.0, 14.0)

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