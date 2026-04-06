// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs")
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path")

const filePath = path.join(
	__dirname,
	"../features/principal-vault/components/principal-vault-explorer.tsx"
)
let c = fs.readFileSync(filePath, "utf8")

c = c.replace('router.replace("/my-files")', 'router.replace("/my-files" as Route)')
c = c.replace('router.push("/my-files")', 'router.push("/my-files" as Route)')
c = c.replace(
	"router.push(`/my-files?folder=${encodeURIComponent(id)}`)",
	"router.push(`/my-files?folder=${encodeURIComponent(id)}` as Route)"
)
// Fix href attribute
c = c.replace('href="/my-files"', 'href={"/my-files" as Route}')

fs.writeFileSync(filePath, c)
console.log("Done - fixed principal vault explorer")
