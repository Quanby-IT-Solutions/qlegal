import { z } from "zod/v4"

import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import { createEnvelopeSchema } from "./envelope-lite-schema"

const searchUsersSchema = z.object({
  query: z.string().min(1, "Search query is required")
})

const getByIdSchema = z.object({ envelopeId: z.string().min(1) })

// In-memory storage for mock envelopes
const mockEnvelopes = new Map<string, {
  id: string
  title: string
  description: string | null
  status: "DRAFT" | "PUBLISHED" | "COMPLETED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED"
  userId: string
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
}>()

export const envelopeLiteRouter = createTRPCRouter({
  createEnvelope: protectedProcedure
    .input(createEnvelopeSchema)
    .mutation(async ({ ctx, input }) => {
      // Generate a unique ID for the envelope
      const envelopeId = `envelope-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      const mockEnvelope = {
        id: envelopeId,
        title: input.title,
        description: input.description ?? null,
        status: "DRAFT" as const,
        userId: ctx.session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: ctx.session.user.id,
          name: ctx.session.user.name ?? null,
          email: ctx.session.user.email ?? null,
          image: ctx.session.user.image ?? null
        }
      }
      
      // Store the envelope in memory
      mockEnvelopes.set(envelopeId, mockEnvelope)
      
      return mockEnvelope
    }),

  getEnvelopeById: protectedProcedure
    .input(getByIdSchema)
    .query(async ({ ctx, input }) => {
      // Get the envelope from memory storage
      const envelope = mockEnvelopes.get(input.envelopeId)
      
      if (!envelope) {
        throw new Error("Envelope not found")
      }
      
      return envelope
    }),

  getMyEnvelopes: protectedProcedure.query(async ({ ctx }) => {
    // Return all envelopes for the current user
    const userEnvelopes = Array.from(mockEnvelopes.values())
      .filter(envelope => envelope.userId === ctx.session.user.id)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    
    return userEnvelopes
  }),

  searchUsers: protectedProcedure
    .input(searchUsersSchema)
    .query(async ({ ctx, input }) => {
      // For now, return empty array until database is properly set up
      const mockUsers: Array<{
        id: string
        name: string | null
        email: string | null
        image: string | null
      }> = []
      return mockUsers
    })
})