"use client"

import { Check, Circle } from "lucide-react"

import { PASSWORD_REQUIREMENTS } from "@/core/lib/password-validation"
import { cn } from "@/core/lib/utils"

interface PasswordRequirementsChecklistProps {
	password: string
}

export function PasswordRequirementsChecklist({ password }: PasswordRequirementsChecklistProps) {
	if (!password) return null

	return (
		<ul className="ml-4 space-y-1">
			{PASSWORD_REQUIREMENTS.map(req => {
				const met = req.test(password)
				return (
					<li key={req.key} className="flex items-center gap-1.5">
						{met ? (
							<Check className="size-3 shrink-0 text-emerald-500" />
						) : (
							<Circle className="text-muted-foreground size-3 shrink-0" />
						)}
						<span className={cn("text-xs", met ? "text-emerald-500" : "text-muted-foreground")}>
							{req.label}
						</span>
					</li>
				)
			})}
		</ul>
	)
}
