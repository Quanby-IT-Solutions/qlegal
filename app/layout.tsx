import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { SessionProvider } from "next-auth/react"

import { Toaster } from "@/core/components/ui/sonner"
import { ThemeProvider } from "@/core/context/theme-provider"

import { auth } from "@/services/next-auth"
import { TRPCProvider } from "@/services/trpc/client"

import "@/core/styles/globals.css"

const inter = Inter({
	subsets: ["latin"],
	display: "swap",
	fallback: ["system-ui", "arial"],
})

export const metadata: Metadata = {
	title: "QSign Main | Simple, Fast, Secure Digital Signatures",
	description:
		"QSign Main lets you sign documents online quickly and securely. Lightweight and hassle-free.",
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
							<Toaster richColors closeButton />
						</ThemeProvider>
					</TRPCProvider>
				</SessionProvider>
			</body>
		</html>
	)
}
