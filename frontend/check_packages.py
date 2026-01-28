import json
import subprocess
import sys

REGISTRY = "https://mirror-npm.runflare.com"

print(f"🔍 بررسی دقیق همه پکیج‌ها با نسخه EXACT در {REGISTRY}")
print("=" * 80)

# خواندن package.json
with open("package.json", "r") as f:
    data = json.load(f)

# جمع‌آوری همه پکیج‌ها
all_packages = []
all_packages.extend(list(data.get("dependencies", {}).items()))
all_packages.extend(list(data.get("devDependencies", {}).items()))

print(f"📦 تعداد کل پکیج‌ها: {len(all_packages)}\n")

all_ok = True
problem_packages = []

for i, (pkg_name, exact_version) in enumerate(all_packages, 1):
    print(f"[{i:2d}/{len(all_packages)}] {pkg_name}@{exact_version}")
    
    try:
        # بررسی وجود نسخه دقیق
        result = subprocess.run(
            ["npm", "view", f"{pkg_name}@{exact_version}", "--registry", REGISTRY, "version"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            found_version = result.stdout.strip()
            print(f"   ✅ موجود - نسخه: {found_version}")
        else:
            # چک کردن آخرین نسخه موجود
            result2 = subprocess.run(
                ["npm", "view", pkg_name, "--registry", REGISTRY, "version"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result2.returncode == 0:
                latest = result2.stdout.strip()
                print(f"   ❌ نسخه {exact_version} موجود نیست!")
                print(f"   💡 آخرین نسخه موجود: {latest}")
                all_ok = False
                problem_packages.append({
                    "name": pkg_name,
                    "requested": exact_version,
                    "available": latest
                })
            else:
                print(f"   ❌ پکیج {pkg_name} اصلاً در میرور نیست!")
                all_ok = False
                problem_packages.append({
                    "name": pkg_name,
                    "requested": exact_version,
                    "available": "NOT_FOUND"
                })
                
    except subprocess.TimeoutExpired:
        print(f"   ⏰ timeout - میرور پاسخ نمی‌دهد")
        all_ok = False
    except Exception as e:
        print(f"   ❌ خطا: {str(e)[:50]}")
        all_ok = False
    
    print()

# خلاصه نتایج
print("=" * 80)
if all_ok:
    print("🎉 همه پکیج‌ها با نسخه‌های EXACT در میرور موجود هستند!")
    print("\n✅ می‌توانید با اطمینان deploy کنید.")
else:
    print(f"⚠️ {len(problem_packages)} پکیج مشکل دارند!")
    print("\n🔧 پکیج‌های مشکل‌دار:")
    for pkg in problem_packages:
        if pkg["available"] == "NOT_FOUND":
            print(f"   ❌ {pkg['name']}@{pkg['requested']} - پکیج یافت نشد")
        else:
            print(f"   ❌ {pkg['name']}@{pkg['requested']} - آخرین نسخه موجود: {pkg['available']}")

# دستورات بعدی
print("\n" + "=" * 80)
print("📋 دستورات بعدی:")

if all_ok:
    print("""
1. ایجاد فایل .npmrc:
   echo "registry=https://mirror-npm.runflare.com/" > .npmrc

2. پاکسازی و نصب:
   rm -rf node_modules package-lock.json
   npm install

3. تست build:
   npm run build

4. اگر build موفق بود:
   liara deploy
""")
else:
    print("""
💡 راه حل:
1. Build Command لیارا را اینطور تنظیم کنید:
   npm config set registry https://mirror-npm.runflare.com && npm install && npm run build

2. یا نسخه‌های مشکل‌دار را اصلاح کنید:
""")
    for pkg in problem_packages:
        if pkg["available"] != "NOT_FOUND":
            print(f"   {pkg['name']}: \"{pkg['requested']}\" → \"{pkg['available']}\"")