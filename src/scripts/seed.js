import bcrypt from 'bcryptjs'
import { pool } from '../db.js'

const username = process.env.ADMIN_USERNAME || 'admin'
const password = process.env.ADMIN_PASSWORD || ''
if (password.length < 10) {
    console.error('ADMIN_PASSWORD در .env باید دست‌کم ۱۰ نویسه باشد')
    process.exit(1)
}

const [admins] = await pool.query('SELECT id FROM admins WHERE username = ?', [username])
if (admins[0]) console.log(`ادمین «${username}» از قبل وجود دارد`)
else {
    await pool.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [username, await bcrypt.hash(password, 12)])
    console.log(`ادمین «${username}» ساخته شد`)
}

const [heroes] = await pool.query("SELECT id FROM hero_banners WHERE slug = 'home'")
if (!heroes[0]) {
    const [r] = await pool.query(`INSERT INTO hero_banners (slug, slogan, title, description, image_alt, more_info_link, contact_us_link) VALUES ('home', ?, ?, ?, ?, '/services', '/contact-us')`, ['بیش از یک دهه دفاع از حق موکلان', 'این یک\nتایتل نمونه و\n{{اتفاقی}} است.', 'این یک متن نمونه است. جای این پاراگراف، معرفی کوتاهی از دفتر، رویکرد شما و اینکه چرا موکلان باید به شما اعتماد کنند قرار می‌گیرد.', 'مجسمه عدالت'])
    for (const [i, [v, suffix, label]] of [[94, '٪', 'نرخ موفقیت بالا'], [22, '+', 'افتخار همکاری'], [5, '+', 'سال سابقه']].entries()) await pool.query('INSERT INTO hero_stats (hero_id, stat_value, suffix, label, sort_order) VALUES (?,?,?,?,?)', [r.insertId, v, suffix, label, i])
}

const [aboutRows] = await pool.query("SELECT id FROM about_sections WHERE slug = 'home-about-us'")
if (!aboutRows[0]) {
    const [r] = await pool.query('INSERT INTO about_sections (slug, title, image_alt) VALUES (?,?,?)', ['home-about-us', 'این یک تایتل نمونه است', 'دربارهٔ ما'])
    await pool.query('INSERT INTO about_section_descriptions (about_id, description, sort_order) VALUES (?,?,?)', [r.insertId, 'سلام ای دسته گل یاسمن', 0])
}

const sections = {
    departments: { title: 'دپارتمان ها', subtitle: 'این یک متن نمونه است. این یک متن نمونه است. این یک متن نمونه است', items: [{ title: 'حقوق خانواده', text: 'این یک متن نمونه است. توضیح کوتاه دربارهٔ خدمات این دپارتمان.' }, { title: 'دعاوی کیفری', text: 'این یک متن نمونه است. توضیح کوتاه دربارهٔ خدمات این دپارتمان.' }, { title: 'املاک و ثبت اسناد', text: 'این یک متن نمونه است. توضیح کوتاه دربارهٔ خدمات این دپارتمان.' }, { title: 'حقوق تجارت و شرکت‌ها', text: 'این یک متن نمونه است. توضیح کوتاه دربارهٔ خدمات این دپارتمان.' }, { title: 'قراردادها', text: 'این یک متن نمونه است. توضیح کوتاه دربارهٔ خدمات این دپارتمان.' }, { title: 'دعاوی اداری و مالیاتی', text: 'این یک متن نمونه است. توضیح کوتاه دربارهٔ خدمات این دپارتمان.' }] },
    cases: { title: 'خلاصه پرونده‌ها', subtitle: 'نمونه‌ای از پرونده‌هایی که با موفقیت پیش بردیم و مسیری که برای حل هرکدام طی شد.' },
    bestCases: { title: 'گزیده‌ای از پرونده‌های موفق', subtitle: 'اطلاعات موکلان محرمانه است و فقط نوع دعوا و روش حل نمایش داده می‌شود.' },
    coworkers: { title: 'آشنایی با همکاران ما', subtitle: 'این یک متن نمونه است. متخصصانی که پرونده شما را به عهده می‌گیرند.' },
    contact: { status: 'کنار شما، از همان اولین تماس', title: 'پرونده‌ات را به دست‌های مطمئن بسپار', subtitle: 'این یک متن نمونه است. یک تماس کوتاه کافی است تا مسیر پرونده‌ات روشن شود.' },
    blogs: { title: 'آخرین مطالب', subtitle: 'تازه‌ترین نکات و تحلیل‌های حقوقی گروه غدیری.' },
}
for (const [slug, content] of Object.entries(sections)) {
    await pool.query('INSERT INTO home_sections (slug, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = VALUES(content)', [slug, JSON.stringify(content)])
}

await pool.end()
