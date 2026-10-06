# ghadiri-api

بک‌اند سایت گروه حقوقی غدیری: Node.js (Express 5) + MySQL.
در این مرحله: ورود ادمین، مدیریت بنر صفحهٔ اول، دربارهٔ ما، بخش‌های صفحهٔ اصلی، محتوای همهٔ صفحات سایت، آپلود تصویر.

## راه‌اندازی

1. یک دیتابیس MySQL 8 (یا MariaDB 10.6+) با `utf8mb4` و یک کاربر برایش بساز:

   ```sql
   CREATE DATABASE ghadiri CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'ghadiri'@'localhost' IDENTIFIED BY 'یک-رمز-قوی';
   GRANT ALL ON ghadiri.* TO 'ghadiri'@'localhost';
   ```

2. `cp .env.example .env` و مقادیر را پر کن (به‌خصوص `DB_*`، `JWT_SECRET`، `ADMIN_PASSWORD`).
3. `npm install`
4. `npm run db:init` (ساخت جدول‌ها) و `npm run db:seed` (اولین ادمین + محتوای فعلی بنر)
5. `npm run dev` ← `http://localhost:4000`

> اگر دیتابیس از قبل ساخته شده، فقط یک بار دیگر `npm run db:init` را اجرا کن تا جدول جدید `page_contents` ساخته شود (جدول‌های قبلی دست نمی‌خورند).

در پروژهٔ Next.js هم فایل `.env.local` با این محتوا بساز:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## API

| متد | مسیر | دسترسی |
|---|---|---|
| GET | `/api/public/hero/:slug` | عمومی |
| GET | `/api/public/about` · `/api/public/home` | عمومی |
| GET | `/api/public/pages/:slug` | عمومی |
| POST | `/api/auth/login` · `/api/auth/logout` | عمومی |
| GET | `/api/auth/me` | ادمین |
| GET / PUT | `/api/admin/hero/:slug` | ادمین |
| GET / PUT | `/api/admin/about` · `/api/admin/home` | ادمین |
| GET | `/api/admin/pages` (فهرست صفحات و وضعیت شخصی‌سازی) | ادمین |
| GET / PUT / DELETE | `/api/admin/pages/:slug` (DELETE = بازگشت به پیش‌فرض) | ادمین |
| POST | `/api/admin/uploads` (فیلد `file`) | ادمین |

- نشست با کوکی httpOnly است. درخواست‌های غیر GET باید هدر `X-Requested-With: XMLHttpRequest` داشته باشند.
- عنوان بنر: هر خط = یک خط جدید، `{{کلمه}}` = کلمهٔ طلایی.
- فقط PNG/JPG/WebP تا ۳ مگابایت؛ محتوای فایل واقعاً بررسی می‌شود.

### محتوای صفحات (`/api/.../pages/:slug`)

- slugهای مجاز: `colleagues`، `blogs`، `departments`، `faqs`، `contact`، `services`، `family`، `criminal`، `business`، `real-estate`، `contracts`، `tax`.
- بدنهٔ PUT: `{ "content": { ... } }`. ساختار هر صفحه در فرانت (`src/app/data/pageContent.js`) تعریف شده و بک‌اند فقط ایمنی آن را چک می‌کند (عمق، طول متن، تعداد آیتم، لینک‌های `javascript:`، حداکثر حدود ۹۰۰ کیلوبایت).
- اگر برای یک صفحه چیزی ذخیره نشده باشد، `content` برابر `null` است و سایت محتوای پیش‌فرض را نشان می‌دهد.

## استقرار (production)

- `NODE_ENV=production` و `PUBLIC_URL` را آدرس عمومی API بگذار؛ کوکی فقط روی HTTPS ارسال می‌شود.
- اگر سایت و API روی دامنه‌های هم‌سایت (مثل `site.com` و `api.site.com`) باشند، `COOKIE_SAMESITE=lax` کافی است.
- پوشهٔ `uploads/` را در بکاپ و در nginx/CDN در نظر بگیر؛ فایل‌های بی‌استفاده خودکار پاک نمی‌شوند.
