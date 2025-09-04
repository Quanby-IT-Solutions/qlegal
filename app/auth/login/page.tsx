import { LoginForm } from "@/features/auth/components/forms/form.login"

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ callbackUrl?: string }>
}) {
	const { callbackUrl } = await searchParams

	return <LoginForm callbackUrl={callbackUrl} />
}
