import { z } from "zod"
import { TRPCError } from "@trpc/server"

import { getDocumentPublicUrl } from "@/services/supabase/signed-url"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import {
  createEnvelopeSchema,
  downloadDocumentSchema
} from "./envelope-lite.schema"

const searchUsersSchema = z.object({
  query: z.string().min(1, "Search query is required")
})

const createDocumentsSchema = z.object({
  envelopeId: z.string().min(1),
  files: z
    .array(
      z.object({
        name: z.string().min(1),
        type: z.string().min(1),
        size: z.number().int().nonnegative(),
        path: z.string().min(1) // Add path field for Supabase storage path
      })
    )
    .min(1)
})

const getEnvelopeDocumentsSchema = z.object({
  envelopeId: z.string().min(1)
})

const tokenSchema = z.object({ token: z.string().min(1) })
const getByIdSchema = z.object({ envelopeId: z.string().min(1) })
const getDocumentForViewingSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
  envelopeId: z.string().min(1, "Envelope ID is required")
})
export const envelopeLiteRouter = createTRPCRouter({
  createEnvelope: protectedProcedure
    .input(createEnvelopeSchema)
    .mutation(async ({ ctx, input }) => {
      const envelope = await ctx.db.envelope.create({
        data: {
          title: input.title,
          description: input.description,
          status: "PUBLISHED",
          userId: ctx.session.user.id
        }
      })

      await ctx.db.auditEvent.create({
        data: {
          eventType: "ENVELOPE_CREATED",
          description: `Envelope "${envelope.title}" was created`,
          userEmail: ctx.session.user.email,
          userName: ctx.session.user.name,
          envelopeId: envelope.id,
          timestamp: new Date()
        }
      })

      return envelope
    }),

  getEnvelopeById: protectedProcedure
    .input(getByIdSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const envelope = await ctx.db.envelope.findFirst({
        where: {
          id: input.envelopeId,
          OR: [{ userId }, { recipient: { some: { userId } } }]
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, image: true }
          },
          recipient: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true }
              }
            }
          },
          _count: { select: { documents: true, recipient: true } }
        }
      })
      return envelope
    }),

  getMyEnvelopes: protectedProcedure.query(async ({ ctx }) => {
    try {
      const envelopes = await ctx.db.envelope.findMany({
        where: {
          OR: [
            { userId: ctx.session.user.id }, // Envelopes I created
            { recipient: { some: { userId: ctx.session.user.id } } } // Envelopes I'm a recipient of
          ]
        },
        distinct: ["id"], // Ensure unique envelopes
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, image: true }
          },
          recipient: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true }
              }
            }
          },
          documents: { select: { id: true } },
          _count: { select: { recipient: true, documents: true } }
        },
        orderBy: { updatedAt: "desc" }
      })

      return envelopes
    } catch (error) {
      console.error("Error fetching envelopes:", error)
      throw new Error("Failed to fetch envelopes")
    }
  }),

  searchUsers: protectedProcedure
    .input(searchUsersSchema)
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.user.findMany({
        where: {
          OR: [
            { name: { contains: input.query, mode: "insensitive" } },
            { email: { contains: input.query, mode: "insensitive" } }
          ]
        },
        select: { id: true, name: true, email: true, image: true },
        take: 10
      })

      return users
    }),

  createDocuments: protectedProcedure
    .input(createDocumentsSchema)
    .mutation(async ({ ctx, input }) => {
      const created = await ctx.db.$transaction(
        input.files.map((file) =>
          ctx.db.document.create({
            data: {
              envelopeId: input.envelopeId,
              name: file.name,
              type: file.type,
              size: file.size,
              path: file.path // Use the actual path from Supabase upload
            }
          })
        )
      )

      await ctx.db.auditEvent.create({
        data: {
          eventType: "DOCUMENT_UPLOADED",
          description: `${created.length} document(s) uploaded`,
          userEmail: ctx.session.user.email,
          userName: ctx.session.user.name,
          envelopeId: input.envelopeId,
          timestamp: new Date()
        }
      })

      return created
    }),

  getEnvelopeDocuments: protectedProcedure
    .input(getEnvelopeDocumentsSchema)
    .query(async ({ ctx, input }) => {
      const docs = await ctx.db.document.findMany({
        where: { envelopeId: input.envelopeId },
        select: {
          id: true,
          name: true,
          type: true,
          size: true,
          createdAt: true,
          path: true,
          signedDocId: true,
          recipients: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              user: {
                select: { id: true, name: true, email: true, image: true }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      })

      // Add document status based on recipient signatures
      const docsWithStatus = docs.map((doc) => {
        const signers = doc.recipients.filter((r) => r.role === "SIGNER")
        const signedSigners = signers.filter((r) => r.status === "SIGNED")
        const isFullySigned =
          signers.length > 0 && signedSigners.length === signers.length

        return {
          ...doc,
          status: isFullySigned ? "SIGNED" : "PENDING",
          signedDocId: doc.signedDocId
        }
      })

      return docsWithStatus
    }),

  getEnvelopeByToken: protectedProcedure
    .input(tokenSchema)
    .query(async ({ ctx, input }) => {
      // First try to find by token (original behavior)
      let envelope = await ctx.db.envelope.findFirst({
        where: { token: input.token },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, image: true }
          },
          recipient: {
            where: { userId: ctx.session.user.id },
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true }
              }
            }
          },
          _count: { select: { documents: true, recipient: true } }
        }
      })

      // If not found by token, try to find by ID (since frontend might be sending envelope ID as token)
      envelope ??= await ctx.db.envelope.findFirst({
        where: { id: input.token },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, image: true }
          },
          recipient: {
            where: { userId: ctx.session.user.id },
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true }
              }
            }
          },
          _count: { select: { documents: true, recipient: true } }
        }
      })

      return envelope
    }),

  acceptInviteByToken: protectedProcedure
    .input(tokenSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("🔍 acceptInviteByToken: Received token:", input.token)

      // Debug: Check all envelopes and their tokens
      const allEnvelopes = await ctx.db.envelope.findMany({
        select: { id: true, title: true, token: true }
      })
      console.log("🔍 All envelopes in database:", allEnvelopes)

      // First try to find by token (original behavior)
      let envelope = await ctx.db.envelope.findFirst({
        where: { token: input.token }
      })

      // If not found by token, try to find by ID (since frontend might be sending envelope ID as token)
      envelope ??= await ctx.db.envelope.findFirst({
        where: { id: input.token }
      })

      if (!envelope) {
        console.error("❌ acceptInviteByToken: Envelope not found for token:", input.token)
        console.error("❌ Available tokens:", allEnvelopes.map((e) => e.token))
        console.error("❌ Available IDs:", allEnvelopes.map((e) => e.id))
        throw new Error("Invitation not found")
      }

      const existing = await ctx.db.recipient.findFirst({
        where: { envelopeId: envelope.id, userId: ctx.session.user.id }
      })

      if (existing) {
        await ctx.db.recipient.update({
          where: { id: existing.id },
          data: { status: "REQUESTED" }
        })
      } else {
        await ctx.db.recipient.create({
          data: {
            envelopeId: envelope.id,
            userId: ctx.session.user.id,
            role: "SIGNER",
            status: "REQUESTED"
          }
        })
      }

      await ctx.db.auditEvent.create({
        data: {
          eventType: "RECIPIENT_ADDED",
          description: `Access requested`,
          userEmail: ctx.session.user.email,
          userName: ctx.session.user.name,
          envelopeId: envelope.id,
          timestamp: new Date()
        }
      })

      return { envelopeId: envelope.id }
    }),

  acceptInviteByTokenWithPlaceholder: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1),
        placeholderId: z.string().min(1),
        documentId: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log(
        "🔍 acceptInviteByTokenWithPlaceholder: Received token:",
        input.token
      )
      console.log(
        "🔍 acceptInviteByTokenWithPlaceholder: Received placeholderId:",
        input.placeholderId
      )

      // Debug: Check all envelopes and their tokens
      const allEnvelopes = await ctx.db.envelope.findMany({
        select: { id: true, title: true, token: true }
      })
      console.log("🔍 All envelopes in database:", allEnvelopes)

      // First try to find by token (original behavior)
      let envelope = await ctx.db.envelope.findFirst({
        where: { token: input.token }
      })

      // If not found by token, try to find by ID (since frontend might be sending envelope ID as token)
      envelope ??= await ctx.db.envelope.findFirst({
        where: { id: input.token }
      })

      if (!envelope) {
        console.error(
          "❌ acceptInviteByTokenWithPlaceholder: Envelope not found for token:",
          input.token
        )
        console.error(
          "❌ Available tokens:",
          allEnvelopes.map((e) => e.token)
        )
        console.error(
          "❌ Available IDs:",
          allEnvelopes.map((e) => e.id)
        )
        throw new Error("Invitation not found")
      }

      console.log("✅ acceptInviteByTokenWithPlaceholder: Found envelope:", {
        id: envelope.id,
        title: envelope.title,
        status: envelope.status,
        token: envelope.token
      })

      // Check if there's already a pending request for this user and placeholder
      const existingRequest = await ctx.db.recipient.findFirst({
        where: {
          envelopeId: envelope.id,
          userId: ctx.session.user.id,
          placeholderId: input.placeholderId,
          status: "REQUESTED"
        }
      })

      if (existingRequest) {
        // Return existing request info
        return {
          envelopeId: envelope.id,
          placeholderId: input.placeholderId,
          requestId: existingRequest.id
        }
      }

      // Use documentId from input if provided, otherwise try to find it from placeholder
      let documentId: string | null = null

      if (input.documentId) {
        // Use the documentId from the URL parameters
        documentId = input.documentId
        console.log("🔍 Using documentId from input:", documentId)
      } else {
        // Fallback: Find the placeholder recipient to get the documentId
        console.log(
          "🔍 Looking for placeholder recipient with name:",
          input.placeholderId
        )
        console.log("🔍 Envelope ID:", envelope.id)

        const placeholderRecipient = await ctx.db.recipient.findFirst({
          where: {
            envelopeId: envelope.id,
            name: input.placeholderId,
            userId: null // Make sure it's actually a placeholder
          }
        })

        console.log("🔍 Found placeholder recipient:", placeholderRecipient)
        documentId = placeholderRecipient?.documentId ?? null

        // Debug: Check all placeholder recipients in this envelope
        const allPlaceholders = await ctx.db.recipient.findMany({
          where: {
            envelopeId: envelope.id,
            userId: null
          },
          select: {
            id: true,
            name: true,
            email: true,
            documentId: true
          }
        })
        console.log(
          "🔍 All placeholder recipients in envelope:",
          allPlaceholders
        )
      }

      // Create a new request (this is NOT a real recipient yet, just a request)
      const request = await ctx.db.recipient.create({
        data: {
          envelopeId: envelope.id,
          documentId: documentId, // Use the documentId we determined above
          userId: ctx.session.user.id,
          role: "SIGNER",
          status: "REQUESTED",
          placeholderId: input.placeholderId, // Store the placeholder ID
          name: ctx.session.user.name, // Use the user's actual name
          email: ctx.session.user.email // Use the user's actual email
        }
      })

      await ctx.db.auditEvent.create({
        data: {
          eventType: "RECIPIENT_ADDED",
          description: `Access requested for placeholder ${input.placeholderId}`,
          userEmail: ctx.session.user.email,
          userName: ctx.session.user.name,
          envelopeId: envelope.id,
          recipientId: request.id,
          timestamp: new Date()
        }
      })

      return {
        envelopeId: envelope.id,
        placeholderId: input.placeholderId,
        requestId: request.id
      }
    }),

  declineInviteByToken: protectedProcedure
    .input(tokenSchema)
    .mutation(async ({ ctx, input }) => {
      const envelope = await ctx.db.envelope.findFirst({
        where: { token: input.token }
      })
      if (!envelope) throw new Error("Invitation not found")

      const existing = await ctx.db.recipient.findFirst({
        where: { envelopeId: envelope.id, userId: ctx.session.user.id }
      })

      if (existing) {
        await ctx.db.recipient.update({
          where: { id: existing.id },
          data: { status: "REJECTED" }
        })
      } else {
        await ctx.db.recipient.create({
          data: {
            envelopeId: envelope.id,
            userId: ctx.session.user.id,
            role: "SIGNER",
            status: "REJECTED"
          }
        })
      }

      await ctx.db.auditEvent.create({
        data: {
          eventType: "RECIPIENT_REMOVED",
          description: `Invitation declined`,
          userEmail: ctx.session.user.email,
          userName: ctx.session.user.name,
          envelopeId: envelope.id,
          timestamp: new Date()
        }
      })

      return { envelopeId: envelope.id }
    }),

  // Document-level invite by token: get document details
  getDocumentByToken: protectedProcedure
    .input(tokenSchema)
    .query(async ({ ctx, input }) => {
      // Find document by ID (using document ID as token)
      const document = await ctx.db.document.findUnique({
        where: { id: input.token },
        select: {
          id: true,
          name: true,
          envelope: { select: { id: true, title: true } },
          documentFields: {
            where: {
              recipient: {
                OR: [
                  { userId: ctx.session.user.id },
                  { email: ctx.session.user.email }
                ]
              }
            },
            select: { id: true }
          }
        }
      })

      if (!document) {
        throw new Error("Document not found")
      }

      // Check if user is already a recipient (including updated placeholders)
      console.log(
        "🔍 getDocumentByToken - looking for recipient with userId:",
        ctx.session.user.id,
        "email:",
        ctx.session.user.email
      )

      // First, try to find an APPROVED recipient
      let recipient = await ctx.db.recipient.findFirst({
        where: {
          documentId: document.id,
          OR: [
            { userId: ctx.session.user.id },
            { email: ctx.session.user.email }
          ],
          status: "APPROVED"
        },
        orderBy: { id: "desc" }
      })

      // If no APPROVED recipient found, look for any recipient
      recipient ??= await ctx.db.recipient.findFirst({
        where: {
          documentId: document.id,
          OR: [
            { userId: ctx.session.user.id },
            { email: ctx.session.user.email }
          ]
        },
        orderBy: { id: "desc" }
      })

      console.log("🔍 getDocumentByToken - found recipient:", {
        id: recipient?.id,
        status: recipient?.status,
        userId: recipient?.userId,
        email: recipient?.email,
        name: recipient?.name
      })

      // Debug: Check all recipients for this user and document
      const allRecipients = await ctx.db.recipient.findMany({
        where: {
          documentId: document.id,
          OR: [
            { userId: ctx.session.user.id },
            { email: ctx.session.user.email }
          ]
        },
        orderBy: { id: "desc" }
      })
      console.log(
        "🔍 All recipients for this user and document:",
        allRecipients.map((r) => ({
          id: r.id,
          status: r.status,
          userId: r.userId,
          email: r.email,
          name: r.name,
          placeholderId: r.placeholderId
        }))
      )

      // If no recipient exists, don't create one automatically
      // The user should request access explicitly
      if (!recipient) {
        console.log("🔍 No recipient found - user needs to request access")
        return {
          document: { id: document?.id ?? "", name: document?.name ?? "" },
          envelope: document?.envelope ?? null,
          recipient: null,
          hasFields: (document?.documentFields?.length ?? 0) > 0,
          needsAccessRequest: true
        }
      }

      return {
        document: { id: document?.id ?? "", name: document?.name ?? "" },
        envelope: document?.envelope ?? null,
        recipient: recipient
          ? {
            id: recipient.id,
            status: recipient.status,
            role: recipient.role
          }
          : null,
        hasFields: (document?.documentFields?.length ?? 0) > 0,
        needsAccessRequest: !recipient
      }
    }),

  // Accept document invite by token
  acceptDocumentInviteByToken: protectedProcedure
    .input(tokenSchema)
    .mutation(async ({ ctx, input }) => {
      // Find document by ID (token)
      const document = await ctx.db.document.findUnique({
        where: { id: input.token },
        include: { envelope: true }
      })

      if (!document) {
        throw new Error("Document not found")
      }

      // Find or create recipient
      let recipient = await ctx.db.recipient.findFirst({
        where: {
          documentId: document.id,
          userId: ctx.session.user.id
        }
      })

      recipient ??= await ctx.db.recipient.findFirst({
        where: {
          documentId: document.id,
          email: ctx.session.user.email
        }
      })

      // If no recipient exists, create one
      if (!recipient) {
        recipient = await ctx.db.recipient.create({
          data: {
            documentId: document.id,
            envelopeId: document.envelope?.id,
            userId: ctx.session.user.id,
            role: "SIGNER",
            status: "REQUESTED"
          }
        })
      } else {
        // Update existing recipient
        recipient = await ctx.db.recipient.update({
          where: { id: recipient.id },
          data: { status: "REQUESTED", userId: ctx.session.user.id }
        })
      }

      await ctx.db.auditEvent.create({
        data: {
          eventType: "RECIPIENT_ADDED",
          description: "Document access requested",
          userEmail: ctx.session.user.email,
          userName: ctx.session.user.name,
          envelopeId: document.envelope?.id,
          documentId: document.id,
          timestamp: new Date()
        }
      })

      return {
        envelopeId: document.envelope?.id ?? "",
        documentId: document.id
      }
    }),

  // Decline document invite by token
  declineDocumentInviteByToken: protectedProcedure
    .input(tokenSchema)
    .mutation(async ({ ctx, input }) => {
      // Find document by ID (token)
      const document = await ctx.db.document.findUnique({
        where: { id: input.token },
        include: { envelope: true }
      })

      if (!document) {
        throw new Error("Document not found")
      }

      // Find or create recipient
      let recipient = await ctx.db.recipient.findFirst({
        where: {
          documentId: document.id,
          userId: ctx.session.user.id
        }
      })

      recipient ??= await ctx.db.recipient.findFirst({
        where: {
          documentId: document.id,
          email: ctx.session.user.email
        }
      })

      // If no recipient exists, create one
      if (!recipient) {
        recipient = await ctx.db.recipient.create({
          data: {
            documentId: document.id,
            envelopeId: document.envelope?.id,
            userId: ctx.session.user.id,
            role: "SIGNER",
            status: "REJECTED"
          }
        })
      } else {
        // Update existing recipient
        recipient = await ctx.db.recipient.update({
          where: { id: recipient.id },
          data: { status: "REJECTED", userId: ctx.session.user.id }
        })
      }

      await ctx.db.auditEvent.create({
        data: {
          eventType: "RECIPIENT_REMOVED",
          description: "Document invitation declined",
          userEmail: ctx.session.user.email,
          userName: ctx.session.user.name,
          envelopeId: document.envelope?.id,
          documentId: document.id,
          timestamp: new Date()
        }
      })

      return { envelopeId: document.envelope?.id ?? "" }
    }),

  // Accept recipient request (for envelope creator)
  acceptRecipientRequest: protectedProcedure
    .input(z.object({ recipientId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      console.log(
        "🔍 acceptRecipientRequest - looking for recipient ID:",
        input.recipientId
      )

      const recipient = await ctx.db.recipient.findUnique({
        where: { id: input.recipientId },
        include: {
          envelope: true,
          user: true
        }
      })

      console.log("🔍 acceptRecipientRequest - recipient object:", {
        id: recipient?.id,
        status: recipient?.status,
        placeholderId: recipient?.placeholderId,
        userId: recipient?.userId,
        name: recipient?.name,
        email: recipient?.email,
        documentId: recipient?.documentId
      })

      if (!recipient?.envelope) {
        console.log(
          "🔍 acceptRecipientRequest - recipient not found or no envelope"
        )
        throw new Error("Recipient not found")
      }

      // Check if current user is the envelope creator
      if (recipient.envelope.userId !== ctx.session.user.id) {
        throw new Error("Only the envelope creator can accept requests")
      }

      // If this recipient has a placeholderId, find and update the placeholder recipient
      if (recipient.placeholderId) {
        console.log(
          "🔍 Looking for placeholder with name:",
          recipient.placeholderId
        )

        // Find the placeholder recipient by name (placeholderId is the name)
        // For envelope-level requests, we need to find placeholders across all documents
        const placeholderRecipient = await ctx.db.recipient.findFirst({
          where: {
            envelopeId: recipient.envelope.id,
            name: recipient.placeholderId,
            userId: null // Make sure it's actually a placeholder
          }
        })

        console.log("🔍 Found placeholder recipient:", placeholderRecipient)
        console.log(
          "🔍 Placeholder recipient documentId:",
          placeholderRecipient?.documentId
        )

        if (placeholderRecipient) {
          console.log("🔍 Updating placeholder recipient with user info:", {
            placeholderId: placeholderRecipient.id,
            userId: recipient.userId,
            name: recipient.user?.name,
            email: recipient.user?.email
          })

          // Update the placeholder recipient with the real user's info
          await ctx.db.recipient.update({
            where: { id: placeholderRecipient.id },
            data: {
              userId: recipient.userId ?? null,
              name: recipient.user?.name ?? recipient.name ?? null,
              email: recipient.user?.email ?? recipient.email ?? null,
              status: "APPROVED",
              placeholderId: null, // Clear the placeholderId since it's now a real recipient
              documentId: placeholderRecipient.documentId // Preserve the documentId
            }
          })

          console.log("🔍 Placeholder recipient updated successfully")

          // Update document fields that were assigned to the placeholder recipient
          // to now point to the updated recipient
          await ctx.db.documentField.updateMany({
            where: {
              recipientId: placeholderRecipient.id
            },
            data: {
              recipientId: placeholderRecipient.id // Keep the same ID since we updated the recipient in place
            }
          })

          console.log(
            "🔍 Document fields updated to point to the updated recipient"
          )

          // Delete the temporary request record
          await ctx.db.recipient.delete({
            where: { id: input.recipientId }
          })

          await ctx.db.auditEvent.create({
            data: {
              eventType: "RECIPIENT_ADDED",
              description: `Request accepted for ${recipient.user?.name ?? recipient.name ?? recipient.email} - assigned to placeholder ${recipient.placeholderId}`,
              userEmail: ctx.session.user.email,
              userName: ctx.session.user.name,
              envelopeId: recipient.envelope.id,
              recipientId: placeholderRecipient.id,
              timestamp: new Date()
            }
          })

          return {
            success: true,
            placeholderAssigned: true,
            documentId: placeholderRecipient.documentId,
            envelopeId: recipient.envelope.id
          }
        }
      }

      // Regular approval (no placeholder assignment)
      await ctx.db.recipient.update({
        where: { id: input.recipientId },
        data: { status: "APPROVED" }
      })

      await ctx.db.auditEvent.create({
        data: {
          eventType: "RECIPIENT_ADDED",
          description: `Request accepted for ${recipient.user?.name ?? recipient.name ?? recipient.email}`,
          userEmail: ctx.session.user.email,
          userName: ctx.session.user.name,
          envelopeId: recipient.envelope.id,
          recipientId: recipient.id,
          timestamp: new Date()
        }
      })

      return { success: true }
    }),

  // Accept document invite by token with placeholder assignment
  acceptDocumentInviteByTokenWithPlaceholder: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1),
        placeholderId: z.string().min(1)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.db.document.findFirst({
        where: { id: input.token },
        include: { envelope: true }
      })

      if (!document) {
        throw new Error("Document not found")
      }

      // Check if there's already a pending request for this user and placeholder
      const existingRequest = await ctx.db.recipient.findFirst({
        where: {
          documentId: document.id,
          userId: ctx.session.user.id,
          placeholderId: input.placeholderId,
          status: "REQUESTED"
        }
      })

      if (existingRequest) {
        // Return existing request info
        return {
          envelopeId: document.envelope?.id ?? "",
          documentId: document.id,
          placeholderId: input.placeholderId,
          requestId: existingRequest.id
        }
      }

      // Create a new request (this is NOT a real recipient yet, just a request)
      const request = await ctx.db.recipient.create({
        data: {
          documentId: document.id,
          envelopeId: document.envelope?.id,
          userId: ctx.session.user.id,
          role: "SIGNER",
          status: "REQUESTED",
          placeholderId: input.placeholderId, // Store the placeholder ID
          name: null, // This will be filled when accepted
          email: null // This will be filled when accepted
        }
      })

      await ctx.db.auditEvent.create({
        data: {
          eventType: "RECIPIENT_ADDED",
          description: `Access requested for placeholder ${input.placeholderId}`,
          userEmail: ctx.session.user.email,
          userName: ctx.session.user.name,
          envelopeId: document.envelope?.id,
          documentId: document.id,
          recipientId: request.id,
          timestamp: new Date()
        }
      })

      return {
        envelopeId: document.envelope?.id ?? "",
        documentId: document.id,
        placeholderId: input.placeholderId,
        requestId: request.id
      }
    }),

  // Decline recipient request (for envelope creator)
  declineRecipientRequest: protectedProcedure
    .input(z.object({ recipientId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const recipient = await ctx.db.recipient.findUnique({
        where: { id: input.recipientId },
        include: { envelope: true, user: true }
      })

      if (!recipient) {
        throw new Error("Recipient not found")
      }

      // Check if current user is the envelope creator
      if (recipient.envelope?.userId !== ctx.session.user.id) {
        throw new Error("Only the envelope creator can decline requests")
      }

      // Update recipient status to REJECTED
      await ctx.db.recipient.update({
        where: { id: input.recipientId },
        data: { status: "REJECTED" }
      })

      await ctx.db.auditEvent.create({
        data: {
          eventType: "RECIPIENT_REMOVED",
          description: `Request declined for ${recipient.user?.name ?? recipient.name ?? recipient.email}`,
          userEmail: ctx.session.user.email,
          userName: ctx.session.user.name,
          envelopeId: recipient.envelope?.id,
          recipientId: recipient.id,
          timestamp: new Date()
        }
      })

      return { success: true }
    }),

  // Create placeholder recipient
  createPlaceholderRecipient: protectedProcedure
    .input(
      z.object({
        envelopeId: z.string().min(1),
        documentId: z.string().min(1),
        name: z.string().min(1),
        email: z.string().email()
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is envelope creator
      const envelope = await ctx.db.envelope.findUnique({
        where: { id: input.envelopeId }
      })

      if (!envelope || envelope.userId !== ctx.session.user.id) {
        throw new Error(
          "Only the envelope creator can add placeholder recipients"
        )
      }

      // Create placeholder recipient
      const recipient = await ctx.db.recipient.create({
        data: {
          envelopeId: input.envelopeId,
          documentId: input.documentId,
          name: input.name,
          email: input.email,
          role: "SIGNER",
          status: "PENDING"
        }
      })

      await ctx.db.auditEvent.create({
        data: {
          eventType: "RECIPIENT_ADDED",
          description: `Placeholder recipient "${input.name}" added`,
          userEmail: ctx.session.user.email,
          userName: ctx.session.user.name,
          envelopeId: input.envelopeId,
          documentId: input.documentId,
          recipientId: recipient.id,
          timestamp: new Date()
        }
      })

      return recipient
    }),

  // Get pending recipient requests for envelope creator
  getPendingRecipientRequests: protectedProcedure
    .input(z.object({ envelopeId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      // Verify user is envelope creator
      const envelope = await ctx.db.envelope.findUnique({
        where: { id: input.envelopeId }
      })

      if (!envelope || envelope.userId !== ctx.session.user.id) {
        throw new Error("Only the envelope creator can view pending requests")
      }

      // Get all pending requests (these are NOT real recipients yet)
      console.log(
        "🔍 getPendingRecipientRequests: Looking for requests in envelope:",
        input.envelopeId
      )

      const pendingRequests = await ctx.db.recipient.findMany({
        where: {
          envelopeId: input.envelopeId,
          status: "REQUESTED",
          placeholderId: { not: null } // Only requests with placeholder assignments
        },
        select: {
          id: true,
          name: true,
          email: true,
          placeholderId: true,
          documentId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        },
        orderBy: { id: "asc" }
      })

      console.log(
        "🔍 getPendingRecipientRequests: Found pending requests:",
        pendingRequests
      )

      // Debug: Check all REQUESTED recipients in this envelope
      const allRequestedRecipients = await ctx.db.recipient.findMany({
        where: {
          envelopeId: input.envelopeId,
          status: "REQUESTED"
        },
        select: {
          id: true,
          name: true,
          email: true,
          placeholderId: true,
          documentId: true
        }
      })
      console.log(
        "🔍 getPendingRecipientRequests: All REQUESTED recipients:",
        allRequestedRecipients
      )

      return pendingRequests
    }),

  // Publish envelope (change status from DRAFT to PUBLISHED)
  publishEnvelope: protectedProcedure
    .input(z.object({ envelopeId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Verify user is envelope creator
      const envelope = await ctx.db.envelope.findUnique({
        where: { id: input.envelopeId }
      })

      if (!envelope || envelope.userId !== ctx.session.user.id) {
        throw new Error("Only the envelope creator can publish envelopes")
      }

      if (envelope.status === "PUBLISHED") {
        throw new Error("Envelope is already published")
      }

      // Update envelope status to PUBLISHED
      const updatedEnvelope = await ctx.db.envelope.update({
        where: { id: input.envelopeId },
        data: { status: "PUBLISHED" }
      })

      // Create audit event
      await ctx.db.auditEvent.create({
        data: {
          eventType: "ENVELOPE_CREATED",
          description: `Envelope "${envelope.title}" was published`,
          userEmail: ctx.session.user.email,
          userName: ctx.session.user.name,
          envelopeId: envelope.id,
          timestamp: new Date()
        }
      })

      return updatedEnvelope
    }),

  getDocumentForViewing: protectedProcedure
    .input(getDocumentForViewingSchema)
    .query(async ({ ctx, input }) => {
      const { documentId, envelopeId } = input
      const userId = ctx.session.user.id

      // Get the document and verify access
      const document = await ctx.db.document.findFirst({
        where: {
          id: documentId,
          envelopeId: envelopeId,
          envelope: {
            OR: [
              { userId }, // Envelope owner
              { recipient: { some: { userId } } } // Recipient
            ]
          }
        },
        include: {
          envelope: true,
          signedDoc: {
            select: {
              id: true,
              name: true,
              path: true
            }
          }
        }
      })

      if (!document) {
        throw new Error("Document not found or access denied")
      }

      // Determine which document to show
      // let documentToView = document
      let documentPath = document.path
      let documentName = document.name

      // If there's a signed version, use that instead
      if (document.signedDoc) {
        documentPath = document.signedDoc.path
        documentName = document.signedDoc.name
        console.log("📄 Using signed document:", {
          originalId: document.id,
          signedId: document.signedDoc.id,
          signedPath: document.signedDoc.path
        })
      } else {
        console.log("📄 Using unsigned document:", {
          id: document.id,
          path: document.path
        })
      }

      // Get document public URL
      const documentUrl = await getDocumentPublicUrl(documentPath)

      return {
        id: document.id,
        name: documentName,
        url: documentUrl,
        path: documentPath,
        isSigned: !!document.signedDoc,
        signedDocId: document.signedDoc?.id ?? null
      }
    }),

  // Delete placeholder recipient
  deletePlaceholderRecipient: protectedProcedure
    .input(z.object({ recipientId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Find the recipient and verify it's a placeholder
      const recipient = await ctx.db.recipient.findUnique({
        where: { id: input.recipientId },
        include: { envelope: true }
      })

      if (!recipient) {
        throw new Error("Recipient not found")
      }

      // Verify user is envelope creator
      if (recipient.envelope?.userId !== ctx.session.user.id) {
        throw new Error("Only the envelope creator can delete recipients")
      }

      // Only allow deletion of placeholder recipients (no userId and PENDING status)
      if (recipient.userId !== null || recipient.status !== "PENDING") {
        throw new Error("Only placeholder recipients can be deleted")
      }

      // Delete any document fields associated with this recipient
      await ctx.db.documentField.deleteMany({
        where: { recipientId: input.recipientId }
      })

      // Delete the recipient
      await ctx.db.recipient.delete({
        where: { id: input.recipientId }
      })

      // Create audit event
      await ctx.db.auditEvent.create({
        data: {
          eventType: "RECIPIENT_REMOVED",
          description: `Placeholder recipient ${recipient.name} was deleted`,
          userEmail: ctx.session.user.email,
          userName: ctx.session.user.name,
          envelopeId: recipient.envelope.id,
          timestamp: new Date()
        }
      })

      return { success: true }
    }),
  downloadDocument: protectedProcedure
    .input(downloadDocumentSchema)
    .query(async ({ ctx, input }) => {
      const { documentId, envelopeId } = input
      const userId = ctx.session.user.id

      // Get the document and verify access
      const document = await ctx.db.document.findFirst({
        where: {
          id: documentId,
          envelopeId: envelopeId,
          envelope: {
            OR: [
              { userId }, // Envelope owner
              { recipient: { some: { userId } } } // Recipient
            ]
          }
        },
        include: {
          envelope: true,
          signedDoc: {
            select: {
              id: true,
              name: true,
              path: true
            }
          }
        }
      })

      if (!document) {
        throw new Error("Document not found or access denied")
      }

      // Determine which document to download (prefer signed version)
      let documentPath = document.path
      let documentName = document.name
      let isSigned = false

      // If there's a signed version, use that instead
      if (document.signedDoc) {
        documentPath = document.signedDoc.path
        documentName = document.signedDoc.name
        isSigned = true
        console.log("📄 Downloading signed document:", {
          originalId: document.id,
          signedId: document.signedDoc.id,
          signedPath: document.signedDoc.path
        })
      } else {
        console.log("📄 Downloading unsigned document:", {
          id: document.id,
          path: document.path
        })
      }

      // Generate signed URL for download (with longer expiration for download)
      const downloadUrl = await getDocumentPublicUrl(documentPath)

      // Log the download event
      await ctx.db.auditEvent.create({
        data: {
          eventType: "DOCUMENT_VIEWED", // You might want to create a DOCUMENT_DOWNLOADED event type
          description: `Document "${documentName}" ${isSigned ? "(signed version)" : "(unsigned version)"} downloaded`,
          userEmail: ctx.session.user.email,
          userName: ctx.session.user.name,
          envelopeId: envelopeId,
          documentId: documentId,
          timestamp: new Date()
        }
      })

      return {
        id: document.id,
        name: documentName,
        downloadUrl: downloadUrl,
        path: documentPath,
        isSigned,
        signedDocId: document.signedDoc?.id ?? null
      }
    }),
  // Reset recipient status to allow proper flow
  resetRecipientStatus: protectedProcedure
    .input(z.object({ recipientId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const recipient = await ctx.db.recipient.findUnique({
        where: { id: input.recipientId },
        include: { envelope: true }
      })

      if (!recipient) {
        throw new Error("Recipient not found")
      }

      // Check if current user is the recipient
      if (recipient.userId !== ctx.session.user.id) {
        throw new Error("Only the recipient can reset their own status")
      }

      // Delete the recipient record to allow fresh request
      await ctx.db.recipient.delete({
        where: { id: input.recipientId }
      })

      return { success: true }
    }),

  // Get copy invite link for envelope
  getCopyInviteLink: protectedProcedure
    .input(
      z.object({
        envelopeId: z.string().min(1),
        placeholderName: z.string().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      // Get envelope and verify user is the creator
      const envelope = await ctx.db.envelope.findUnique({
        where: { id: input.envelopeId }
      })

      if (!envelope || envelope.userId !== userId) {
        throw new Error(
          "Only the envelope creator can access copy invite links"
        )
      }

      // Generate the copy invite link using the envelope token
      let copyLink = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/envelope/invite?token=${envelope.token}`

      // Add placeholder parameter if provided
      if (input.placeholderName) {
        copyLink += `&placeholder=${encodeURIComponent(input.placeholderName)}`
      }

      return {
        copyLink,
        envelopeId: envelope.id,
        envelopeTitle: envelope.title
      }
    }),

  // Delete a document from an envelope (only if user is the envelope creator)
  deleteDocument: protectedProcedure
    .input(z.object({ documentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const { documentId } = input

      // Check if user owns the envelope containing this document
      const document = await ctx.db.document.findUnique({
        where: { id: documentId },
        include: {
          envelope: true
        }
      })

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found"
        })
      }

      if (document.envelope?.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this document"
        })
      }

      // Delete the document and its recipients in a transaction
      await ctx.db.$transaction(async (tx) => {
        // Delete recipients first
        await tx.recipient.deleteMany({
          where: { documentId }
        })

        // Delete document fields
        await tx.documentField.deleteMany({
          where: { documentId }
        })

        // Delete the document
        await tx.document.delete({
          where: { id: documentId }
        })
      })

      return { success: true }
    })
})
