import { relations } from "drizzle-orm"

import { appointmentParticipants } from "@/services/drizzle/schema/appointment-participants"
import { appointments } from "@/services/drizzle/schema/appointments"
import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { documentSigners } from "@/services/drizzle/schema/document-signers"
import { enpAvailability, enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { envelopes } from "@/services/drizzle/schema/envelope"
import { idCardDetails } from "@/services/drizzle/schema/id-card-details"
import { kycSessions } from "@/services/drizzle/schema/kyc-sessions"
import { legalRegistrations } from "@/services/drizzle/schema/legal-registration"
import { livenessValidations } from "@/services/drizzle/schema/liveness"
import { meetingMessages } from "@/services/drizzle/schema/meeting-messages"
import { meetings } from "@/services/drizzle/schema/meetings"
import { messageAttachments } from "@/services/drizzle/schema/message-attachments"
import {
	conversationParticipants,
	conversations,
	messages,
} from "@/services/drizzle/schema/messages"
import { notarialActs, notarialBooks } from "@/services/drizzle/schema/notarial-book"
import { notarizationRequests } from "@/services/drizzle/schema/notarization-requests"
import {
	principalVaultFiles,
	principalVaultFolders,
	principalVaultFolderShares,
	principalVaultShareFileComments,
} from "@/services/drizzle/schema/principal-vault"
import { savedIds } from "@/services/drizzle/schema/saved-ids"
import { signatureRequests } from "@/services/drizzle/schema/signature-requests"

// Meeting relations
export const meetingsRelations = relations(meetings, ({ one, many }) => ({
	createdBy: one(users, {
		fields: [meetings.createdById],
		references: [users.id],
	}),
	appointments: many(appointments),
	documents: many(documents),
	meetingMessages: many(meetingMessages),
	signatureRequests: many(signatureRequests),
}))

// Meeting message relations
export const meetingMessagesRelations = relations(meetingMessages, ({ one }) => ({
	meeting: one(meetings, {
		fields: [meetingMessages.meetingId],
		references: [meetings.id],
	}),
	sender: one(users, {
		fields: [meetingMessages.senderId],
		references: [users.id],
	}),
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
	idCardDetails: many(idCardDetails),
	savedIds: many(savedIds),
	kycSessions: many(kycSessions),
	livenessValidations: many(livenessValidations),
	appointmentParticipants: many(appointmentParticipants, {
		relationName: "appointmentParticipantUser",
	}),
	invitedAppointmentParticipants: many(appointmentParticipants, {
		relationName: "appointmentParticipantInvitedBy",
	}),
	principalRequests: many(notarizationRequests, { relationName: "principalRequests" }),
	enpRequests: many(notarizationRequests, { relationName: "enpRequests" }),
	requestedSignatures: many(signatureRequests, { relationName: "requestedSignatures" }),
	signaturesToSign: many(signatureRequests, { relationName: "signaturesToSign" }),
	principalVaultFolders: many(principalVaultFolders),
	principalVaultFiles: many(principalVaultFiles),
}))

export const legalRegistrationsRelations = relations(legalRegistrations, ({ one }) => ({
	applicant: one(users, {
		fields: [legalRegistrations.applicantId],
		references: [users.id],
	}),
}))

export const principalVaultFolderRelations = relations(principalVaultFolders, ({ one, many }) => ({
	user: one(users, {
		fields: [principalVaultFolders.userId],
		references: [users.id],
	}),
	parent: one(principalVaultFolders, {
		fields: [principalVaultFolders.parentId],
		references: [principalVaultFolders.id],
		relationName: "principalVaultFolderParent",
	}),
	children: many(principalVaultFolders, { relationName: "principalVaultFolderParent" }),
	files: many(principalVaultFiles),
	shares: many(principalVaultFolderShares),
}))

export const principalVaultFileRelations = relations(principalVaultFiles, ({ one }) => ({
	user: one(users, {
		fields: [principalVaultFiles.userId],
		references: [users.id],
	}),
	folder: one(principalVaultFolders, {
		fields: [principalVaultFiles.folderId],
		references: [principalVaultFolders.id],
	}),
}))

export const principalVaultFolderShareRelations = relations(
	principalVaultFolderShares,
	({ one, many }) => ({
		folder: one(principalVaultFolders, {
			fields: [principalVaultFolderShares.folderId],
			references: [principalVaultFolders.id],
		}),
		principal: one(users, {
			fields: [principalVaultFolderShares.principalUserId],
			references: [users.id],
			relationName: "principalVaultSharePrincipal",
		}),
		recipientEnp: one(users, {
			fields: [principalVaultFolderShares.recipientEnpUserId],
			references: [users.id],
			relationName: "principalVaultShareRecipientEnp",
		}),
		fileComments: many(principalVaultShareFileComments),
	})
)

export const principalVaultShareFileCommentRelations = relations(
	principalVaultShareFileComments,
	({ one }) => ({
		share: one(principalVaultFolderShares, {
			fields: [principalVaultShareFileComments.shareId],
			references: [principalVaultFolderShares.id],
		}),
		file: one(principalVaultFiles, {
			fields: [principalVaultShareFileComments.fileId],
			references: [principalVaultFiles.id],
		}),
		author: one(users, {
			fields: [principalVaultShareFileComments.authorId],
			references: [users.id],
		}),
	})
)

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

export const appointmentParticipantsRelations = relations(appointmentParticipants, ({ one }) => ({
	appointment: one(appointments, {
		fields: [appointmentParticipants.appointmentId],
		references: [appointments.id],
	}),
	user: one(users, {
		fields: [appointmentParticipants.userId],
		references: [users.id],
		relationName: "appointmentParticipantUser",
	}),
	invitedBy: one(users, {
		fields: [appointmentParticipants.invitedById],
		references: [users.id],
		relationName: "appointmentParticipantInvitedBy",
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
export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
	createdBy: one(users, {
		fields: [appointments.userId],
		references: [users.id],
	}),
	meeting: one(meetings, {
		fields: [appointments.meetingId],
		references: [meetings.id],
	}),
	participants: many(appointmentParticipants),
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

// ID Card Details relations
export const idCardDetailsRelations = relations(idCardDetails, ({ one }) => ({
	user: one(users, {
		fields: [idCardDetails.userId],
		references: [users.id],
	}),
}))

// KYC Sessions relations
export const kycSessionsRelations = relations(kycSessions, ({ one }) => ({
	user: one(users, {
		fields: [kycSessions.userId],
		references: [users.id],
	}),
	idCardDetail: one(idCardDetails, {
		fields: [kycSessions.idCardDetailId],
		references: [idCardDetails.id],
	}),
}))

// Liveness Validations relations
export const livenessValidationsRelations = relations(livenessValidations, ({ one }) => ({
	user: one(users, {
		fields: [livenessValidations.userId],
		references: [users.id],
	}),
	meeting: one(meetings, {
		fields: [livenessValidations.meetingId],
		references: [meetings.id],
	}),
}))

// Saved IDs relations
export const savedIdsRelations = relations(savedIds, ({ one }) => ({
	user: one(users, {
		fields: [savedIds.userId],
		references: [users.id],
	}),
	kycSession: one(kycSessions, {
		fields: [savedIds.kycSessionId],
		references: [kycSessions.id],
	}),
}))
