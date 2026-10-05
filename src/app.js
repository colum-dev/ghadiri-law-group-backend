import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { config } from './config.js'
import { requireXhrHeader } from './middleware/auth.js'
import authRoutes from './routes/auth.js'
import uploadRoutes from './routes/uploads.js'
import { adminHero, publicHero } from './routes/hero.js'

export function createApp() {
    const app = express()
    app.disable('x-powered-by')
    if (config.isProd) app.set('trust proxy', 1)

    app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
    app.use(cors({ origin: config.corsOrigins, credentials: true }))
    app.use(express.json({ limit: '100kb' }))
    app.use(cookieParser())

    app.use('/uploads', express.static(config.uploadDir, { maxAge: '7d', immutable: true, index: false }))

    app.get('/api/health', (_req, res) => res.json({ ok: true }))

    app.use('/api/public/hero', publicHero)

    app.use('/api/auth', requireXhrHeader, authRoutes)
    app.use('/api/admin/hero', requireXhrHeader, adminHero)
    app.use('/api/admin/uploads', requireXhrHeader, uploadRoutes)

    app.use('/api', (_req, res) => res.status(404).json({ message: 'پیدا نشد' }))

    app.use((err, _req, res, _next) => {
        if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'بدنهٔ درخواست معتبر نیست' })
        if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message })
        console.error(err)
        res.status(500).json({ message: 'خطای داخلی سرور' })
    })

    return app
}
