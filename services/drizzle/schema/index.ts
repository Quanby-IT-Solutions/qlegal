import * as enumsSchema from "./_enums"
import * as relationsSchema from "./_relations"
import * as authSchema from "./auth"
import * as documentSchema from "./document"
import * as envelopeSchema from "./envelope"
import * as meetingsSchema from "./meetings"
import * as messagesSchema from "./messages"

export const schema = {
	...authSchema,
	...documentSchema,
	...envelopeSchema,
	...meetingsSchema,
	...messagesSchema,
	...enumsSchema,
	...relationsSchema,
}
