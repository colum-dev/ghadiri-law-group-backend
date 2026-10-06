import 'dotenv/config'
import path from 'node:path'
const need = (k) => { const v = process.env[k]; if (!v) throw new Error(`متغیر محیطی ${k} تنظیم نشده است (فایل .env را ببین)`); return v }
const port = Number(process.env.PORT || 4000)
const isProd = process.env.NODE_ENV === 'production'
const jwtSecret = need('JWT_SECRET')
if (jwtSecret.length < 32) throw new Error('JWT_SECRET باید دست‌کم ۳۲ نویسه باشد')
export const config = { isProd, port, publicUrl: (process.env.PUBLIC_URL || `http://localhost:${port}`).replace(/\/$/, ''), corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3001').split(',').map((s) => s.trim()).filter(Boolean), db: { host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306), user: need('DB_USER'), password: process.env.DB_PASSWORD || '', database: need('DB_NAME') }, jwtSecret, cookie: { name: 'admin_token', sameSite: process.env.COOKIE_SAMESITE || 'strict', secure: isProd, maxAgeMs: 12 * 60 * 60 * 1000 }, uploadDir: path.resolve(process.env.UPLOAD_DIR || 'uploads') }
