import * as authSchema from "./auth"
import * as envelopeSchema from "./envelope"

export const schema = {
	...authSchema,
	...envelopeSchema,
}
