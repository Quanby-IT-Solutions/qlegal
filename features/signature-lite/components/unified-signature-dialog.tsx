"use client"

import React, { useEffect, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Calendar, CheckCircle, Mail, PenTool, Type, User } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/core/components/ui/form"
import { Input } from "@/core/components/ui/input"
import { ScrollArea } from "@/core/components/ui/scroll-area"

import { trpc } from "@/services/trpc/client"

import { useUserDefaultSignature } from "../hooks/useUserDefaultSignature"
import { SignaturePad, type SignaturePadRef } from "./signature-pad"

// Field type interface
interface FieldToSign {
	id: string
	type: string
	label: string
	required: boolean
	position: {
		x: number
		y: number
		pageNumber: number
	}
	size: {
		width: number
		height: number
	}
	placeholder?: string
	options?: string[]
	signed: boolean
	signatureValue?: string
}

// Document interface
interface DocumentToSign {
	id: string
	name: string
	url: string
	envelope: {
		id: string
		title: string
		status: string
	}
	fields: FieldToSign[]
}

interface UnifiedSignatureDialogProps {
	document: DocumentToSign | null
	currentField: FieldToSign | null
	open: boolean
	onOpenChange: (open: boolean) => void
	onFieldSigned: (fieldId: string, signatureData: unknown) => void
}

// Dynamic form schema based on field type
const createFieldSchema = (fieldType: string, required: boolean) => {
	let schema = z.string()

	// For signature fields, never make them required at the form level
	// We handle signature validation with custom logic
	if (fieldType === "SIGNATURE") {
		return z.string() // No min validation for signatures
	}

	if (required) {
		schema = schema.min(1, "This field is required")
	}

	if (fieldType === "EMAIL") {
		schema = schema.email("Please enter a valid email address")
	}

	return schema
}

export function UnifiedSignatureDialog({
	document,
	currentField,
	open,
	onOpenChange,
	onFieldSigned,
}: UnifiedSignatureDialogProps) {
	// Simplified validation for signature fields
	const [isSignatureValid, setIsSignatureValid] = useState(false)

	// Get user's default signature from database only
	const { defaultSignature: userDefaultSignature } = useUserDefaultSignature()

	const signaturePadRef = useRef<SignaturePadRef>(null)

	// Dynamic form schema
	const formSchema = z.object({
		value: currentField ? createFieldSchema(currentField.type, currentField.required) : z.string(),
	})

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			value: currentField?.signatureValue ?? "",
		},
	})

	// Listen for signature changes and update validation state
	useEffect(() => {
		if (currentField?.type !== "SIGNATURE" || !signaturePadRef.current) {
			setIsSignatureValid(true) // Non-signature fields are always valid here
			return
		}

		// Initial validation check
		const isEmpty = signaturePadRef.current.isEmpty()
		const signatureType = signaturePadRef.current.getSignatureType()
		const isValid = !isEmpty && signatureType !== null
		setIsSignatureValid(isValid)
	}, [currentField])

	// Add a separate effect to re-validate when the dialog opens
	useEffect(() => {
		if (open && currentField?.type === "SIGNATURE" && signaturePadRef.current) {
			// Small delay to ensure the signature pad is fully initialized
			setTimeout(() => {
				if (signaturePadRef.current) {
					const isEmpty = signaturePadRef.current.isEmpty()
					const signatureType = signaturePadRef.current.getSignatureType()
					const isValid = !isEmpty && signatureType !== null
					setIsSignatureValid(isValid)
				}
			}, 100)
		}
	}, [open, currentField])

	// Sign field mutation
	const signFieldMutation = trpc.signatureLite.signField.useMutation({
		onSuccess: () => {
			toast.success("Field signed successfully!")
			onFieldSigned(currentField?.id ?? "", null)
			handleClose()
		},
		onError: error => {
			toast.error(error.message)
		},
	})

	// Get field icon based on type
	const getFieldIcon = (type: string) => {
		switch (type) {
			case "SIGNATURE":
				return <PenTool className="h-4 w-4" />
			case "NAME":
				return <User className="h-4 w-4" />
			case "DATE":
				return <Calendar className="h-4 w-4" />
			case "EMAIL":
				return <Mail className="h-4 w-4" />
			case "TEXT":
				return <Type className="h-4 w-4" />
			default:
				return <Type className="h-4 w-4" />
		}
	}

	// Get field input component based on type
	const getFieldInput = () => {
		if (!currentField) return null

		const commonProps = {
			placeholder: currentField.placeholder ?? `Enter your ${currentField.label.toLowerCase()}`,
			className: "text-base sm:text-lg",
		}

		switch (currentField.type) {
			case "DATE":
				return (
					<Input
						{...commonProps}
						type="date"
						defaultValue={new Date().toISOString().split("T")[0]}
					/>
				)
			case "EMAIL":
				return <Input {...commonProps} type="email" placeholder="your.email@example.com" />
			case "SIGNATURE":
				return (
					<div className="space-y-4">
						<SignaturePad
							ref={signaturePadRef}
							userDefaultSignature={userDefaultSignature}
							onSignatureChange={hasSignature => {
								console.log("onSignatureChange called:", { hasSignature })

								// Update validation state - check both hasSignature and signature type
								if (signaturePadRef.current) {
									const signatureType = signaturePadRef.current.getSignatureType()
									const isEmpty = signaturePadRef.current.isEmpty()

									console.log("Signature validation check:", {
										hasSignature,
										signatureType,
										isEmpty,
									})

									// Valid only if has signature AND has a valid type (not null)
									const isValid = hasSignature && signatureType !== null
									setIsSignatureValid(isValid)

									console.log("Setting isSignatureValid to:", isValid)
								} else {
									setIsSignatureValid(hasSignature)
								}

								// Update form value when signature changes
								if (hasSignature && signaturePadRef.current) {
									const signatureData = signaturePadRef.current.getSignatureData()
									const signatureText = signaturePadRef.current.getSignatureText()

									// For uploaded images, prioritize the signature data (base64)
									const finalValue = signatureData ?? signatureText ?? ""

									form.setValue("value", finalValue)
									// Clear any validation errors
									form.clearErrors("value")
									// Trigger validation
									void form.trigger("value")
								} else {
									form.setValue("value", "")
									void form.trigger("value")
								}

								// Force re-render by updating a dependency
								// This ensures validation state is recalculated
								void form.trigger("value")
							}}
							className="min-h-[120px] w-full sm:min-h-[150px]"
						/>
					</div>
				)
			default:
				return <Input {...commonProps} />
		}
	}

	// Handle form submission
	const onSubmit = async (values: z.infer<typeof formSchema>) => {
		if (!currentField) return

		// Enhanced validation for signature fields
		if (currentField.type === "SIGNATURE" && currentField.required) {
			// Check both isSignatureValid state and signature type
			if (!isSignatureValid) {
				toast.error("Please provide a signature using any method (draw, type, upload, or default)")
				return
			}

			// Additional check: ensure we have a valid signature type
			if (signaturePadRef.current) {
				const signatureType = signaturePadRef.current.getSignatureType()
				if (!signatureType) {
					toast.error("Please activate your signature by clicking the appropriate button")
					return
				}
			}
		}

		let finalSignatureData

		// For signature fields, include signature metadata
		if (currentField.type === "SIGNATURE" && signaturePadRef.current) {
			const signatureData = signaturePadRef.current.getSignatureData()
			const signatureText = signaturePadRef.current.getSignatureText()
			const signatureType = signaturePadRef.current.getSignatureType()

			// Map signature types to expected format
			let mappedType: "drawn" | "typed" | "uploaded" | "default" = "typed"
			if (signatureType === "drawn") mappedType = "drawn"
			else if (signatureType === "uploaded") mappedType = "uploaded"
			else if (signatureType === "typed") mappedType = "typed"
			else if (signatureType === "default") mappedType = "default" // Default signatures keep their type

			// Use form value if it's available and contains image data (for uploads)
			const finalValue = signatureData ?? signatureText ?? values.value

			// Final validation: ensure we have actual signature content
			if (!finalValue || finalValue.trim() === "") {
				toast.error("No signature data available. Please create a signature first.")
				return
			}

			finalSignatureData = {
				type: mappedType,
				value: finalValue,
				ipAddress: "127.0.0.1",
				userAgent: navigator.userAgent,
			}
		} else {
			finalSignatureData = {
				type: "typed" as const,
				value: values.value,
				ipAddress: "127.0.0.1",
				userAgent: navigator.userAgent,
			}
		}

		console.log("🔍 Submitting signature with data:", {
			fieldId: currentField.id,
			signatureData: finalSignatureData,
			currentField: currentField,
		})

		try {
			await signFieldMutation.mutateAsync({
				fieldId: currentField.id,
				signatureData: finalSignatureData,
			})
		} catch (error) {
			console.error("🔍 Error in signField mutation:", error)
			// Error handled by mutation
		}
	}

	// Handle close
	const handleClose = () => {
		form.reset()
		onOpenChange(false)
	}

	// Reset form when field changes
	useEffect(() => {
		if (currentField) {
			form.reset({
				value: currentField.signatureValue ?? "",
			})
		}
	}, [currentField, form])

	if (!currentField) return null

	// For signature fields, use the signature pad validation state
	// For other fields, check form value
	const formValue = form.watch("value")
	const hasValidSignature = currentField?.type === "SIGNATURE" ? isSignatureValid : !!formValue

	const canSubmit = hasValidSignature || !currentField?.required

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="max-h-[95vh] w-[95vw] max-w-2xl gap-4 overflow-hidden p-4 sm:p-6">
				<DialogHeader className="pb-4 sm:pb-6">
					<div className="mb-2 flex items-center gap-2 sm:gap-3">
						<div className="from-primary/80 to-primary rounded-lg bg-gradient-to-r p-1.5 sm:p-2">
							{getFieldIcon(currentField.type)}
						</div>
						<DialogTitle className="text-lg font-bold sm:text-2xl">
							{currentField.label}
						</DialogTitle>
					</div>
					<DialogDescription className="text-sm sm:text-base">
						Enter your {currentField.label.toLowerCase()} for &quot;
						{document?.name}&quot;
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="max-h-[60vh] overflow-y-auto pr-2 sm:pr-4">
					<div className="space-y-4 pr-1 sm:space-y-8 sm:pr-2">
						<Form {...form}>
							<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-8">
								{/* Input Field */}
								<Card className="border-primary/20 border-2 shadow-lg">
									<CardHeader className="from-primary/5 to-primary/10 bg-gradient-to-r pb-3 sm:pb-4">
										<CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
											{getFieldIcon(currentField.type)}
											{currentField.label}
											{currentField.type === "SIGNATURE" && (
												<div className="ml-auto flex items-center gap-2">
													{isSignatureValid ? (
														<div className="flex items-center gap-1 text-green-600">
															<CheckCircle className="h-4 w-4" />
															<span className="text-xs font-medium">Valid</span>
														</div>
													) : currentField.required ? (
														<div className="flex items-center gap-1 text-amber-600">
															<div className="h-4 w-4 rounded-full border-2 border-amber-600" />
															<span className="text-xs font-medium">Required</span>
														</div>
													) : (
														<div className="flex items-center gap-1 text-gray-500">
															<div className="h-4 w-4 rounded-full border-2 border-gray-300" />
															<span className="text-xs font-medium">Optional</span>
														</div>
													)}
												</div>
											)}
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-3">
										<FormField
											control={form.control}
											name="value"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-sm font-medium sm:text-base">
														{currentField.label}
														{currentField.required && <span className="ml-1 text-red-500">*</span>}
													</FormLabel>
													<FormControl>
														<div>
															{React.cloneElement(getFieldInput() ?? <Input />, {
																...field,
																onChange: (e: unknown) => {
																	// Handle the change event
																	if (currentField?.type === "SIGNATURE") {
																		// For signature fields, the value will be updated by the SignaturePad callback
																		// Don't override it here
																	} else {
																		// For other field types, handle normally
																		if (typeof e === "object" && e && "target" in e) {
																			const target = e.target as HTMLInputElement
																			field.onChange(target.value)
																		}
																	}
																},
															})}
														</div>
													</FormControl>
													{/* Enhanced validation message for signature fields */}
													{currentField?.type === "SIGNATURE" ? (
														<div className="mt-3">
															{!isSignatureValid && currentField.required ? (
																<div className="rounded-md border border-amber-200 bg-amber-50 p-3">
																	<div className="flex items-center gap-2">
																		<div className="h-2 w-2 rounded-full bg-amber-500" />
																		<p className="text-sm font-medium text-amber-800">
																			Please provide a signature using any method
																		</p>
																	</div>
																	<p className="mt-1 text-xs text-amber-700">
																		You can draw, type, upload an image, or use your default
																		signature
																	</p>
																</div>
															) : isSignatureValid ? (
																<div className="rounded-md border border-green-200 bg-green-50 p-3">
																	<div className="flex items-center gap-2">
																		<CheckCircle className="h-4 w-4 text-green-600" />
																		<p className="text-sm font-medium text-green-800">
																			Signature ready to apply
																		</p>
																	</div>
																</div>
															) : null}
														</div>
													) : (
														<FormMessage />
													)}
												</FormItem>
											)}
										/>
									</CardContent>
								</Card>

								{/* Field Info */}
								<Card className="bg-muted/50 shadow-sm">
									<CardContent className="pt-4 sm:pt-6">
										<div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:gap-4">
											<div>
												<span className="text-foreground font-medium">Type:</span>
												<span className="ml-2 capitalize">{currentField.type.toLowerCase()}</span>
											</div>
											<div>
												<span className="text-foreground font-medium">Required:</span>
												<span className="ml-2">{currentField.required ? "Yes" : "No"}</span>
											</div>
											<div>
												<span className="text-foreground font-medium">Page:</span>
												<span className="ml-2">{currentField.position.pageNumber}</span>
											</div>
											<div>
												<span className="text-foreground font-medium">Status:</span>
												<span
													className={`ml-2 ${currentField.signed ? "text-green-600" : "text-orange-600"}`}
												>
													{currentField.signed ? "Signed" : "Pending"}
												</span>
											</div>
										</div>
									</CardContent>
								</Card>

								{/* Action Buttons */}
								<div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:pt-6">
									<Button
										type="button"
										variant="outline"
										onClick={handleClose}
										className="w-full sm:w-auto"
									>
										Cancel
									</Button>

									<Button
										type="submit"
										disabled={signFieldMutation.isPending || !canSubmit}
										className={`w-full transition-all duration-200 sm:w-auto ${
											canSubmit && !signFieldMutation.isPending
												? "bg-primary hover:bg-primary/90"
												: ""
										}`}
									>
										{signFieldMutation.isPending ? (
											<>
												<div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
												Applying Signature...
											</>
										) : !canSubmit ? (
											<>
												<div className="mr-2 h-4 w-4 rounded-full border-2 border-gray-400" />
												{currentField.type === "SIGNATURE" ? "Provide Signature" : "Complete Field"}
											</>
										) : (
											<>
												<CheckCircle className="mr-2 h-4 w-4" />
												{currentField.type === "SIGNATURE" ? "Apply Signature" : "Submit Field"}
											</>
										)}
									</Button>
								</div>
							</form>
						</Form>
					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	)
}
