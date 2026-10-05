import bcrypt from 'bcryptjs'
import { pool } from '../db.js'

const username = process.env.ADMIN_USERNAME || 'admin'
const password = process.env.ADMIN_PASSWORD || ''
if (password.length < 10) {
    console.error('ADMIN_PASSWORD در .env باید دست‌کم ۱۰ نویسه باشد')
    process.exit(1)
}

const [admins] = await pool.query('SELECT id FROM admins WHERE username = ?', [username])
if (admins[0]) {
    console.log(`ادمین «${username}» از قبل وجود دارد`)
} else {
    await pool.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [username, await bcrypt.hash(password, 12)])
    console.log(`ادمین «${username}» ساخته شد`)
}

const [heroes] = await pool.query("SELECT id FROM hero_banners WHERE slug = 'home'")
if (heroes[0]) {
    console.log('بنر صفحهٔ اول از قبل وجود دارد')
} else {
    const [r] = await pool.query(
        `INSERT INTO hero_banners (slug, slogan, title, description, image_alt, more_info_link, contact_us_link)
         VALUES ('home', ?, ?, ?, ?, '/services', '/contact-us')`,
        [
            'بیش از یک دهه دفاع از حق موکلان',
            'این یک\nتایتل نمونه و\n{{اتفاقی}} است.',
            'این یک متن نمونه است. جای این پاراگراف، معرفی کوتاهی از دفتر، رویکرد شما و اینکه چرا موکلان باید به شما اعتماد کنند قرار می‌گیرد.',
            'مجسمه عدالت',
        ],
    )
    const stats = [
        [94, '٪', 'نرخ موفقیت بالا'],
        [22, '+', 'افتخار همکاری'],
        [5, '+', 'سال سابقه'],
    ]
    for (const [i, [v, suffix, label]] of stats.entries()) {
        await pool.query('INSERT INTO hero_stats (hero_id, stat_value, suffix, label, sort_order) VALUES (?,?,?,?,?)', [r.insertId, v, suffix, label, i])
    }
    console.log('بنر صفحهٔ اول ساخته شد')
}

await pool.end()
