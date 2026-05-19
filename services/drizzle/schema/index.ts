import * as enumsSchema from "@/services/drizzle/schema/_enums"
import * as relationsSchema from "@/services/drizzle/schema/_relations"
import * as appointmentParticipantsSchema from "@/services/drizzle/schema/appointment-participants"
import * as appointmentsSchema from "@/services/drizzle/schema/appointments"
import * as authSchema from "@/services/drizzle/schema/auth"
import * as contractAgentSchema from "@/services/drizzle/schema/contract-agent"
import * as doconchainSubOrgsSchema from "@/services/drizzle/schema/doconchain-sub-organizations"
import * as documentSchema from "@/services/drizzle/schema/document"
import * as documentSignersSchema from "@/services/drizzle/schema/document-signers"
import * as enpProfilesSchema from "@/services/drizzle/schema/enp-profiles"
import * as envelopeSchema from "@/services/drizzle/schema/envelope"
import * as idCardDetailsSchema from "@/services/drizzle/schema/id-card-details"
import * as kycSessionsSchema from "@/services/drizzle/schema/kyc-sessions"
import * as legalRegistrationSchema from "@/services/drizzle/schema/legal-registration"
import * as livenessSchema from "@/services/drizzle/schema/liveness"
import * as meetingMessagesSchema from "@/services/drizzle/schema/meeting-messages"
import * as meetingsSchema from "@/services/drizzle/schema/meetings"
import * as messageAttachmentsSchema from "@/services/drizzle/schema/message-attachments"
import * as messagesSchema from "@/services/drizzle/schema/messages"
import * as notarialBookSchema from "@/services/drizzle/schema/notarial-book"
import * as notarizationRequestsSchema from "@/services/drizzle/schema/notarization-requests"
import * as principalVaultSchema from "@/services/drizzle/schema/principal-vault"
import * as signatureRequestsSchema from "@/services/drizzle/schema/signature-requests"

export const schema = {
	...enumsSchema,
	...authSchema,
	...appointmentParticipantsSchema,
	...contractAgentSchema,
	...doconchainSubOrgsSchema,
	...appointmentsSchema,
	...documentSchema,
	...documentSignersSchema,
	...enpProfilesSchema,
	...envelopeSchema,
	...idCardDetailsSchema,
	...kycSessionsSchema,
	...legalRegistrationSchema,
	...livenessSchema,
	...meetingMessagesSchema,
	...meetingsSchema,
	...messagesSchema,
	...messageAttachmentsSchema,
	...notarialBookSchema,
	...notarizationRequestsSchema,
	...principalVaultSchema,
	...signatureRequestsSchema,
	...relationsSchema,
}
