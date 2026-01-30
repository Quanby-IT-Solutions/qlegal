"use client"

import { FileText, MessageSquare } from "lucide-react"

import { RadioGroup, RadioGroupItem } from "@/core/components/ui/radio-group"
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
	FieldTitle,
} from "@/core/components/ui/field"

interface SessionTypeSelectorProps {
	value: "CONSULTATION" | "NOTARIZATION"
	onChange: (type: "CONSULTATION" | "NOTARIZATION") => void
	disabled?: boolean
	showHeading?: boolean
}

export function SessionTypeSelector({
	value,
	onChange,
	disabled = false,
	showHeading = true,
}: SessionTypeSelectorProps) {
	return (
		<div className="space-y-4">
			{showHeading && (
				<div>
					<label className="text-base font-semibold">Service Type</label>
					<p className="text-muted-foreground mt-1 text-sm">What do you need?</p>
				</div>
			)}

			<RadioGroup
				value={value}
				onValueChange={v => onChange(v as "CONSULTATION" | "NOTARIZATION")}
				disabled={disabled}
			>
				{/* Consultation */}
				<FieldLabel htmlFor="consultation-type">
					<Field
						orientation="horizontal"
						className="hover:border-primary border-2 p-4 rounded-md transition-all cursor-pointer"
						style={{
							borderColor: value === "CONSULTATION" ? "hsl(var(--primary))" : undefined,
							backgroundColor: value === "CONSULTATION" ? "hsl(var(--primary) / 0.05)" : undefined,
						}}
					>
						<FieldContent>
							<div className="flex items-center gap-2 mb-2">
								<MessageSquare className="size-5 text-indigo-600" />
								<FieldTitle>Consultation</FieldTitle>
							</div>
							<FieldDescription>Ask questions and get guidance from a notary</FieldDescription>
						</FieldContent>
						<RadioGroupItem value="CONSULTATION" id="consultation-type" disabled={disabled} />
					</Field>
				</FieldLabel>

				{/* Notarization */}
				<FieldLabel htmlFor="notarization-type">
					<Field
						orientation="horizontal"
						className="hover:border-primary border-2 p-4 rounded-md transition-all cursor-pointer"
						style={{
							borderColor: value === "NOTARIZATION" ? "hsl(var(--primary))" : undefined,
							backgroundColor: value === "NOTARIZATION" ? "hsl(var(--primary) / 0.05)" : undefined,
						}}
					>
						<FieldContent>
							<div className="flex items-center gap-2 mb-2">
								<FileText className="size-5 text-emerald-600" />
								<FieldTitle>Notarization</FieldTitle>
							</div>
							<FieldDescription>Official notarization of documents</FieldDescription>
						</FieldContent>
						<RadioGroupItem value="NOTARIZATION" id="notarization-type" disabled={disabled} />
					</Field>
				</FieldLabel>
			</RadioGroup>
		</div>
	)
}