import 'dotenv/config'
import path from 'node:path'

const need = (k) => {
    const v = process.env[k]
    if (!v) throw new Error(`متغیر محیطی ${k} تنظیم نشده است (فایل .env را ببین)`)
    return v
}

const port = Number(process.env.PORT || 4000)
const isProd = process.env.NODE_ENV === 'production'
const jwtSecret = need('JWT_SECRET')
const publicUrl = (process.env.PUBLIC_URL || `http://localhost:${port}`).replace(/\/$/, '')
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3001').split(',').map((s) => s.trim()).filter(Boolean)
const cookieSameSite = (process.env.COOKIE_SAMESITE || 'strict').toLowerCase()

if (jwtSecret.length < 32) throw new Error('JWT_SECRET باید دست‌کم ۳۲ نویسه باشد')
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT معتبر نیست')
if (!['lax', 'strict', 'none'].includes(cookieSameSite)) throw new Error('COOKIE_SAMESITE باید lax، strict یا none باشد')

if (isProd) {
    if (!publicUrl.startsWith('https://')) throw new Error('در production مقدار PUBLIC_URL باید با https:// شروع شود')
    if (cookieSameSite === 'none' && !publicUrl.startsWith('https://')) throw new Error('COOKIE_SAMESITE=none فقط با HTTPS مجاز است')
    if (corsOrigins.some((origin) => !origin.startsWith('https://'))) throw new Error('در production همهٔ CORS_ORIGINS باید HTTPS باشند')
    if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD.length < 12) throw new Error('در production مقدار DB_PASSWORD باید حداقل ۱۲ نویسه باشد')
    if (!process.env.ADMIN_PASSWORD && !process.env.ADMIN_USERNAME) console.warn('ADMIN_* تنظیم نشده؛ برای ساخت ادمین اولیه db:seed قابل استفاده نیست')
}

export const config = {
    isProd,
    port,
    publicUrl,
    corsOrigins,
    db: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 3306),
        user: need('DB_USER'),
        password: process.env.DB_PASSWORD || '',
        database: need('DB_NAME'),
    },
    jwtSecret,
    cookie: {
        name: 'admin_token',
        sameSite: cookieSameSite,
        secure: isProd,
        maxAgeMs: 12 * 60 * 60 * 1000,
    },
    uploadDir: path.resolve(process.env.UPLOAD_DIR || 'uploads'),
}
