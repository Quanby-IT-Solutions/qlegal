"use client"

import { useParams } from "next/navigation"

import { VaultShareEnpView } from "@/features/principal-vault/components/vault-share-enp-view"

export default function VaultSharePage() {
	const params = useParams()
	const raw = params.token
	const token = typeof raw === "string" ? raw : Array.isArray(raw) ? (raw[0] ?? "") : ""

	return <VaultShareEnpView token={token} />
}
