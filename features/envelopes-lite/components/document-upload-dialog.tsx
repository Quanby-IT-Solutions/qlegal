"use client"

import { useState } from "react"
import { Upload } from "lucide-react"
import { toast } from "sonner"

import {
  FileUploader,
  FileUploaderDropZone,
  FileUploaderFileList
} from "@/core/components/file-uploader"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/core/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/core/components/ui/dialog"

import { usePresignedUrl } from "@/services/supabase/presigned-url"
import { useUploadFile } from "@/services/supabase/upload"
import { trpc } from "@/services/trpc/client"

interface DocumentUploadDialogProps {
  envelopeId: string
  onSuccess?: () => void
}

export function DocumentUploadDialog({
  envelopeId,
  onSuccess
}: DocumentUploadDialogProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState("")
  const [isOpen, setIsOpen] = useState(false)

  // Add upload hooks
  const presignedUrl = usePresignedUrl()
  const uploadFile = useUploadFile()

  const { refetch: refetchDocuments } =
    trpc.envelopeLite.getEnvelopeDocuments.useQuery(
      { envelopeId },
      { enabled: false }
    )

  const createDocuments = trpc.envelopeLite.createDocuments.useMutation({
    onSuccess: async () => {
      await refetchDocuments()
      setFiles([])
      setUploadStatus("Documents uploaded successfully!")
      toast.success("Documents uploaded successfully!")
      setIsOpen(false)
      onSuccess?.()
    },
    onError: (error) => {
      console.error("Document creation error:", error)
      setUploadStatus("Failed to upload documents. Please try again.")
      toast.error("Failed to upload documents. Please try again.")
    }
  })

  const handleFilesReady = (selectedFiles: File[]) => {
    setFiles(selectedFiles)
    setUploadStatus("")
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    setUploadStatus("Uploading files to storage...")

    try {
      // Upload each file to Supabase storage first
      const uploadedFiles = []

      for (const file of files) {
        // Generate presigned URL for upload
        const presign = await presignedUrl.mutateAsync({
          file,
          bucket: "envelopes",
          folderPath: `${envelopeId}/unsigned`,
          upsert: false
        })

        // Upload the file to Supabase
        await uploadFile.mutateAsync({
          signedUrl: presign.signedUrl,
          file
        })

        uploadedFiles.push({
          name: file.name,
          type: file.type,
          size: file.size,
          path: presign.path // Use the actual path from Supabase
        })
      }

      setUploadStatus("Creating document records...")

      // Create document records with the correct paths
      createDocuments.mutate({ envelopeId, files: uploadedFiles })
    } catch (error) {
      console.error("Upload error:", error)
      setUploadStatus("Failed to upload files. Please try again.")
      toast.error("Failed to upload files. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setFiles([])
    setUploadStatus("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="px-3 text-sm">
          <Upload className="mr-2 h-4 w-4" />
          Upload Documents
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-medium sm:text-xl">
            Upload Documents
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Select multiple PDF files to upload to this envelope.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <FileUploader
            maxFiles={10}
            maxSize={10 * 1024 * 1024} // 10MB
            accept={["application/pdf"]}
            onFilesReady={handleFilesReady}
          >
            <FileUploaderDropZone />
            <FileUploaderFileList />
          </FileUploader>

          {files.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Files Selected</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {files.map((file, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="text-xs max-w-[200px] sm:max-w-[300px] truncate"
                    >
                      {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </Badge>
                  ))}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <DialogClose asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClose}
                      disabled={uploading}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading || createDocuments.isPending}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    {uploading || createDocuments.isPending
                      ? "Uploading..."
                      : `Upload ${files.length} File(s)`}
                  </Button>
                </div>

                {uploadStatus && (
                  <p className="text-sm text-muted-foreground">
                    {uploadStatus}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
