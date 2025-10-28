import { relations } from "drizzle-orm"

import { appointments } from "@/services/drizzle/schema/appointments"
import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { envelopes } from "@/services/drizzle/schema/envelope"
import { meetingParticipants, meetings } from "@/services/drizzle/schema/meetings"
import {
	conversationParticipants,
	conversations,
	messages,
} from "@/services/drizzle/schema/messages"

// Auth relations
export const userRelations = relations(users, ({ many }) => ({
	envelopes: many(envelopes),
}))

// Document relations
export const documentRelations = relations(documents, ({ one }) => ({
	envelope: one(envelopes, {
		fields: [documents.envelopeId],
		references: [envelopes.id],
	}),
}))

// Envelope relations
export const envelopeRelations = relations(envelopes, ({ one }) => ({
	user: one(users, {
		fields: [envelopes.userId],
		references: [users.id],
	}),
}))

// Meeting relations
export const meetingsRelations = relations(meetings, ({ one, many }) => ({
	createdBy: one(users, {
		fields: [meetings.createdById],
		references: [users.id],
	}),
	participants: many(meetingParticipants),
}))

export const meetingParticipantsRelations = relations(meetingParticipants, ({ one }) => ({
	meeting: one(meetings, {
		fields: [meetingParticipants.meetingId],
		references: [meetings.id],
	}),
	user: one(users, {
		fields: [meetingParticipants.userId],
		references: [users.id],
	}),
}))

// Message relations
export const conversationsRelations = relations(conversations, ({ many }) => ({
	participants: many(conversationParticipants),
	messages: many(messages),
}))

export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
	conversation: one(conversations, {
		fields: [conversationParticipants.conversationId],
		references: [conversations.id],
	}),
	user: one(users, {
		fields: [conversationParticipants.userId],
		references: [users.id],
	}),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id],
	}),
	sender: one(users, {
		fields: [messages.senderId],
		references: [users.id],
	}),
}))

// Appointment relations
export const appointmentsRelations = relations(appointments, ({ one }) => ({
	client: one(users, {
		fields: [appointments.clientId],
		references: [users.id],
		relationName: "clientAppointments",
	}),
	lawyer: one(users, {
		fields: [appointments.lawyerId],
		references: [users.id],
		relationName: "lawyerAppointments",
	}),
}))
