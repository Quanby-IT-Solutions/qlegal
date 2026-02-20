import * as enumsSchema from "@/services/drizzle/schema/_enums"
import * as relationsSchema from "@/services/drizzle/schema/_relations"
import * as appointmentParticipantsSchema from "@/services/drizzle/schema/appointment-participants"
import * as appointmentsSchema from "@/services/drizzle/schema/appointments"
import * as authSchema from "@/services/drizzle/schema/auth"
import * as documentSchema from "@/services/drizzle/schema/document"
import * as documentSignersSchema from "@/services/drizzle/schema/document-signers"
import * as enpProfilesSchema from "@/services/drizzle/schema/enp-profiles"
import * as envelopeSchema from "@/services/drizzle/schema/envelope"
import * as idCardDetailsSchema from "@/services/drizzle/schema/id-card-details"
import * as kycSessionsSchema from "@/services/drizzle/schema/kyc-sessions"
import * as legalRegistrationSchema from "@/services/drizzle/schema/legal-registration"
import * as livenessSchema from "@/services/drizzle/schema/liveness"
import * as meetingsSchema from "@/services/drizzle/schema/meetings"
import * as messageAttachmentsSchema from "@/services/drizzle/schema/message-attachments"
import * as messagesSchema from "@/services/drizzle/schema/messages"
import * as notarialBookSchema from "@/services/drizzle/schema/notarial-book"
import * as notarizationRequestsSchema from "@/services/drizzle/schema/notarization-requests"
import * as signatureRequestsSchema from "@/services/drizzle/schema/signature-requests"

export const schema = {
	...enumsSchema,
	...authSchema,
	...appointmentParticipantsSchema,
	...appointmentsSchema,
	...documentSchema,
	...documentSignersSchema,
	...enpProfilesSchema,
	...envelopeSchema,
	...idCardDetailsSchema,
	...kycSessionsSchema,
	...legalRegistrationSchema,
	...livenessSchema,
	...meetingsSchema,
	...messagesSchema,
	...messageAttachmentsSchema,
	...notarialBookSchema,
	...notarizationRequestsSchema,
	...signatureRequestsSchema,
	...relationsSchema,
}
