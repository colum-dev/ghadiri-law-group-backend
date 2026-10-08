import bcrypt from 'bcryptjs'
import { pool } from '../db.js'
import { HOME_DEFAULTS } from '../data/homeDefaults.js'
import { PAGE_DEFAULTS } from '../data/pageDefaults.js'

const username = process.env.ADMIN_USERNAME || 'admin'
const password = process.env.ADMIN_PASSWORD || ''
if (password.length < 10) { console.error('ADMIN_PASSWORD در .env باید دست‌کم ۱۰ نویسه باشد'); process.exit(1) }
const [admins] = await pool.query('SELECT id FROM admins WHERE username = ?', [username])
if (admins[0]) console.log(`ادمین «${username}» از قبل وجود دارد`)
else { await pool.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [username, await bcrypt.hash(password, 12)]); console.log(`ادمین «${username}» ساخته شد`) }
const [heroes] = await pool.query("SELECT id FROM hero_banners WHERE slug = 'home'")
if (!heroes[0]) {
  const [r] = await pool.query(`INSERT INTO hero_banners (slug, slogan, title, description, image_alt, more_info_link, contact_us_link) VALUES ('home', ?, ?, ?, ?, '/services', '/contact-us')`, ['بیش از یک دهه دفاع از حق موکلان', 'این یک\nتایتل نمونه و\n{{اتفاقی}} است.', 'این یک متن نمونه است. جای این پاراگراف، معرفی کوتاهی از دفتر، رویکرد شما و اینکه چرا موکلان باید به شما اعتماد کنند قرار می‌گیرد.', 'مجسمه عدالت'])
  for (const [i, [v, suffix, label]] of [[94, '٪', 'نرخ موفقیت بالا'], [22, '+', 'افتخار همکاری'], [5, '+', 'سال سابقه']].entries()) await pool.query('INSERT INTO hero_stats (hero_id, stat_value, suffix, label, sort_order) VALUES (?,?,?,?,?)', [r.insertId, v, suffix, label, i])
}
const [aboutRows] = await pool.query("SELECT id FROM about_sections WHERE slug = 'home-about-us'")
if (!aboutRows[0]) { const [r] = await pool.query('INSERT INTO about_sections (slug, title, image_alt) VALUES (?,?,?)', ['home-about-us', 'این یک تایتل نمونه است', 'دربارهٔ ما']); await pool.query('INSERT INTO about_section_descriptions (about_id, description, sort_order) VALUES (?,?,?)', [r.insertId, 'سلام ای دسته گل یاسمن', 0]) }
for (const [slug, content] of Object.entries(HOME_DEFAULTS)) await pool.query('INSERT IGNORE INTO home_sections (slug, content) VALUES (?, ?)', [slug, JSON.stringify(content)])
for (const [slug, content] of Object.entries(PAGE_DEFAULTS)) await pool.query('INSERT IGNORE INTO page_contents (slug, content) VALUES (?, ?)', [slug, JSON.stringify(content)])

const TEST_BLOGS = [
  ['divorce-agreement-steps', 'طلاق توافقی چگونه و در چه مدتی انجام می‌شود؟', 'مراحل، مدارک لازم و نکاتی که پیش از مراجعه به دادگاه خانواده باید بدانید.', 'family', 'سارا احمدی', 'مراحل و مدارک لازم', 'در این مقاله مراحل طلاق توافقی، مدارک لازم و نکاتی را بررسی می‌کنیم که پیش از مراجعه به دادگاه خانواده باید بدانید.'],
  ['checking-property-deed', 'پیش از پرداخت بیعانه، سند را این‌طور استعلام بگیرید', 'پنج نکتهٔ ساده که از خیلی از اختلافات ملکی جلوگیری می‌کند.', 'real-estate', 'سارا احمدی', 'استعلام سند ملک', 'پیش از پرداخت بیعانه، وضعیت سند و مالکیت ملک را با چند بررسی ساده و کاربردی کنترل کنید.'],
  ['first-hours-arrest', 'ساعت‌های اول پس از بازداشت؛ چه بگوییم، چه نگوییم؟', 'حق سکوت، حق داشتن وکیل و اشتباهاتی که در بازجویی نباید مرتکب شد.', 'criminal', 'مهدی رضایی', 'حقوق متهم پس از بازداشت', 'حق سکوت، حق داشتن وکیل و مهم‌ترین نکاتی را که در ساعت‌های اول بازداشت باید بدانید مرور می‌کنیم.'],
  ['startup-shareholder-agreement', 'چرا استارتاپ‌ها بدون قرارداد سهام شروع نمی‌کنند؟', 'نگاهی به بندهای کلیدی توافق‌نامهٔ سهام میان بنیان‌گذاران.', 'business', 'امیر غدیری', 'قرارداد سهام استارتاپ', 'توافق‌نامهٔ سهام، نقش بنیان‌گذاران، تقسیم مالکیت و بندهای کلیدی شروع یک استارتاپ را بررسی می‌کنیم.'],
  ['contract-red-flags', 'شش نشانهٔ خطر در یک قرارداد که نباید نادیده بگیرید', 'از مهلت‌های مبهم تا شرایط فسخ یک‌طرفه.', 'contracts', 'امیر غدیری', 'نشانه‌های خطر قرارداد', 'از مهلت‌های مبهم تا شرایط فسخ یک‌طرفه، نشانه‌هایی را می‌شناسیم که باید پیش از امضا جدی بگیرید.'],
  ['tax-assessment-appeal', 'اعتراض به برگ تشخیص مالیات؛ از کجا شروع کنیم؟', 'مهلت قانونی، مدارک لازم و مسیر رسیدگی در هیئت حل اختلاف.', 'tax', '', 'اعتراض به برگ تشخیص', 'مهلت قانونی، مدارک لازم و مسیر رسیدگی به اعتراض در هیئت حل اختلاف مالیاتی را توضیح می‌دهیم.'],
  ['child-custody-basics', 'حضانت فرزند بعد از طلاق؛ معیار دادگاه چیست؟', 'مصلحت کودک، سن فرزند و نحوهٔ تعیین حق ملاقات.', 'family', 'سارا احمدی', 'معیارهای حضانت فرزند', 'مصلحت کودک، سن فرزند و نحوهٔ تعیین حق ملاقات پس از طلاق را به زبان ساده بررسی می‌کنیم.'],
  ['tenant-landlord-disputes', 'اختلاف مالک و مستأجر؛ ودیعه چگونه مطالبه می‌شود؟', 'مسیر قانونی استرداد ودیعه و تخلیهٔ ملک استیجاری.', 'real-estate', 'نگار کریمی', 'مطالبهٔ ودیعه', 'مسیر قانونی استرداد ودیعه و نکات مهم تخلیهٔ ملک استیجاری را مرور می‌کنیم.'],
  ['company-types-comparison', 'مسئولیت محدود یا سهامی خاص؛ کدام برای شما مناسب‌تر است؟', 'مقایسه‌ای کوتاه از تفاوت‌های ساختاری، سرمایه و مسئولیت.', 'business', 'امیر غدیری', 'مقایسهٔ انواع شرکت‌ها', 'تفاوت‌های ساختاری، سرمایه و حدود مسئولیت در شرکت با مسئولیت محدود و سهامی خاص را مقایسه می‌کنیم.'],
]
for (const [slug, title, excerpt, category, author, heading, paragraph] of TEST_BLOGS) {
  const html = `<h2>${heading}</h2><p>${paragraph}</p><h3>جمع‌بندی</h3><p>${excerpt}</p>`
  await pool.query(`INSERT IGNORE INTO blog_posts (slug, title, excerpt, category, author, content_html, toc, reading_minutes, status, meta_title, meta_description, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, DATE_SUB(NOW(), INTERVAL 1 DAY))`, [slug, title, excerpt, category, author, html, JSON.stringify([{ id: heading.toLowerCase().replace(/[^\\p{L}\\p{N}]+/gu, '-'), level: 2, text: heading }, { id: 'جمع‌بندی', level: 3, text: 'جمع‌بندی' }]), Math.max(1, Math.ceil(paragraph.split(/\\s+/).length / 120)), title, excerpt])
}
console.log(`${TEST_BLOGS.length} مقالهٔ تستی بررسی و در صورت نیاز درج شد`)
console.log(`${Object.keys(PAGE_DEFAULTS).length} صفحهٔ نمونه در صورت نیاز درج شد`)
await pool.end()
