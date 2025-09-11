import * as authSchema from "./auth"
import * as documentSchema from "./document"
import * as envelopeSchema from "./envelope"

export const schema = {
	...authSchema,
	...documentSchema,
	...envelopeSchema,
}
