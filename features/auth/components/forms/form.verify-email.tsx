"use client"

import { LoaderIcon } from "lucide-react"

import { trpc } from "@/services/trpc/client"

import { FormResponse } from "@/features/auth/components/ui/form-response"

export function VerifyEmailForm({ token }: { token?: string }) {
	const { mutate, data, error, isPending } = trpc.auth.verifyEmail.useMutation()

	return (
		<>
			{isPending && <LoaderIcon className="animate-spin" />}
			<FormResponse type="error" message={formError} />
			<FormResponse type="success" message={formSuccess} />
		</>
	)
}
