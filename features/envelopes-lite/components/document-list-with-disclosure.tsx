"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, FileText, MoreVertical } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader } from "@/core/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/core/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/core/components/ui/dropdown-menu"
import { Badge } from "@/core/components/ui/badge"

interface DocumentListWithDisclosureProps {
  documents: Array<{
    id: string
    name: string
    type: string
    size: number
    path: string
    status: string
    createdAt: Date
  }>
  envelopeId: string
}

export function DocumentListWithDisclosure({
  documents,
  envelopeId: _envelopeId
}: DocumentListWithDisclosureProps) {
  const [openDocuments, setOpenDocuments] = useState<Set<string>>(new Set())

  const toggleDocument = (documentId: string) => {
    setOpenDocuments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(documentId)) {
        newSet.delete(documentId)
      } else {
        newSet.add(documentId)
      }
      return newSet
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) {
      return "0 Bytes"
    }
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "UPLOADED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "PROCESSING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "READY":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "ERROR":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  if (documents.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="text-lg font-medium text-muted-foreground mb-2">
          No documents yet
        </div>
        <p className="text-sm text-muted-foreground">
          Upload documents to get started with this envelope.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
        {documents.map((document) => {
        const isOpen = openDocuments.has(document.id)

          return (
          <Card key={document.id} className="overflow-hidden">
            <Collapsible open={isOpen} onOpenChange={() => toggleDocument(document.id)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    
                      <div className="rounded-lg bg-muted p-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                    
                      <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-medium">
                            {document.name}
                          </h3>
                      <div className="flex items-center gap-2 mt-1">
                            <Badge
                          variant="secondary" 
                          className={`text-xs ${getStatusColor(document.status)}`}
                            >
                          {document.status}
                            </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(document.size)} • {document.type}
                        </span>
                      </div>
                    </div>
                          </div>
                  
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        View Document
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Download
                                  </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Remove
                                      </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                </div>
              </CardHeader>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-muted-foreground">Created:</span>
                        <p>{document.createdAt.toLocaleDateString()}</p>
                        </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Path:</span>
                        <p className="truncate font-mono text-xs">{document.path}</p>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          Document Actions
                        </span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            Preview
                                                </Button>
                          <Button variant="outline" size="sm">
                            Sign
                                        </Button>
                                      </div>
                                    </div>
                          </div>
                        </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
              </Card>
        )
      })}
    </div>
  )
}
