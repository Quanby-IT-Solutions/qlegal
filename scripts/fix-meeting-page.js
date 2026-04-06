// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs")
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path")

const filePath = path.join(__dirname, "../app/(site)/appointments/[id]/meeting/page.tsx")
let c = fs.readFileSync(filePath, "utf8")

// Fix appointment.lawyer?.name and appointment.client?.name
c = c.replace(
	`appointment.lawyer?.name ?? "Your lawyer"`,
	`getFullName(appointment.createdBy) || "Your lawyer"`
)
c = c.replace(
	`appointment.client?.name ?? "Client"`,
	`getFullName(appointment.participants?.[0]?.user) || "Client"`
)
// Fix meetingLink references in JSX (they should be meetingId now)
c = c.replace("{meetingLink ? <Video", "{meetingId ? <Video")
c = c.replace("{meetingLink\n", "{meetingId\n")
c = c.replace("{meetingLink ? (", "{meetingId ? (")

fs.writeFileSync(filePath, c)
console.log("Done - fixed meeting page")
