// Runs before `vite dev` / `vite build`: pulls the live sitemap (every tender + landing page)
// from the backend and writes it to public/sitemap.xml so it is served as static XML on the site's own domain.
import { writeFileSync, readFileSync } from "fs"
import { resolve } from "path"

const SOURCE = "https://tjuunlzlspznabgldvjr.supabase.co/functions/v1/sitemap"
const out = resolve("public/sitemap.xml")

try {
  const res = await fetch(SOURCE)
  const body = await res.text()
  if (!res.ok || !body.includes("<urlset")) throw new Error(`bad response ${res.status}`)
  writeFileSync(out, body)
  console.log(`sitemap.xml written (${(body.match(/<loc>/g) || []).length} URLs)`)
} catch (e) {
  // Keep the previous file rather than failing the build.
  console.warn("sitemap fetch failed, keeping existing file:", (e as Error).message, readFileSync(out).length)
}
