// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs")
const f = "z:/Home/Work/Quanby/Dev/Ongoing/e-notary/quanby-legal/app/(site)/messages/page.tsx"
let c = fs.readFileSync(f, "utf8")

// 1. Filter line
c = c.replace(
	"conv.otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase())",
	"getFullName(conv.otherUser).toLowerCase().includes(searchQuery.toLowerCase())"
)

// 2. conversation avatar fallback (tab-indented, 13 tabs before ?.split)
c = c.replace(
	/\{conversation\.otherUser\?\.name\s*\?\.split\(" "\)\s*\.map\(n => n\[0\]\)\s*\.join\(""\)\}/g,
	"{getInitials(getFullName(conversation.otherUser))}"
)

// 3. conversation display name
c = c.replace("{conversation.otherUser?.name}", "{getFullName(conversation.otherUser)}")

// 4. selectedConversation avatar fallbacks
c = c.replace(
	/\{selectedConversation\.otherUser\?\.name\s*\?\.split\(" "\)\s*\.map\(n => n\[0\]\)\s*\.join\(""\)\}/g,
	"{getInitials(getFullName(selectedConversation.otherUser))}"
)

// 5. selectedConversation display name in header h2
c = c.replace(
	"{selectedConversation.otherUser?.name}</h2>",
	"{getFullName(selectedConversation.otherUser)}</h2>"
)

fs.writeFileSync(f, c, "utf8")

// Verify no more occurrences
const remaining = (c.match(/otherUser\?\.name/g) ?? []).length
console.log("Remaining otherUser.name refs:", remaining)
console.log("Done")
