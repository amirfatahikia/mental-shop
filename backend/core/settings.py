from pathlib import Path
from datetime import timedelta
import os
from decouple import config
import dj_database_url

# ۱. مسیر اصلی پروژه
BASE_DIR = Path(__file__).resolve().parent.parent

# ۲. تنظیمات امنیتی
# اضافه کردن default باعث می‌شود هنگام Build (که متغیرها در دسترس نیستند) ارور ندهد
SECRET_KEY = config('SECRET_KEY', default='django-insecure-build-fallback-key')
DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = ['*']

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
    'storages',

    # اپلیکیشن‌های شما
    'products',
    'credit',
    'orders',
]

# ۴. ترتیب Middleware‌ها
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # حتماً اولین باشد
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
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

# ۵. دیتابیس هوشمند (اتصال به دیتابیس لیارا)
DATABASES = {
    'default': config(
        'DATABASE_URL',
        default='sqlite:///db.sqlite3', # اضافه کردن این خط برای جلوگیری از ارور بیلد
        cast=dj_database_url.parse
    )
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

# ۸. تنظیمات فایل‌های استاتیک
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# ۹. تنظیمات CORS و امنیت دامنه جدید
CORS_ALLOW_ALL_ORIGINS = False # برای امنیت بیشتر روی False بماند
CORS_ALLOW_CREDENTIALS = True

# دامنه‌هایی که اجازه دارند به این API درخواست بفرستند
CORS_ALLOWED_ORIGINS = [
    "https://mentalshop.ir",
    "https://www.mentalshop.ir",
    "https://mental-shop.ir",          # آدرس جدید بدون www
    "https://www.mental-shop.ir",      # آدرس جدید با www
    "https://mental-shop.vercel.app",
    "http://localhost:3000",
]

# دامنه‌های معتبر برای ارسال فرم‌ها (مثل ثبت‌نام و ورود)
CSRF_TRUSTED_ORIGINS = [
    "https://mentalshop.ir",
    "https://www.mentalshop.ir",
    "https://mental-shop.ir",          # آدرس جدید حتماً اضافه شود
    "https://www.mental-shop.ir",      # آدرس جدید با www
    "https://mental-shop.vercel.app",
    "https://mental-shop-api.liara.run",
]

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ۱۰. تنظیمات REST Framework و JWT
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
}

# ۱۱. تنظیمات اختصاصی انبار عکس لیارا (S3)
AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID', default='')
AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY', default='')
AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME', default='')
AWS_S3_ENDPOINT_URL = config('AWS_S3_ENDPOINT_URL', default='')

# تنظیمات هماهنگی با لیارا
AWS_S3_REGION_NAME = 'us-east-1' 
AWS_S3_SIGNATURE_VERSION = 's3v4'
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = None
AWS_S3_VERIFY = True
AWS_QUERYSTRING_AUTH = False

# اضافه شدن این خط برای حل مشکل آدرس‌دهی در لیارا
AWS_S3_ADDRESSING_STYLE = "path" 

STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# این خط را به انتهای بخش ۱۱ در settings.py اضافه کن
AWS_S3_PRECONNECT_CHECK = False
