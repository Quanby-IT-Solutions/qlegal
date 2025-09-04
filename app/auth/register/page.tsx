import { RegisterForm } from "@/features/auth/components/forms/form.register"

export default async function RegisterPage({
	searchParams,
}: {
	searchParams: Promise<{ callbackUrl?: string }>
}) {
	const params = await searchParams
	let callbackUrl = params.callbackUrl

	if (callbackUrl && !callbackUrl.startsWith("/")) {
		callbackUrl = undefined
	}

	return <RegisterForm callbackUrl={callbackUrl} />
}
