import { Router } from 'express'
import { pool } from '../db.js'
import { config } from '../config.js'
import { requireAdmin } from '../middleware/auth.js'

const abs = (path) => (path ? `${config.publicUrl}${path}` : null)

const router = Router()
router.use(requireAdmin)

router.get('/', async (_req, res) => {
    const [rows] = await pool.query(
        `SELECT slug, slogan, title, image_path, image_width, image_height, image_alt, updated_at
         FROM hero_banners
         ORDER BY id`,
    )

    res.json(rows.map((banner) => ({
        slug: banner.slug,
        slogan: banner.slogan,
        title: banner.title,
        imagePath: banner.image_path,
        imageUrl: abs(banner.image_path),
        imageWidth: banner.image_width,
        imageHeight: banner.image_height,
        imageAlt: banner.image_alt,
        updatedAt: banner.updated_at,
    })))
})

export default router
