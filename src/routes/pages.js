import { Router } from 'express'
import { pool } from '../db.js'
import { requireAdmin } from '../middleware/auth.js'

// هر صفحهٔ سایت یک سند JSON دارد. اگر سندی ذخیره نشده باشد، فرانت از محتوای پیش‌فرض خودش استفاده می‌کند.
export const PAGE_SLUGS = ['colleagues', 'blogs', 'departments', 'faqs', 'contact', 'services', 'family', 'criminal', 'business', 'real-estate', 'contracts', 'tax']

const MAX_BYTES = 900 * 1024
const MAX_DEPTH = 10
const MAX_STRING = 20000
const MAX_ITEMS = 300
const MAX_KEYS = 100
const KEY_RE = /^[\w$-]{1,64}$/
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const BAD_LINK_RE = /^\s*(javascript|data|vbscript):/i

function validate(value, path = [], depth = 0) {
  const where = path.length ? ` (${path.join(' › ')})` : ''
  if (depth > MAX_DEPTH) return `ساختار محتوا بیش از حد تودرتو است${where}`
  if (value === null || typeof value === 'boolean') return null
  if (typeof value === 'number') return Number.isFinite(value) ? null : `عدد نامعتبر${where}`
  if (typeof value === 'string') {
    if (value.length > MAX_STRING) return `متن بیش از حد طولانی است${where}`
    if (BAD_LINK_RE.test(value)) return `لینک نامعتبر است${where}`
    return null
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ITEMS) return `تعداد آیتم‌ها بیش از حد مجاز است${where}`
    for (const [i, item] of value.entries()) { const e = validate(item, [...path, i + 1], depth + 1); if (e) return e }
    return null
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value)
    if (keys.length > MAX_KEYS) return `تعداد فیلدها بیش از حد مجاز است${where}`
    for (const key of keys) {
      if (!KEY_RE.test(key) || FORBIDDEN_KEYS.has(key)) return `نام فیلد نامعتبر است: ${key}`
      const e = validate(value[key], [...path, key], depth + 1)
      if (e) return e
    }
    return null
  }
  return `نوع داده نامعتبر${where}`
}

const parse = (content) => (typeof content === 'string' ? JSON.parse(content) : content)

async function loadPage(slug) {
  const [rows] = await pool.query('SELECT content, updated_at FROM page_contents WHERE slug = ? LIMIT 1', [slug])
  return { slug, content: rows[0] ? parse(rows[0].content) : null, updatedAt: rows[0]?.updated_at ?? null }
}

function checkSlug(req, res, next) {
  if (!PAGE_SLUGS.includes(req.params.slug)) return res.status(404).json({ message: 'صفحه پیدا نشد' })
  next()
}

export const publicPages = Router()
publicPages.get('/:slug', checkSlug, async (req, res) => {
  res.set('Cache-Control', 'public, max-age=30')
  res.json(await loadPage(req.params.slug))
})

export const adminPages = Router()
adminPages.use(requireAdmin)

adminPages.get('/', async (_req, res) => {
  const [rows] = await pool.query('SELECT slug, updated_at FROM page_contents')
  const updated = Object.fromEntries(rows.map((r) => [r.slug, r.updated_at]))
  res.json(PAGE_SLUGS.map((slug) => ({ slug, customized: !!updated[slug], updatedAt: updated[slug] ?? null })))
})

adminPages.get('/:slug', checkSlug, async (req, res) => res.json(await loadPage(req.params.slug)))

adminPages.put('/:slug', checkSlug, async (req, res) => {
  const content = req.body?.content
  if (!content || typeof content !== 'object' || Array.isArray(content)) return res.status(400).json({ message: 'محتوای صفحه باید یک شیء باشد' })
  const error = validate(content)
  if (error) return res.status(400).json({ message: error })
  const json = JSON.stringify(content)
  if (Buffer.byteLength(json) > MAX_BYTES) return res.status(413).json({ message: 'حجم محتوای صفحه بیش از حد مجاز است' })
  await pool.query('INSERT INTO page_contents (slug, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = VALUES(content)', [req.params.slug, json])
  res.json(await loadPage(req.params.slug))
})

// بازگشت به محتوای پیش‌فرض
adminPages.delete('/:slug', checkSlug, async (req, res) => {
  await pool.query('DELETE FROM page_contents WHERE slug = ?', [req.params.slug])
  res.json(await loadPage(req.params.slug))
})
