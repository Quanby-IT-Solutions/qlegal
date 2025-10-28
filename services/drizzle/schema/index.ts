import * as enumsSchema from "@/services/drizzle/schema/_enums"
import * as relationsSchema from "@/services/drizzle/schema/_relations"
import * as appointmentsSchema from "@/services/drizzle/schema/appointments"
import * as authSchema from "@/services/drizzle/schema/auth"
import * as documentSchema from "@/services/drizzle/schema/document"
import * as envelopeSchema from "@/services/drizzle/schema/envelope"
import * as meetingsSchema from "@/services/drizzle/schema/meetings"
import * as messageAttachmentsSchema from "@/services/drizzle/schema/message-attachments"
import * as messagesSchema from "@/services/drizzle/schema/messages"

export const schema = {
	...authSchema,
	...appointmentsSchema,
	...documentSchema,
	...envelopeSchema,
	...meetingsSchema,
	...messagesSchema,
	...messageAttachmentsSchema,
	...enumsSchema,
	...relationsSchema,
}
