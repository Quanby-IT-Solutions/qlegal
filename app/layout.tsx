import type { Metadata } from "next"
import { Inter } from "next/font/google"

import { TRPCProvider } from "@/services/trpc/client"

import "@/core/styles/globals.css"

const inter = Inter({
	subsets: ["latin"],
})

export const metadata: Metadata = {
	title: "QSign Lite | Simple, Fast, Secure Digital Signatures",
	description:
		"QSign Lite lets you sign documents online quickly and securely. Lightweight and hassle-free.",
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en">
			<body className={`${inter.className} antialiased`}>
				<TRPCProvider>{children}</TRPCProvider>
			</body>
		</html>
	)
}
