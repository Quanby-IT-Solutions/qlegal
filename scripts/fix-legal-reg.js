// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs")
const f =
	"z:/Home/Work/Quanby/Dev/Ongoing/e-notary/quanby-legal/features/legal-registration/components/legal-registration-admin-dashboard.tsx"
let c = fs.readFileSync(f, "utf8")
c = c
	.split('application.applicant?.name ?? "N/A"')
	.join('getFullName(application.applicant) || "N/A"')
c = c
	.split("selectedApplication?.applicant?.name")
	.join("getFullName(selectedApplication?.applicant)")
fs.writeFileSync(f, c, "utf8")
const remaining = (c.match(/applicant\?\.name/g) ?? []).length
console.log("Remaining applicant.name:", remaining)
console.log("Done")
