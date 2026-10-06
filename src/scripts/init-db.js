import fs from 'node:fs/promises'
import mysql from 'mysql2/promise'
import { config } from '../config.js'
const sql=await fs.readFile(new URL('../../sql/schema.sql',import.meta.url),'utf8')
const blogSql=await fs.readFile(new URL('../../sql/blog_posts.sql',import.meta.url),'utf8')
const conn=await mysql.createConnection({...config.db,multipleStatements:true})
await conn.query(`${sql}\n${blogSql}`)
await conn.end()
console.log('جدول‌ها ساخته شد')
