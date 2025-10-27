"use client"

import { useEffect } from "react"
import { LoaderIcon } from "lucide-react"

import { trpc } from "@/services/trpc/client"

import { FormResponse } from "@/features/auth/components/ui/form-response"

export function VerifyEmailForm({ token }: { token?: string }) {
	const { mutate, data, error, isPending } = trpc.auth.verifyEmail.useMutation()

	useEffect(() => {
		if (token) {
			mutate({ token })
		}
	}, [token, mutate])

	return (
		<>
			{isPending && <LoaderIcon className="mx-auto animate-spin" />}
			{!token && <FormResponse type="error" message="Invalid or missing token." />}
			<FormResponse type="error" message={error?.message} />
			<FormResponse type="success" message={data?.message} />
		</>
	)
}
