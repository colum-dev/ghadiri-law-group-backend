import { Router } from 'express'
import { pool } from '../db.js'
import { requireAdmin } from '../middleware/auth.js'
import { homeUpdateSchema } from '../validation/home.js'
import { HOME_DEFAULTS } from '../data/homeDefaults.js'

const CONTACT_DEFAULTS = {
  status: 'کنار شما، از همان اولین تماس',
  title: 'پرونده‌ات را به دست‌های مطمئن بسپار',
  subtitle: 'این یک متن نمونه است. یک تماس کوتاه کافی است تا مسیر پرونده‌ات روشن شود.',
  phone: '02100000000', phoneLabel: '۰۲۱-۰۰۰۰۰۰۰۰',
  whatsapp: 'https://wa.me/989000000000',
  email: 'info@example.com', address: 'تهران، خیابان نمونه، پلاک ۰',
  hours: 'شنبه تا پنجشنبه، ۹ تا ۱۷', endpoint: '', marqueeWords: [],
}

async function loadSections() {
  const [rows] = await pool.query('SELECT slug, content FROM home_sections ORDER BY id')
  const fromDb = Object.fromEntries(rows.map((row) => [row.slug, typeof row.content === 'string' ? JSON.parse(row.content) : row.content]))
  return Object.fromEntries(Object.entries(HOME_DEFAULTS).map(([slug, def]) => {
    const defaults = slug === 'contact' ? { ...def, ...CONTACT_DEFAULTS } : def
    return [slug, { ...defaults, ...(fromDb[slug] || {}) }]
  }))
}

export const publicHome = Router()
publicHome.get('/', async (_req, res) => { res.set('Cache-Control', 'public, max-age=30'); res.json(await loadSections()) })

export const adminHome = Router()
adminHome.use(requireAdmin)
adminHome.get('/', async (_req, res) => res.json(await loadSections()))
adminHome.put('/', async (req, res) => {
  const parsed = homeUpdateSchema.safeParse(req.body)
  if (!parsed.success) { const issue = parsed.error.issues[0]; return res.status(400).json({ message: `محتوای Home معتبر نیست (${issue.path.join(' › ')}: ${issue.message})` }) }
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    for (const [slug, content] of Object.entries(parsed.data)) {
      if (!content) continue
      await conn.query('INSERT INTO home_sections (slug, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = VALUES(content)', [slug, JSON.stringify(content)])
    }
    await conn.commit()
  } catch (error) { await conn.rollback(); console.error('Failed to update home sections:', error); return res.status(500).json({ message: 'ذخیره محتوای Home با خطا مواجه شد' }) }
  finally { conn.release() }
  res.json(await loadSections())
})
