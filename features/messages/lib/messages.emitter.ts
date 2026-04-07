import EventEmitter from "node:events"

export type MessageWithSender = {
	id: string
	conversationId: string
	senderId: string
	content: string
	createdAt: Date
	sender: {
		id: string
		name: string | null
		email: string | null
		image: string | null
	}
}

const ee = new EventEmitter()

export { ee as messagesEmitter }

export function emitMessageAdd(conversationId: string, message: MessageWithSender): void {
	ee.emit("message:add", conversationId, message)
}

export function emitConversationUpdate(affectedUserIds: string[]): void {
	ee.emit("conversation:update", affectedUserIds)
}

export function emitFilesUpdate(conversationId: string): void {
	ee.emit("files:update", conversationId)
}

export function emitTyping(conversationId: string, userId: string, isTyping: boolean): void {
	ee.emit("typing", conversationId, userId, isTyping)
}
