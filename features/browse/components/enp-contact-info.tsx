import { Languages, Mail, Phone } from "lucide-react"

interface EnpContactInfoProps {
	phoneNumber?: string | null
	email?: string | null
	languages?: string[] | string | null
	className?: string
}

export function EnpContactInfo({ phoneNumber, email, languages, className }: EnpContactInfoProps) {
	const hasContactInfo = phoneNumber || email || languages

	if (!hasContactInfo) {
		return null
	}

	const languagesText = Array.isArray(languages) ? languages.join(", ") : languages

	return (
		<div className={`text-muted-foreground flex flex-wrap gap-3 text-sm ${className ?? ""}`}>
			{phoneNumber && (
				<span className="flex items-center gap-1">
					<Phone className="size-4" />
					{phoneNumber}
				</span>
			)}
			{email && (
				<span className="flex items-center gap-1">
					<Mail className="size-4" />
					{email}
				</span>
			)}
			{languagesText && (
				<span className="flex items-center gap-1">
					<Languages className="size-4" />
					{languagesText}
				</span>
			)}
		</div>
	)
}
