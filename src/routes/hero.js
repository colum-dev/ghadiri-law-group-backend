import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db.js'
import { config } from '../config.js'
import { requireAdmin } from '../middleware/auth.js'
import { UPLOAD_PATH_RE, diskPathOf, inspectImage } from '../middleware/upload.js'

const SLUG_RE = /^[a-z0-9-]{1,64}$/

const abs = (p) => (p ? `${config.publicUrl}${p}` : null)

function toDto(b, stats) {
    return {
        slug: b.slug,
        slogan: b.slogan,
        title: b.title,
        description: b.description,
        imagePath: b.image_path,
        imageUrl: abs(b.image_path),
        imageWidth: b.image_width,
        imageHeight: b.image_height,
        imageAlt: b.image_alt,
        moreInfoLink: b.more_info_link,
        contactUsLink: b.contact_us_link,
        stats: stats.map((s) => ({
            iconPath: s.icon_path,
            iconUrl: abs(s.icon_path),
            value: s.stat_value,
            suffix: s.suffix,
            label: s.label,
        })),
        updatedAt: b.updated_at,
    }
}

async function loadHero(slug) {
    const [rows] = await pool.query(
        'SELECT * FROM hero_banners WHERE slug = ? LIMIT 1',
        [slug],
    )

    if (!rows[0]) return null

    const [stats] = await pool.query(
        'SELECT * FROM hero_stats WHERE hero_id = ? ORDER BY sort_order, id',
        [rows[0].id],
    )

    return toDto(rows[0], stats)
}


export const publicHero = Router()

publicHero.get('/:slug', async (req, res) => {
    if (!SLUG_RE.test(req.params.slug)) {
        return res.status(404).json({
            message: 'بنر موردنظر پیدا نشد',
        })
    }

    const hero = await loadHero(req.params.slug)

    if (!hero) {
        return res.status(404).json({
            message: 'بنر موردنظر پیدا نشد',
        })
    }

    res.set('Cache-Control', 'public, max-age=30')
    res.json(hero)
})

export const adminHero = Router()

adminHero.use(requireAdmin)

const uploadPath = z
    .string()
    .regex(
        UPLOAD_PATH_RE,
        'مسیر فایل تصویر نامعتبر است. لطفاً تصویر را دوباره آپلود کنید.',
    )

const link = z
    .string({
        message: 'لینک باید به صورت متن وارد شود',
    })
    .trim()
    .min(1, 'وارد کردن لینک الزامی است')
    .max(255, 'لینک نمی‌تواند بیشتر از ۲۵۵ کاراکتر باشد')
    .refine(
        (v) => v.startsWith('/') || /^https?:\/\//i.test(v),
        'لینک باید با / یا http:// یا https:// شروع شود',
    )

const heroSchema = z.object({
    slogan: z
        .string({
            message: 'شعار باید به صورت متن وارد شود',
        })
        .trim()
        .min(1, 'وارد کردن شعار الزامی است')
        .max(255, 'شعار نمی‌تواند بیشتر از ۲۵۵ کاراکتر باشد'),

    title: z
        .string({
            message: 'عنوان باید به صورت متن وارد شود',
        })
        .trim()
        .min(1, 'وارد کردن عنوان الزامی است')
        .max(500, 'عنوان نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد'),

    description: z
        .string({
            message: 'توضیحات باید به صورت متن وارد شود',
        })
        .trim()
        .min(1, 'وارد کردن توضیحات الزامی است')
        .max(2000, 'توضیحات نمی‌تواند بیشتر از ۲۰۰۰ کاراکتر باشد'),

    imagePath: uploadPath
        .nullable()
        .optional(),

    imageAlt: z
        .string({
            message: 'متن جایگزین تصویر باید به صورت متن وارد شود',
        })
        .trim()
        .max(255, 'متن جایگزین تصویر نمی‌تواند بیشتر از ۲۵۵ کاراکتر باشد')
        .default(''),

    moreInfoLink: link,

    contactUsLink: link,

    stats: z
        .array(
            z.object({
                iconPath: uploadPath
                    .nullable()
                    .optional(),

                value: z
                    .number({
                        message: 'مقدار آمار باید یک عدد باشد',
                    })
                    .int('مقدار آمار باید یک عدد صحیح باشد')
                    .min(0, 'مقدار آمار نمی‌تواند منفی باشد')
                    .max(10_000_000, 'مقدار آمار نمی‌تواند بیشتر از ۱۰٬۰۰۰٬۰۰۰ باشد'),

                suffix: z
                    .string({
                        message: 'پسوند آمار باید به صورت متن وارد شود',
                    })
                    .trim()
                    .max(8, 'پسوند آمار نمی‌تواند بیشتر از ۸ کاراکتر باشد')
                    .default(''),

                label: z
                    .string({
                        message: 'عنوان آمار باید به صورت متن وارد شود',
                    })
                    .trim()
                    .min(1, 'وارد کردن عنوان آمار الزامی است')
                    .max(100, 'عنوان آمار نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد'),
            }),
        )
        .max(6, 'حداکثر ۶ مورد آمار می‌توان اضافه کرد'),
})

adminHero.get('/:slug', async (req, res) => {
    if (!SLUG_RE.test(req.params.slug)) {
        return res.status(404).json({
            message: 'بنر موردنظر پیدا نشد',
        })
    }

    const hero = await loadHero(req.params.slug)

    if (!hero) {
        return res.status(404).json({
            message: 'بنر موردنظر پیدا نشد',
        })
    }

    res.json(hero)
})

adminHero.put('/:slug', async (req, res) => {
    if (!SLUG_RE.test(req.params.slug)) {
        return res.status(404).json({
            message: 'شناسه بنر نامعتبر است',
        })
    }

    const parsed = heroSchema.safeParse(req.body)

    if (!parsed.success) {
        return res.status(400).json({
            message: 'اطلاعات واردشده معتبر نیست. لطفاً خطاهای مشخص‌شده را اصلاح کنید.',
            errors: parsed.error.issues.map((issue) => {
                const field = issue.path.join('.')

                return {
                    field,
                    message: issue.message,
                }
            }),
        })
    }

    const d = parsed.data

    let dims = {
        width: null,
        height: null,
    }

    if (d.imagePath) {
        const info = await inspectImage(diskPathOf(d.imagePath))

        if (!info) {
            return res.status(400).json({
                message: 'تصویر اصلی قابل دسترسی نیست',
                field: 'imagePath',
                error: 'فایل تصویر پیدا نشد یا فایل معتبر نیست. لطفاً تصویر را دوباره آپلود کنید.',
            })
        }

        dims = info
    }

    for (const [index, stat] of d.stats.entries()) {
        if (stat.iconPath) {
            const info = await inspectImage(diskPathOf(stat.iconPath))

            if (!info) {
                return res.status(400).json({
                    message: `آیکن آمار شماره ${index + 1} قابل دسترسی نیست`,
                    field: `stats.${index}.iconPath`,
                    error: 'فایل آیکن پیدا نشد یا فایل معتبر نیست. لطفاً آیکن را دوباره آپلود کنید.',
                })
            }
        }
    }

    const conn = await pool.getConnection()

    try {
        await conn.beginTransaction()

        const [rows] = await conn.query(
            'SELECT id FROM hero_banners WHERE slug = ? LIMIT 1 FOR UPDATE',
            [req.params.slug],
        )

        if (!rows[0]) {
            await conn.rollback()

            return res.status(404).json({
                message: 'بنر موردنظر پیدا نشد',
                error: 'بنری با این شناسه در سیستم وجود ندارد یا قبلاً حذف شده است.',
            })
        }

        const id = rows[0].id

        await conn.query(
            `UPDATE hero_banners
             SET slogan=?,
                 title=?,
                 description=?,
                 image_path=?,
                 image_width=?,
                 image_height=?,
                 image_alt=?,
                 more_info_link=?,
                 contact_us_link=?
             WHERE id=?`,
            [
                d.slogan,
                d.title,
                d.description,
                d.imagePath ?? null,
                dims.width,
                dims.height,
                d.imageAlt,
                d.moreInfoLink,
                d.contactUsLink,
                id,
            ],
        )

        await conn.query(
            'DELETE FROM hero_stats WHERE hero_id = ?',
            [id],
        )

        for (const [i, s] of d.stats.entries()) {
            await conn.query(
                `INSERT INTO hero_stats
                    (hero_id, icon_path, stat_value, suffix, label, sort_order)
                 VALUES (?,?,?,?,?,?)`,
                [
                    id,
                    s.iconPath ?? null,
                    s.value,
                    s.suffix,
                    s.label,
                    i,
                ],
            )
        }

        await conn.commit()
    } catch (e) {
        await conn.rollback()

        console.error('Failed to update hero:', e)

        return res.status(500).json({
            message: 'ذخیره اطلاعات بنر با خطا مواجه شد',
            error: 'در هنگام ذخیره اطلاعات در سرور خطایی رخ داد. لطفاً دوباره تلاش کنید.',
        })
    } finally {
        conn.release()
    }

    res.json(await loadHero(req.params.slug))
})