import { relations } from "drizzle-orm"

import { appointments } from "@/services/drizzle/schema/appointments"
import { users } from "@/services/drizzle/schema/auth"
import { documentSigners } from "@/services/drizzle/schema/document-signers"
import { documents } from "@/services/drizzle/schema/document"
import { enpAvailability, enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { envelopes } from "@/services/drizzle/schema/envelope"
import { legalRegistrations } from "@/services/drizzle/schema/legal-registration"
import { meetingParticipants, meetings } from "@/services/drizzle/schema/meetings"
import { messageAttachments } from "@/services/drizzle/schema/message-attachments"
import {
	conversationParticipants,
	conversations,
	messages,
} from "@/services/drizzle/schema/messages"
import { notarialActs, notarialBooks } from "@/services/drizzle/schema/notarial-book"
import { notarizationRequests } from "@/services/drizzle/schema/notarization-requests"
import { signatureRequests } from "@/services/drizzle/schema/signature-requests"
import { witnesses } from "@/services/drizzle/schema/witnesses"

// Meeting relations
export const meetingsRelations = relations(meetings, ({ one, many }) => ({
	createdBy: one(users, {
		fields: [meetings.createdById],
		references: [users.id],
	}),
	participants: many(meetingParticipants),
	documents: many(documents),
	signatureRequests: many(signatureRequests),
}))

// Auth relations
export const userRelations = relations(users, ({ one, many }) => ({
	envelopes: many(envelopes),
	enpProfile: one(enpProfiles, {
		fields: [users.id],
		references: [enpProfiles.userId],
	}),
	enpAvailability: many(enpAvailability),
	legalRegistration: one(legalRegistrations, {
		fields: [users.id],
		references: [legalRegistrations.applicantId],
	}),
	notarialBooks: many(notarialBooks),
}))

// Document relations
export const documentRelations = relations(documents, ({ one, many }) => ({
	envelope: one(envelopes, {
		fields: [documents.envelopeId],
		references: [envelopes.id],
	}),
	meeting: one(meetings, {
		fields: [documents.meetingId],
		references: [meetings.id],
	}),
	signatureRequests: many(signatureRequests),
	signers: many(documentSigners),
}))

// Document signers (per-document signer selection before plotting)
export const documentSignersRelations = relations(documentSigners, ({ one }) => ({
	document: one(documents, {
		fields: [documentSigners.documentId],
		references: [documents.id],
	}),
	user: one(users, {
		fields: [documentSigners.userId],
		references: [users.id],
	}),
}))

// Envelope relations
export const envelopeRelations = relations(envelopes, ({ one, many }) => ({
	user: one(users, {
		fields: [envelopes.userId],
		references: [users.id],
	}),
	documents: many(documents),
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
	invitedBy: one(users, {
		fields: [meetingParticipants.invitedById],
		references: [users.id],
		relationName: "meetingParticipantInvitedBy",
	}),
}))

// Message relations
export const conversationsRelations = relations(conversations, ({ many }) => ({
	participants: many(conversationParticipants),
	messages: many(messages),
	attachments: many(messageAttachments),
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

export const messageAttachmentsRelations = relations(messageAttachments, ({ one }) => ({
	conversation: one(conversations, {
		fields: [messageAttachments.conversationId],
		references: [conversations.id],
	}),
	uploadedBy: one(users, {
		fields: [messageAttachments.uploadedBy],
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

// Signature Request relations
export const signatureRequestsRelations = relations(signatureRequests, ({ one }) => ({
	meeting: one(meetings, {
		fields: [signatureRequests.meetingId],
		references: [meetings.id],
	}),
	document: one(documents, {
		fields: [signatureRequests.documentId],
		references: [documents.id],
	}),
	requester: one(users, {
		fields: [signatureRequests.requesterId],
		references: [users.id],
		relationName: "requestedSignatures",
	}),
	signer: one(users, {
		fields: [signatureRequests.signerId],
		references: [users.id],
		relationName: "signaturesToSign",
	}),
}))

// ENP Profile relations
export const enpProfilesRelations = relations(enpProfiles, ({ one }) => ({
	user: one(users, {
		fields: [enpProfiles.userId],
		references: [users.id],
	}),
}))

// ENP Availability relations
export const enpAvailabilityRelations = relations(enpAvailability, ({ one }) => ({
	enp: one(users, {
		fields: [enpAvailability.enpId],
		references: [users.id],
	}),
}))

// Witness relations
export const witnessesRelations = relations(witnesses, ({ one }) => ({
	enp: one(users, {
		fields: [witnesses.enpId],
		references: [users.id],
	}),
	appointment: one(appointments, {
		fields: [witnesses.appointmentId],
		references: [appointments.id],
	}),
}))

// Notarization Request relations
export const notarizationRequestsRelations = relations(notarizationRequests, ({ one }) => ({
	principal: one(users, {
		fields: [notarizationRequests.principalId],
		references: [users.id],
		relationName: "principalRequests",
	}),
	enp: one(users, {
		fields: [notarizationRequests.enpId],
		references: [users.id],
		relationName: "enpRequests",
	}),
	appointment: one(appointments, {
		fields: [notarizationRequests.appointmentId],
		references: [appointments.id],
	}),
}))

// Notarial Book relations
export const notarialBooksRelations = relations(notarialBooks, ({ one, many }) => ({
	enp: one(users, {
		fields: [notarialBooks.enpId],
		references: [users.id],
	}),
	acts: many(notarialActs),
}))

// Notarial Act relations
export const notarialActsRelations = relations(notarialActs, ({ one }) => ({
	notarialBook: one(notarialBooks, {
		fields: [notarialActs.notarialBookId],
		references: [notarialBooks.id],
	}),
	document: one(documents, {
		fields: [notarialActs.documentId],
		references: [documents.id],
	}),
}))
