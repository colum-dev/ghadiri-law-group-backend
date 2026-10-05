import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import path from 'node:path'
import multer from 'multer'
import { imageSize } from 'image-size'
import { config } from '../config.js'

const EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' }

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, config.uploadDir),
    filename: (_req, file, cb) => cb(null, crypto.randomUUID() + EXT[file.mimetype]),
})

export const uploadImage = multer({
    storage,
    limits: { fileSize: 3 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        if (!EXT[file.mimetype]) return cb(Object.assign(new Error('فقط تصویر PNG، JPG یا WebP مجاز است'), { status: 400 }))
        cb(null, true)
    },
}).single('file')

// مطمئن می‌شود فایل واقعاً تصویر است و ابعادش را برمی‌گرداند
export async function inspectImage(filePath) {
    try {
        const buf = await fs.readFile(filePath)
        const { width, height } = imageSize(buf)
        if (!width || !height) return null
        return { width, height }
    } catch {
        return null
    }
}

export const UPLOAD_PATH_RE = /^\/uploads\/[A-Za-z0-9-]+\.(png|jpg|webp)$/

export function diskPathOf(uploadPath) {
    return path.join(config.uploadDir, path.basename(uploadPath))
}
