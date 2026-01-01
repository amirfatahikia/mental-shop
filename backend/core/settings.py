from pathlib import Path
from datetime import timedelta
import os

# ۱. مسیر اصلی پروژه
BASE_DIR = Path(__file__).resolve().parent.parent

# ۲. تنظیمات امنیتی
SECRET_KEY = 'django-insecure-30$m5vx=m7f)v12-sb1w775@a0arg$pc&z=thev#(=)9k+4m84'
DEBUG = True

# اجازه دسترسی لوکال (سرعت حداکثری روی مک)
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '*']

# ۳. تعریف اپلیکیشن‌ها
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # پکیج‌های نصب شده
    'rest_framework',
    'corsheaders',

    # اپلیکیشن‌های شما
    'products',
    'credit',
    'orders',
]

# ۴. ترتیب Middleware‌ها (CORS در ابتدا قرار دارد)
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    }
]

WSGI_APPLICATION = 'core.wsgi.application'

# ۵. دیتابیس
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# ۶. تایید رمز عبور
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ۷. تنظیمات بومی‌سازی
LANGUAGE_CODE = 'fa-ir'
TIME_ZONE = 'Asia/Tehran'
USE_I18N = True
USE_TZ = True

# ۸. تنظیمات فایل‌های استاتیک و رسانه‌ای (Media)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# آدرسی که در مرورگر برای دیدن عکس‌ها استفاده می‌شود
MEDIA_URL = '/media/'
# پوشه‌ای که عکس‌ها در آن ذخیره می‌شوند
MEDIA_ROOT = BASE_DIR / 'media'

# ✅ اضافه شد: افزایش سقف آپلود (برای عکس/ویدئو)
# (اگر ویدئوها سنگین‌ترن، این اعداد رو بیشتر کن)
DATA_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024   # 50MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024   # 50MB
FILE_UPLOAD_PERMISSIONS = 0o644

# ۹. تنظیمات CORS و دسترسی‌های معتبر
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# بازگشت به تنظیمات localhost برای رفع خطاهای امنیتی در محیط توسعه مک
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
]

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ۱۰. تنظیمات REST Framework و JWT
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    # ✅ اضافه شد: برای اینکه API بتونه multipart/form-data (آپلود فایل) رو بگیره
    'DEFAULT_PARSER_CLASSES': (
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
}
