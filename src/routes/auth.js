import { Router } from 'express'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { pool } from '../db.js'
import { clearAuthCookie, requireAdmin, setAuthCookie, signToken } from '../middleware/auth.js'

const router = Router()

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'تعداد تلاش‌ها زیاد بود؛ چند دقیقه بعد دوباره امتحان کنید' },
})

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12)

const loginSchema = z.object({
    username: z.string().trim().min(1).max(64),
    password: z.string().min(1).max(200),
})

router.post('/login', loginLimiter, async (req, res) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'نام کاربری و رمز عبور را وارد کنید' })

    const { username, password } = parsed.data
    const [rows] = await pool.query('SELECT id, username, password_hash FROM admins WHERE username = ? LIMIT 1', [username])
    const admin = rows[0]
    const ok = await bcrypt.compare(password, admin ? admin.password_hash : DUMMY_HASH)
    if (!admin || !ok) return res.status(401).json({ message: 'نام کاربری یا رمز عبور اشتباه است' })

    setAuthCookie(res, signToken(admin))
    res.json({ username: admin.username })
})

router.post('/logout', (_req, res) => {
    clearAuthCookie(res)
    res.json({ ok: true })
})

router.get('/me', requireAdmin, (req, res) => {
    res.json({ username: req.admin.username })
})

export default router
