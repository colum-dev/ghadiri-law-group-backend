import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db.js'
import { requireAdmin } from '../middleware/auth.js'

async function loadSections() {
    const [rows] = await pool.query('SELECT slug, content, updated_at FROM home_sections ORDER BY id')
    return Object.fromEntries(rows.map((row) => [row.slug, typeof row.content === 'string' ? JSON.parse(row.content) : row.content]))
}

const contentSchema = z.record(z.string().min(1).max(64), z.unknown())

export const publicHome = Router()
publicHome.get('/', async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=30')
    res.json(await loadSections())
})

export const adminHome = Router()
adminHome.use(requireAdmin)
adminHome.get('/', async (_req, res) => res.json(await loadSections()))
adminHome.put('/', async (req, res) => {
    const parsed = contentSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'محتوای Home معتبر نیست' })
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()
        for (const [slug, content] of Object.entries(parsed.data)) {
            await conn.query('INSERT INTO home_sections (slug, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = VALUES(content)', [slug, JSON.stringify(content)])
        }
        await conn.commit()
    } catch (error) {
        await conn.rollback()
        console.error('Failed to update home sections:', error)
        return res.status(500).json({ message: 'ذخیره محتوای Home با خطا مواجه شد' })
    } finally {
        conn.release()
    }
    res.json(await loadSections())
})
