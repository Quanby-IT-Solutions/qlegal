import { LegalRegistrationForm } from "@/features/legal-registration/components/legal-registration-form"

export default function LegalRegistrationPage() {
	return (
		<div className="container mx-auto px-4 py-8">
			<LegalRegistrationForm />
		</div>
	)
}

export const metadata = {
	title: "Legal Professional Registration - Quanby Sign",
	description: "Electronic Notarization Registration for Legal Professionals",
}
