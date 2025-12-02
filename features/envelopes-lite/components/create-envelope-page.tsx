"use client"

import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Mail, X } from "lucide-react"
import { useForm } from "react-hook-form"
import { useState } from "react"
import { toast } from "sonner"

import {
	FileUploader,
	FileUploaderDropZone,
	FileUploaderFileList,
} from "@/core/components/file-uploader"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/core/components/ui/form"
import { Input } from "@/core/components/ui/input"
import { Textarea } from "@/core/components/ui/textarea"

import { trpc } from "@/services/trpc/client"

import { createEnvelopeSchema, type CreateEnvelopeSchema } from "../api/envelope-lite-schema"

export function CreateEnvelopePage() {
	const router = useRouter()
	const [files, setFiles] = useState<File[]>([])
	
	const form = useForm<CreateEnvelopeSchema>({
		resolver: zodResolver(createEnvelopeSchema),
		defaultValues: {
			title: "",
			description: "",
		},
	})

	const createEnvelope = trpc.envelopeLite.createEnvelope.useMutation()
	const createDocuments = trpc.envelopeLite.createDocuments.useMutation()

	const handleFilesReady = (selectedFiles: File[]) => {
		setFiles(selectedFiles)
	}

	const onSubmit = (values: CreateEnvelopeSchema) => {
		// Step 1: Create the envelope
		createEnvelope.mutate(values, {
			onSuccess: async (envelopeData) => {
				if (!envelopeData || !("id" in envelopeData)) {
					toast.error("Failed to get envelope ID")
					return
				}

				const envelopeId = (envelopeData as { id: string }).id

				// Step 2: Upload documents if any files were selected
				if (files.length > 0) {
					// Upload files to storage and create document records
					const uploadedFiles = files.map(file => ({
						name: file.name,
						type: file.type,
						size: file.size,
						path: `envelopes/${envelopeId}/${file.name}`, // Storage path
					}))

					createDocuments.mutate(
						{
							envelopeId,
							files: uploadedFiles,
						},
						{
							onSuccess: () => {
								toast.success("Envelope created successfully!", {
									description: `${files.length} document(s) uploaded to the envelope.`,
								})
								form.reset()
								setFiles([])
								router.push(`/envelope/${envelopeId}`)
							},
							onError: err => {
								toast.error(err.message || "Failed to upload documents")
								// Still navigate to envelope even if document upload fails
								router.push(`/envelope/${envelopeId}`)
							},
						}
					)
				} else {
					// No files to upload, just navigate
					toast.success("Envelope created successfully!", {
						description: "You can now add documents and recipients to your envelope.",
					})
					form.reset()
					router.push(`/envelope/${envelopeId}`)
				}
			},
			onError: err => {
				toast.error(err.message || "Failed to create envelope")
			},
		})
	}

	const isPending = createEnvelope.isPending || createDocuments.isPending

	return (
		<div className="bg-muted dark:bg-background min-h-screen">
			<div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
				{/* Header */}
				<div className="mb-4 sm:mb-6">
					<h1 className="text-foreground text-2xl font-bold sm:text-3xl">Create Envelope</h1>
					<p className="text-muted-foreground mt-1.5 text-xs sm:mt-2 sm:text-sm">
						Create a new envelope and upload documents in one step
					</p>
				</div>

				{/* Form Card */}
				<Card className="mx-auto w-full">
					<CardHeader className="pb-4 sm:pb-6">
						<CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
							<Mail className="h-4 w-4 sm:h-5 sm:w-5" />
							New Envelope
						</CardTitle>
						<CardDescription className="text-xs sm:text-sm">
							Fill in the envelope details and upload documents to get started.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4 sm:space-y-6">
						<Form {...form}>
							<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
								<FormField
									control={form.control}
									name="title"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Envelope Title *</FormLabel>
											<FormControl>
												<Input
													placeholder="e.g., Contract Agreement, Employment Letter..."
													{...field}
													disabled={isPending}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="description"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Description (Optional)</FormLabel>
											<FormControl>
												<Textarea
													placeholder="Add a brief description of this envelope..."
													rows={3}
													{...field}
													disabled={isPending}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								{/* Document Upload Section */}
								<div className="space-y-2">
									<FormLabel>Documents (Optional)</FormLabel>
									<FileUploader
										maxFiles={10}
										maxSize={10 * 1024 * 1024} // 10MB
										accept={["application/pdf"]}
										onFilesReady={handleFilesReady}
									>
										<FileUploaderDropZone disabled={isPending} />
										{/* Hide the default file list, we'll show a compact version */}
										<div className="hidden">
											<FileUploaderFileList />
										</div>
									</FileUploader>
									
									{/* Compact File List */}
									{files.length > 0 && (
										<div className="mt-3 space-y-2">
											<div className="flex items-center justify-between">
												<span className="text-muted-foreground text-sm font-medium">
													{files.length} file{files.length > 1 ? "s" : ""} selected
												</span>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => setFiles([])}
													disabled={isPending}
													className="text-xs h-7"
												>
													Clear All
												</Button>
											</div>
											{/* Scrollable file list with max height */}
											<div className="border-muted max-h-[200px] space-y-1.5 overflow-y-auto rounded-md border p-2">
												{files.map((file, index) => (
													<div
														key={index}
														className="bg-muted/50 hover:bg-muted flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm transition-colors"
													>
														<div className="min-w-0 flex-1">
															<p className="truncate text-xs font-medium">{file.name}</p>
															<p className="text-muted-foreground text-xs">
																{(file.size / 1024 / 1024).toFixed(2)} MB
															</p>
														</div>
														<button
															type="button"
															onClick={() => {
																const newFiles = files.filter((_, i) => i !== index)
																setFiles(newFiles)
															}}
															disabled={isPending}
															className="text-muted-foreground hover:text-destructive shrink-0 rounded p-1 transition-colors"
															aria-label={`Remove ${file.name}`}
														>
															<X className="h-3.5 w-3.5" />
														</button>
													</div>
												))}
											</div>
										</div>
									)}
									<p className="text-muted-foreground text-xs">
										You can upload up to 10 PDF files. Maximum file size: 10MB per file.
									</p>
								</div>

								<div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end sm:gap-3">
									<Button 
										variant="outline" 
										type="button" 
										disabled={isPending} 
										onClick={() => router.back()}
										className="w-full sm:w-auto"
									>
										Cancel
									</Button>
									<Button 
										type="submit" 
										disabled={isPending} 
										size="lg"
										className="w-full sm:w-auto"
									>
										{isPending ? (
											<>
												<div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
												<span className="hidden sm:inline">
													{files.length > 0 ? "Creating Envelope & Uploading Documents..." : "Creating Envelope..."}
												</span>
												<span className="sm:hidden">
													{files.length > 0 ? "Creating..." : "Creating..."}
												</span>
											</>
										) : (
											<>
												<Mail className="mr-2 h-4 w-4" />
												<span className="hidden sm:inline">
													Create Envelope{files.length > 0 ? ` (${files.length} file${files.length > 1 ? 's' : ''})` : ''}
												</span>
												<span className="sm:hidden">
													Create{files.length > 0 ? ` (${files.length})` : ''}
												</span>
											</>
										)}
									</Button>
								</div>
							</form>
						</Form>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}

