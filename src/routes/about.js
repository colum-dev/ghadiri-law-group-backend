import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db.js'
import { config } from '../config.js'
import { requireAdmin } from '../middleware/auth.js'
import { UPLOAD_PATH_RE, diskPathOf, inspectImage } from '../middleware/upload.js'

const abs = (path) => (path ? `${config.publicUrl}${path}` : null)
const slug = 'home-about-us'

async function loadAbout() {
    const [rows] = await pool.query('SELECT * FROM about_sections WHERE slug = ? LIMIT 1', [slug])
    if (!rows[0]) return null
    const [descriptions] = await pool.query('SELECT description FROM about_section_descriptions WHERE about_id = ? ORDER BY sort_order, id', [rows[0].id])
    return {
        slug,
        title: rows[0].title,
        imagePath: rows[0].image_path,
        imageUrl: abs(rows[0].image_path),
        imageWidth: rows[0].image_width,
        imageHeight: rows[0].image_height,
        imageAlt: rows[0].image_alt,
        descriptions: descriptions.map((item, index) => ({ id: index + 1, description: item.description })),
        updatedAt: rows[0].updated_at,
    }
}

export const publicAbout = Router()
publicAbout.get('/', async (_req, res) => {
    const about = await loadAbout()
    if (!about) return res.status(404).json({ message: 'بخش دربارهٔ ما پیدا نشد' })
    res.set('Cache-Control', 'public, max-age=30')
    res.json(about)
})

export const adminAbout = Router()
adminAbout.use(requireAdmin)
const imagePath = z.string().regex(UPLOAD_PATH_RE).nullable().optional()
const schema = z.object({
    title: z.string().trim().min(1).max(255),
    imagePath,
    imageAlt: z.string().trim().max(255).default(''),
    descriptions: z.array(z.object({ description: z.string().trim().min(1).max(5000) })).min(1).max(20),
})

adminAbout.get('/', async (_req, res) => {
    const about = await loadAbout()
    if (!about) return res.status(404).json({ message: 'بخش دربارهٔ ما پیدا نشد' })
    res.json(about)
})

adminAbout.put('/', async (req, res) => {
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'اطلاعات دربارهٔ ما معتبر نیست', errors: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) })
    const data = parsed.data
    let dimensions = { width: null, height: null }
    if (data.imagePath) {
        const info = await inspectImage(diskPathOf(data.imagePath))
        if (!info) return res.status(400).json({ message: 'تصویر دربارهٔ ما قابل دسترسی نیست', field: 'imagePath' })
        dimensions = info
    }
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()
        const [rows] = await conn.query('SELECT id FROM about_sections WHERE slug = ? LIMIT 1 FOR UPDATE', [slug])
        if (!rows[0]) {
            await conn.rollback()
            return res.status(404).json({ message: 'بخش دربارهٔ ما پیدا نشد' })
        }
        const id = rows[0].id
        await conn.query('UPDATE about_sections SET title=?, image_path=?, image_width=?, image_height=?, image_alt=? WHERE id=?', [data.title, data.imagePath ?? null, dimensions.width, dimensions.height, data.imageAlt, id])
        await conn.query('DELETE FROM about_section_descriptions WHERE about_id = ?', [id])
        for (const [index, item] of data.descriptions.entries()) {
            await conn.query('INSERT INTO about_section_descriptions (about_id, description, sort_order) VALUES (?, ?, ?)', [id, item.description, index])
        }
        await conn.commit()
    } catch (error) {
        await conn.rollback()
        console.error('Failed to update about section:', error)
        return res.status(500).json({ message: 'ذخیره دربارهٔ ما با خطا مواجه شد' })
    } finally {
        conn.release()
    }
    res.json(await loadAbout())
})
