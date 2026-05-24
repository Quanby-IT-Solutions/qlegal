import type { Metadata } from "next"
import { Inter } from "next/font/google"

import { CookieConsent } from "@/core/components/blocks/cookie-consent"
import { Toaster } from "@/core/components/ui/sonner"
import { AuthSessionProvider } from "@/core/context/auth-session-provider"
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
	title: "QLegal | Electronic notarial platform",
	description:
		"Expert legal consultation and seamless digital notarization for secure, hassle-free document handling.",
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
				<AuthSessionProvider session={session}>
					<TRPCProvider>
						<ThemeProvider
							attribute="class"
							defaultTheme="system"
							enableSystem
							disableTransitionOnChange
						>
							{children}
							<CookieConsent
								variant="default"
								position="bottom-right"
								glass
								learnMoreHref="/auth/privacy-policy"
							/>
							<Toaster richColors closeButton />
						</ThemeProvider>
					</TRPCProvider>
				</AuthSessionProvider>
			</body>
		</html>
	)
}
