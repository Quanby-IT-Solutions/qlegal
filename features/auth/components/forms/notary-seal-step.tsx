"use client"

import { Scale } from "lucide-react"
import { type UseFormReturn } from "react-hook-form"

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/core/components/ui/form"
import { Input } from "@/core/components/ui/input"

import { type LawyerRegisterSchema } from "@/features/auth/api/auth.schemas"

interface NotarySealStepProps {
	form: UseFormReturn<LawyerRegisterSchema>
	primaryName: string
}

export function NotarySealStep({ form, primaryName }: NotarySealStepProps) {
	const sealName = primaryName?.trim() || "No name provided yet"

	return (
		<div className="space-y-4">
			<div className="bg-muted/50 rounded-lg p-4">
				<div className="flex items-center gap-2">
					<Scale className="text-primary size-5" />
					<h3 className="font-medium">Notary Seal Information</h3>
				</div>
				<p className="text-muted-foreground mt-1 text-sm">
					This information will appear on your official notary seal.
				</p>
			</div>

			<div className="bg-muted/40 rounded-md border p-3 text-sm">
				<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
					Seal Name
				</p>
				<p className="font-medium">{sealName}</p>
				<p className="text-muted-foreground mt-1">
					This name will be displayed on your seal. Update it by editing your primary name.
				</p>
			</div>

			<FormField
				control={form.control}
				name="seal.enpRoleNumber"
				render={({ field }) => (
					<FormItem>
						<FormLabel>ENP Role Number</FormLabel>
						<FormControl>
							<Input placeholder="e.g., 123456" {...field} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		</div>
	)
}
