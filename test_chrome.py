from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time

opts = Options()
# Run with a visible browser so you can see it start
# If you want headless, add opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-dev-shm-usage')

service = ChromeService(ChromeDriverManager().install())
print('Using chromedriver:', service.path)

driver = webdriver.Chrome(service=service, options=opts)
print('Started Chrome')

try:
    driver.get('https://example.com')
    print('Page title:', driver.title)
    # keep window open briefly so you can observe it
    time.sleep(5)
finally:
    driver.quit()
    print('Closed browser')
