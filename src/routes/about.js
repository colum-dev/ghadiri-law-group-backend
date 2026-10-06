import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db.js'
import { config } from '../config.js'
import { requireAdmin } from '../middleware/auth.js'
import { UPLOAD_PATH_RE, diskPathOf, inspectImage } from '../middleware/upload.js'

const abs = (path) => (path ? `${config.publicUrl}${path}` : null)
const slug = 'home-about-us'
const pageSlug = 'about-page'
const text = (max) => z.string().trim().max(max).default('')
const item = z.object({ title: text(255), text: text(5000), short: text(1000), heading: text(500), practice: text(2000), points: z.array(text(500)).max(20).default([]), icon: text(100) })
const pageSchema = z.object({
  hero: z.object({ badge: text(255), title: text(500), description: text(3000), primaryLabel: text(100), primaryLink: text(255), secondaryLabel: text(100), secondaryLink: text(255), keywords: z.array(text(100)).max(20).default([]) }).default({}),
  policiesTitle: text(255), policiesSubtitle: text(1000), policies: z.array(item).max(30).default([]),
  ethicsTitle: text(255), ethicsSubtitle: text(1000), ethics: z.array(text(1000)).max(30).default([]), ethicsQuote: text(1000),
  teamTitle: text(255), teamSubtitle: text(1000), team: z.array(z.object({ name: text(255), field: text(255), edu: text(500), photo: z.string().regex(UPLOAD_PATH_RE).nullable().optional() })).max(50).default([]),
  principlesTitle: text(255), principlesSubtitle: text(1000), principles: z.array(z.object({ title: text(255), text: text(5000) })).max(30).default([]),
  reasonsTitle: text(255), reasonsSubtitle: text(1000), reasons: z.array(item).max(30).default([]),
  casesTitle: text(255), casesSubtitle: text(1000), cases: z.array(z.object({ tag: text(100), title: text(500), result: text(255), text: text(3000), statValue: text(50), statUnit: text(100) })).max(30).default([]),
  reviewsTitle: text(255), reviewsSubtitle: text(1000), reviews: z.array(z.object({ text: text(3000), name: text(255), kind: text(255) })).max(30).default([]),
  stats: z.array(z.object({ to: z.number().int().min(0).max(1000000), suffix: text(20), label: text(255) })).max(20).default([]),
}).strict()

async function loadPageContent() {
  const [rows] = await pool.query('SELECT content, updated_at FROM about_page_content WHERE slug = ? LIMIT 1', [pageSlug])
  return rows[0] ? { ...(typeof rows[0].content === 'string' ? JSON.parse(rows[0].content) : rows[0].content), updatedAt: rows[0].updated_at } : null
}
async function loadAbout() {
  const [rows] = await pool.query('SELECT * FROM about_sections WHERE slug = ? LIMIT 1', [slug])
  if (!rows[0]) return null
  const [descriptions] = await pool.query('SELECT description FROM about_section_descriptions WHERE about_id = ? ORDER BY sort_order, id', [rows[0].id])
  return { slug, title: rows[0].title, imagePath: rows[0].image_path, imageUrl: abs(rows[0].image_path), imageWidth: rows[0].image_width, imageHeight: rows[0].image_height, imageAlt: rows[0].image_alt, descriptions: descriptions.map((item, index) => ({ id: index + 1, description: item.description })), page: await loadPageContent(), updatedAt: rows[0].updated_at }
}
export const publicAbout = Router()
publicAbout.get('/', async (_req, res) => { const about = await loadAbout(); if (!about) return res.status(404).json({ message: 'بخش دربارهٔ ما پیدا نشد' }); res.set('Cache-Control', 'public, max-age=30'); res.json(about) })
export const adminAbout = Router()
adminAbout.use(requireAdmin)
const imagePath = z.string().regex(UPLOAD_PATH_RE).nullable().optional()
const baseSchema = z.object({ title: z.string().trim().min(1).max(255), imagePath, imageAlt: z.string().trim().max(255).default(''), descriptions: z.array(z.object({ description: z.string().trim().min(1).max(5000) })).min(1).max(20) })
adminAbout.get('/', async (_req, res) => { const about = await loadAbout(); if (!about) return res.status(404).json({ message: 'بخش دربارهٔ ما پیدا نشد' }); res.json(about) })
adminAbout.put('/', async (req, res) => {
  const base = baseSchema.safeParse(req.body); if (!base.success) return res.status(400).json({ message: 'اطلاعات اصلی دربارهٔ ما معتبر نیست', errors: base.error.issues })
  const page = pageSchema.safeParse(req.body.page || {}); if (!page.success) return res.status(400).json({ message: 'محتوای صفحه دربارهٔ ما معتبر نیست', errors: page.error.issues })
  const data = base.data; const dimensions = data.imagePath ? await inspectImage(diskPathOf(data.imagePath)) : null
  if (data.imagePath && !dimensions) return res.status(400).json({ message: 'تصویر دربارهٔ ما قابل دسترسی نیست', field: 'imagePath' })
  const conn = await pool.getConnection()
  try { await conn.beginTransaction(); const [rows] = await conn.query('SELECT id FROM about_sections WHERE slug = ? LIMIT 1 FOR UPDATE', [slug]); if (!rows[0]) { await conn.rollback(); return res.status(404).json({ message: 'بخش دربارهٔ ما پیدا نشد' }) }; const id = rows[0].id; await conn.query('UPDATE about_sections SET title=?, image_path=?, image_width=?, image_height=?, image_alt=? WHERE id=?', [data.title, data.imagePath ?? null, dimensions?.width ?? null, dimensions?.height ?? null, data.imageAlt, id]); await conn.query('DELETE FROM about_section_descriptions WHERE about_id = ?', [id]); for (const [index, item] of data.descriptions.entries()) await conn.query('INSERT INTO about_section_descriptions (about_id, description, sort_order) VALUES (?, ?, ?)', [id, item.description, index]); await conn.query('INSERT INTO about_page_content (slug, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = VALUES(content)', [pageSlug, JSON.stringify(page.data)]); await conn.commit() } catch (error) { await conn.rollback(); console.error('Failed to update about page:', error); return res.status(500).json({ message: 'ذخیره دربارهٔ ما با خطا مواجه شد' }) } finally { conn.release() }
  res.json(await loadAbout())
})
