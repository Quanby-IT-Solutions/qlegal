import * as enumsSchema from "@/services/drizzle/schema/_enums"
import * as relationsSchema from "@/services/drizzle/schema/_relations"
import * as appointmentsSchema from "@/services/drizzle/schema/appointments"
import * as authSchema from "@/services/drizzle/schema/auth"
import * as documentSchema from "@/services/drizzle/schema/document"
import * as enpProfilesSchema from "@/services/drizzle/schema/enp-profiles"
import * as envelopeSchema from "@/services/drizzle/schema/envelope"
import * as legalRegistrationSchema from "@/services/drizzle/schema/legal-registration"
import * as meetingsSchema from "@/services/drizzle/schema/meetings"
import * as messageAttachmentsSchema from "@/services/drizzle/schema/message-attachments"
import * as messagesSchema from "@/services/drizzle/schema/messages"
import * as signatureRequestsSchema from "@/services/drizzle/schema/signature-requests"
import * as witnessesSchema from "@/services/drizzle/schema/witnesses"

export const schema = {
	...enumsSchema,
	...authSchema,
	...appointmentsSchema,
	...documentSchema,
	...enpProfilesSchema,
	...envelopeSchema,
	...legalRegistrationSchema,
	...meetingsSchema,
	...messagesSchema,
	...messageAttachmentsSchema,
	...signatureRequestsSchema,
	...witnessesSchema,
	...relationsSchema,
}
