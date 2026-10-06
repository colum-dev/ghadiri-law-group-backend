import jwt from 'jsonwebtoken'
import { config } from '../config.js'

export function signToken(admin) {
    return jwt.sign({ sub: admin.id, username: admin.username }, config.jwtSecret, { expiresIn: '12h' })
}

const cookieOpts = () => ({
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/',
})

export function setAuthCookie(res, token) {
    res.cookie(config.cookie.name, token, { ...cookieOpts(), maxAge: config.cookie.maxAgeMs })
}

export function clearAuthCookie(res) {
    res.clearCookie(config.cookie.name, cookieOpts())
}

export function requireAdmin(req, res, next) {
    const token = req.cookies?.[config.cookie.name]
    if (!token) return res.status(401).json({ message: 'ابتدا وارد شوید' })
    try {
        const p = jwt.verify(token, config.jwtSecret)
        req.admin = { id: p.sub, username: p.username }
        next()
    } catch {
        res.status(401).json({ message: 'نشست شما منقضی شده است؛ دوباره وارد شوید' })
    }
}

export function requireXhrHeader(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
    if (req.get('x-requested-with') !== 'XMLHttpRequest') {
        return res.status(403).json({ message: 'درخواست نامعتبر' })
    }
    next()
}

// X-Requested-With تنها به‌تنهایی CSRF protection نیست؛ مبدأ واقعی مرورگر را هم بررسی می‌کنیم.
export function requireTrustedOrigin(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()

    const candidates = [req.get('origin'), req.get('referer')].filter(Boolean)
    const trusted = new Set(config.corsOrigins.map((origin) => origin.replace(/\/$/, '')))
    const publicOrigin = (() => {
        try { return new URL(config.publicUrl).origin } catch { return null }
    })()
    if (publicOrigin) trusted.add(publicOrigin)

    const valid = candidates.some((value) => {
        try { return trusted.has(new URL(value).origin) } catch { return false }
    })
    if (!valid) return res.status(403).json({ message: 'مبدأ درخواست معتبر نیست' })
    next()
}
