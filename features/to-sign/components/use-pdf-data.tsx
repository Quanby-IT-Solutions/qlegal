"use client"

import { useEffect, useMemo } from "react"

import { trpc } from "@/services/trpc/client"

interface UsePdfDataOptions {
	documentId: string | null
	useProxy?: boolean
	enabled?: boolean
}

interface PdfData {
	url: string
	blob?: Blob
}

export function usePdfData({
	documentId,
	useProxy = true,
	enabled = true
}: UsePdfDataOptions) {
	// Query for PDF proxy data with proper type safety
	const pdfProxyQuery = trpc.toSign.getPdfProxy.useQuery(
		{ documentId: documentId! },
		{
			enabled: enabled && Boolean(documentId) && useProxy,
			staleTime: 5 * 60 * 1000, // 5 minutes
			gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
			retry: 2
		}
	)

	// Convert base64 data to blob URL when available
	const pdfData: PdfData | null = useMemo(() => {
		if (!useProxy) {
			return documentId ? { url: documentId } : null
		}

		if (!pdfProxyQuery.data) {
			return null
		}

		try {
			// Convert base64 to blob
			const binaryString = atob(pdfProxyQuery.data.data)
			const bytes = new Uint8Array(binaryString.length)
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i)
			}

			const blob = new Blob([bytes], { type: "application/pdf" })
			const url = URL.createObjectURL(blob)

			return { url, blob }
		} catch (error) {
			console.error("Failed to convert PDF data:", error)
			return null
		}
	}, [pdfProxyQuery.data, useProxy, documentId])

	// Cleanup blob URL on unmount or data change
	useEffect(() => {
		return () => {
			if (pdfData?.url?.startsWith("blob:")) {
				URL.revokeObjectURL(pdfData.url)
			}
		}
	}, [pdfData?.url])

	return {
		data: pdfData,
		isLoading: useProxy ? pdfProxyQuery.isLoading : false,
		error: useProxy ? pdfProxyQuery.error : null,
		isError: useProxy ? pdfProxyQuery.isError : false
	}
}
