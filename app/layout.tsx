import type { Metadata } from "next"
import { Inter } from "next/font/google"

import { TRPCProvider } from "@/services/trpc/client"

import "@/core/styles/globals.css"

import { SessionProvider } from "next-auth/react"

import { ThemeProvider } from "@/core/context/theme-provider"

import { auth } from "@/services/next-auth"

const inter = Inter({
	subsets: ["latin"],
})

export const metadata: Metadata = {
	title: "QSign Lite | Simple, Fast, Secure Digital Signatures",
	description:
		"QSign Lite lets you sign documents online quickly and securely. Lightweight and hassle-free.",
}

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const session = await auth()

	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${inter.className} antialiased`}>
				<SessionProvider session={session}>
					<TRPCProvider>
						<ThemeProvider
							attribute="class"
							defaultTheme="system"
							enableSystem
							disableTransitionOnChange
						>
							{children}
						</ThemeProvider>
					</TRPCProvider>
				</SessionProvider>
			</body>
		</html>
	)
}
