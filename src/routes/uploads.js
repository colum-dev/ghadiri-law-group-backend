import fs from 'node:fs/promises'
import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { inspectImage, uploadImage } from '../middleware/upload.js'

const router = Router()
router.use(requireAdmin)

router.post('/', (req, res, next) => {
    uploadImage(req, res, async (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'حجم تصویر نباید بیشتر از ۳ مگابایت باشد' })
            return next(err)
        }
        if (!req.file) return res.status(400).json({ message: 'فایلی ارسال نشد' })

        const info = await inspectImage(req.file.path)
        if (!info) {
            await fs.unlink(req.file.path).catch(() => {})
            return res.status(400).json({ message: 'فایل ارسالی تصویر معتبر نیست' })
        }
        res.status(201).json({ path: `/uploads/${req.file.filename}`, width: info.width, height: info.height })
    })
})

export default router
