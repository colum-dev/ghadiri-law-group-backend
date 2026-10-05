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
