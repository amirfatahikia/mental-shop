import os
import django
import time
import re
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# اتصال به دیتابیس جنگو
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from products.models import Product

def scrape_perfect_v3():
    print("🚀 شروع اسکرپینگ فوق‌هوشمند (نسخه نهایی)...")
    chrome_options = Options()
    # chrome_options.add_argument("--headless") # برای دیدن روند کار، این را کامنت بگذار
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    wait = WebDriverWait(driver, 20)

    try:
        # ورود به صفحه اصلی یا لیست برای پیدا کردن لینک‌ها
        driver.get("https://www.technolife.ir/product/list/164_165_166/")
        time.sleep(5)

        product_elements = driver.find_elements(By.CSS_SELECTOR, "a[href*='/product-']")
        links = list(set([el.get_attribute("href") for el in product_elements if "product-" in el.get_attribute("href")]))
        print(f"🔎 {len(links)} لینک معتبر پیدا شد.")

        count = 0
        for link in links[:30]:
            try:
                driver.get(link)
                time.sleep(4)
                
                # ۱. استخراج نام محصول
                title = wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1"))).text.strip()

                # ۲. استخراج قیمت نهایی (دقیقاً طبق اسکرین‌شات شما)
                # ما دنبال پاراگرافی می‌گردیم که کلاس text-primary-shade-1 دارد اما line-through نیست
                try:
                    price_el = driver.find_element(By.XPATH, "//p[contains(@class, 'text-primary-shade-1') and not(contains(@class, 'line-through'))]")
                    price_digits = "".join(re.findall(r'\d+', price_el.text))
                    main_price = int(price_digits)
                except:
                    # راه حل دوم: اگر اولی پیدا نشد، از روی تگ تومان پیدا کن
                    price_el = driver.find_element(By.XPATH, "//span[contains(text(), 'تومان')]/preceding-sibling::p[1]")
                    main_price = int("".join(re.findall(r'\d+', price_el.text)))

                # ۳. استخراج نقد و بررسی (توضیحات محصول طبق اسکرین‌شات شما)
                try:
                    # بخش نقد و بررسی معمولاً در این کانتینر است
                    desc_container = driver.find_element(By.XPATH, "//h2[contains(text(), 'نقد و بررسی')]/parent::div | //div[contains(@class, 'ProductIntroduce')]")
                    description = desc_container.text[:3000] # ۳۰۰۰ کاراکتر اول
                except:
                    description = "توضیحات نقد و بررسی یافت نشد."

                # ۴. استخراج عکس محصول
                try:
                    img_url = driver.find_element(By.CSS_SELECTOR, "img[class*='ProductImage']").get_attribute("src")
                except:
                    img_url = ""

                # ذخیره در دیتابیس
                Product.objects.update_or_create(
                    source_url=link,
                    defaults={
                        'title': title,
                        'description': description,
                        'purchase_price': main_price,
                        'base_sale_price': main_price - 500,
                        'shipping_fee': 85000,
                        'image_url': img_url,
                        'category': 'digital'
                    }
                )
                count += 1
                print(f"✅ محصول {count}: {title[:30]} | قیمت: {main_price:,} تومان")

            except Exception as e:
                print(f"⚠️ رد شد: {link[-10:]}")
                continue

        print(f"✨ عملیات با موفقیت تمام شد. {count} محصول با جزییات کامل ثبت شد.")

    finally:
        driver.quit()

if __name__ == "__main__":
    scrape_perfect_v3()