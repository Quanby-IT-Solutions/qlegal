"use client"

import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import {
  ChevronDown,
  Copy,
  Eye,
  FileText,
  MoreVertical,
  Share,
  Trash2,
  User,
  UserPlus,
  Users
} from "lucide-react"
import { toast } from "sonner"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/core/components/tooltip"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger
} from "@/core/components/ui/disclosure"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/core/components/ui/dropdown-menu"

import { trpc, type RouterOutputs } from "@/services/trpc/client"

import {
  formatFileSize,
  generateInviteLink,
  getDocumentStatus,
  getDocumentStatusConfig,
  getRecipientStatusConfig,
  type RecipientStatus
} from "../utils/status.utils"
import { DocumentPreviewDialog } from "./document-preview-dialog"
import { DeleteDocumentDialog } from "./delete-document-dialog"

type Document = RouterOutputs["envelopeLite"]["getEnvelopeDocuments"][number]
type PendingRequest =
  RouterOutputs["envelopeLite"]["getPendingRecipientRequests"][number]

interface DocumentListWithDisclosureProps {
  documents: Document[]
  envelopeId: string
}

export function DocumentListWithDisclosure({
  documents,
  envelopeId
}: DocumentListWithDisclosureProps) {
  // Preview dialog state
  const [previewDocument, setPreviewDocument] = useState<{
    id: string
    name: string
  } | null>(null)

  const queryClient = useQueryClient()

  // Only load data when needed for performance
  const { data: pendingRequests, refetch: refetchPendingRequests } =
    trpc.envelopeLite.getPendingRecipientRequests.useQuery(
      { envelopeId },
      { enabled: !!envelopeId }
    )

  // Accept/decline recipient request mutations
  const acceptRequest = trpc.envelopeLite.acceptRecipientRequest.useMutation({
    onSuccess: async () => {
      await refetchPendingRequests()
      toast.success("Request accepted successfully!")
    },
    onError: (error) => {
      console.error("Accept request error:", error)
      if (error.message.includes("Recipient not found")) {
        toast.error("Request already processed!")
      } else {
        toast.error("Failed to accept request. Please try again.")
      }
    }
  })

  const declineRequest = trpc.envelopeLite.declineRecipientRequest.useMutation({
    onSuccess: async () => {
      await refetchPendingRequests()
      toast.success("Request declined successfully!")
    },
    onError: (error) => {
      console.error("Decline request error:", error)
      toast.error("Failed to decline request. Please try again.")
    }
  })

  // Delete document mutation
  const deleteDocument = trpc.envelopeLite.deleteDocument.useMutation({
    onSuccess: async () => {
      toast.success("Document deleted successfully!")
      // Invalidate and refetch envelope documents to update the list
      await queryClient.invalidateQueries({
        queryKey: [["envelopeLite", "getEnvelopeDocuments"]]
      })
      await queryClient.invalidateQueries({
        queryKey: [["envelopeLite", "getEnvelopeById"]]
      })
    },
    onError: (error) => {
      console.error("Delete document error:", error)
      toast.error("Failed to delete document. Please try again.")
    }
  })

  const handleAcceptRequest = useCallback(
    (recipientId: string) => {
      acceptRequest.mutate({ recipientId })
    },
    [acceptRequest]
  )

  const handleDeclineRequest = useCallback(
    (recipientId: string) => {
      declineRequest.mutate({ recipientId })
    },
    [declineRequest]
  )

  const handleCopyInviteLink = useCallback(
    async (placeholderName: string, documentId: string) => {
      try {
        const linkToCopy = generateInviteLink(
          envelopeId,
          placeholderName,
          documentId
        )
        await navigator.clipboard.writeText(linkToCopy)
        toast.success(`Invite link for ${placeholderName} copied to clipboard!`)
      } catch (error) {
        console.error("Failed to copy link:", error)
        toast.error("Failed to copy link to clipboard")
      }
    },
    [envelopeId]
  )

  const handleDeleteDocument = useCallback(
    async (documentId: string) => {
      deleteDocument.mutate({ documentId })
    },
    [deleteDocument]
  )

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95
    }
  }

  // Status colors now handled by utility functions

  return (
    <motion.div
      className="space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence mode="popLayout">
        {documents.map((document) => {
          // Get pending requests for this document
          const docPendingRequests =
            pendingRequests?.filter(
              (request: PendingRequest) => request.documentId === document.id
            ) ?? []
          const hasPendingRequests = docPendingRequests.length > 0

          // Get document recipients (exclude REQUESTED status)
          const docRecipients = (document.recipients ?? []).filter(
            (recipient) => recipient.status !== "REQUESTED"
          )

          // Get document status using utility
          const documentStatus = getDocumentStatus(document.status, docRecipients)
          const statusConfig = getDocumentStatusConfig(documentStatus)

          return (
            <motion.div
              key={document.id}
              variants={itemVariants}
              layout
              transition={{
                duration: 0.3,
                ease: "easeOut"
              }}
            >
              <Card className="group overflow-hidden">
                <CardContent className="p-0">
                  <Disclosure>
                    {/* Document Header */}
                    <div className="flex items-center gap-4 p-4">
                      <div className="rounded-lg bg-muted p-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="truncate text-sm font-medium">
                            {document.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {document.type}
                            </Badge>
                            <Badge
                              variant={statusConfig.variant}
                              className={`text-xs ${statusConfig.className}`}
                            >
                              {statusConfig.label}
                            </Badge>
                            {hasPendingRequests && (
                              <Badge
                                variant="outline"
                                className="border-orange-200 bg-orange-50 text-xs text-orange-700"
                              >
                                {docPendingRequests?.length} Pending Request
                                {docPendingRequests?.length !== 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(document.size)} •{" "}
                          {format(
                            new Date(document.createdAt),
                            "MMM d, yyyy 'at' h:mm a"
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Show signatory count */}
                        {docRecipients.length > 0 && (
                          <div className="mr-2 flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{docRecipients.length}</span>
                          </div>
                        )}

                        {/* Primary Actions Group */}
                        <div className="flex items-center rounded-md border">
                          {/* Preview Button */}
                          <Tooltip>
                            <TooltipTrigger>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-none border-r hover:bg-muted"
                                onClick={() =>
                                  setPreviewDocument({
                                    id: document.id,
                                    name: document.name
                                  })
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {documentStatus === "SIGNED"
                                ? "Preview Signed Document"
                                : documentStatus === "PENDING"
                                  ? "Preview Pending Document"
                                  : "Preview Unsigned Document"}
                            </TooltipContent>
                          </Tooltip>

                          {/* Add Signers Button */}
                          <Tooltip>
                            <TooltipTrigger>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-none border-r hover:bg-muted"
                                asChild
                              >
                                <a
                                  href={`/envelope/${envelopeId}/document/${document.id}/update-prepositioning`}
                                />
                                  <UserPlus className="h-4 w-4" />
                               
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Add Signers</TooltipContent>
                          </Tooltip>

                          {/* Disclosure trigger - only show if there are recipients or pending requests */}
                          {(docRecipients.length > 0 || hasPendingRequests) && (
                            <Tooltip>
                              <TooltipTrigger>
                                <DisclosureTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-none border-r transition-transform hover:bg-muted data-[state=open]:rotate-180"
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                </DisclosureTrigger>
                              </TooltipTrigger>
                              <TooltipContent>Show Details</TooltipContent>
                            </Tooltip>
                          )}

                          {/* Actions dropdown */}
                          <Tooltip>
                            <TooltipTrigger>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-none hover:bg-muted"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="min-w-[140px]"
                                >
                                  {/* <DropdownMenuItem className="gap-2">
																<FileText className="h-4 w-4" />
																Download{" "}
																{documentStatus === "SIGNED"
																	? "Signed"
																	: documentStatus === "PENDING"
																		? "Pending"
																		: "Unsigned"}
															</DropdownMenuItem> */}
                                  <DropdownMenuItem className="gap-2">
                                    <Share className="h-4 w-4" />
                                    Share
                                  </DropdownMenuItem>
                                  {/* <DropdownMenuItem
																className="gap-2 text-green-600 focus:text-green-600"
																asChild
															>
																<Link
																	href={`/to-sign?documentId=${document.id}&envelopeId=${envelopeId}`}
																>
																	<PenTool className="h-4 w-4" />
																	Sign Document
																</Link>
															</DropdownMenuItem> */}
                                  <DeleteDocumentDialog
                                    documentName={document.name}
                                    onConfirm={() => handleDeleteDocument(document.id)}
                                    isDeleting={deleteDocument.isPending}
                                    trigger={
                                      <DropdownMenuItem
                                        className="gap-2 text-red-600 focus:text-red-600"
                                        onSelect={(e) => e.preventDefault()}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    }
                                  />
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TooltipTrigger>
                            <TooltipContent>More Actions</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>

                    {/* Disclosure Content - Signatories and Pending Requests */}
                    {(docRecipients.length > 0 || hasPendingRequests) && (
                      <DisclosureContent>
                        <div className="border-t bg-muted/30 p-4">
                          <div className="space-y-4">
                            {/* Signatories */}
                            {docRecipients.length > 0 && (
                              <div>
                                <h4 className="mb-3 text-sm font-medium text-foreground">
                                  Signatories
                                </h4>
                                <div className="space-y-2">
                                  {docRecipients.map((recipient) => (
                                    <div
                                      key={recipient.id}
                                      className="flex items-center gap-3 rounded-lg border bg-background p-3"
                                    >
                                      <div className="rounded-full bg-blue-100 p-1.5">
                                        <User className="h-3 w-3 text-blue-600" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium">
                                          {recipient.user?.name ??
                                            recipient.name ??
                                            "Unknown User"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {recipient.role} •{" "}
                                          {recipient.user?.email ?? recipient.email}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {(() => {
                                          const status = (recipient.status ??
                                            "UNSIGNED") as RecipientStatus
                                          const recipientStatusConfig =
                                            getRecipientStatusConfig(status)
                                          return (
                                            <Badge
                                              variant={
                                                recipientStatusConfig.variant
                                              }
                                              className={`text-xs ${recipientStatusConfig.className}`}
                                            >
                                              {recipientStatusConfig.label}
                                            </Badge>
                                          )
                                        })()}
                                        {/* Copy link for placeholder recipients */}
                                        {!recipient.user?.email &&
                                          recipient.email?.includes(
                                            "placeholder"
                                          ) && (
                                            <Tooltip>
                                              <TooltipTrigger>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-7 border-blue-200 px-2 text-xs text-blue-600 hover:bg-blue-50"
                                                  onClick={() =>
                                                    handleCopyInviteLink(
                                                      recipient.name ??
                                                      recipient.email ??
                                                      "",
                                                      document.id
                                                    )
                                                  }
                                                >
                                                  <Copy className="mr-1 h-3 w-3" />
                                                  Copy Link
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                Copy invite link
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Pending Requests */}
                            {hasPendingRequests && (
                              <div>
                                <h4 className="mb-3 text-sm font-medium text-orange-800">
                                  Pending Assignment Requests
                                </h4>
                                <div className="space-y-2">
                                  {docPendingRequests?.map((request) => (
                                    <div
                                      key={request.id}
                                      className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50/50 p-3"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="rounded-full bg-orange-100 p-1.5">
                                          <User className="h-3 w-3 text-orange-600" />
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-gray-900">
                                            {request.user?.name ?? "Unknown User"}
                                          </p>
                                          <p className="text-xs text-gray-600">
                                            Requesting to be assigned to:{" "}
                                            {request.placeholderId}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 border-green-200 px-3 text-xs text-green-600 hover:bg-green-50"
                                          onClick={() =>
                                            handleAcceptRequest(request.id)
                                          }
                                          disabled={
                                            acceptRequest.isPending ||
                                            declineRequest.isPending
                                          }
                                        >
                                          ✓ Accept
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 border-red-200 px-3 text-xs text-red-600 hover:bg-red-50"
                                          onClick={() =>
                                            handleDeclineRequest(request.id)
                                          }
                                          disabled={
                                            acceptRequest.isPending ||
                                            declineRequest.isPending
                                          }
                                        >
                                          ✗ Decline
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </DisclosureContent>
                    )}
                  </Disclosure>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Document Preview Dialog */}
      {previewDocument && (
        <DocumentPreviewDialog
          isOpen={!!previewDocument}
          onClose={() => setPreviewDocument(null)}
          documentId={previewDocument.id}
          envelopeId={envelopeId}
          documentName={previewDocument.name}
        />
      )}
    </motion.div>
  )
}
