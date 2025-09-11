"use client"

import { FileText } from "lucide-react"

import { Card, CardContent } from "@/core/components/ui/card"

interface DocumentListWithDisclosureProps {
  documents: Array<{
    id: string
    name: string
    status: string
    createdAt: Date
  }>
  envelopeId: string
}

export function DocumentListWithDisclosure({
  documents,
  envelopeId
}: DocumentListWithDisclosureProps) {
  return (
    <div className="space-y-4">
      {documents.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-lg font-medium text-muted-foreground mb-2">
            No documents yet
          </div>
          <p className="text-sm text-muted-foreground">
            Document management features coming soon!
          </p>
        </div>
      ) : (
        documents.map((document) => (
          <Card key={document.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-muted p-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-medium">
                            {document.name}
                          </h3>
                        <p className="text-xs text-muted-foreground">
                    Status: {document.status} • Created: {document.createdAt.toLocaleDateString()}
                                          </p>
                                        </div>
                                      </div>
                </CardContent>
              </Card>
        ))
      )}
    </div>
  )
}
