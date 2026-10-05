import fs from 'node:fs/promises'
import { config } from './config.js'
import { createApp } from './app.js'

await fs.mkdir(config.uploadDir, { recursive: true })

createApp().listen(config.port, () => {
    console.log(`API روی ${config.publicUrl} در حال اجراست`)
})
