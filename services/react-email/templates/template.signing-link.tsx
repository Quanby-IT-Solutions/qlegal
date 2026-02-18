import {
	Body,
	Container,
	Head,
	Heading,
	Html,
	Link,
	Preview,
	Section,
	Text,
} from "@react-email/components"

export function SigningLinkTemplate({
	recipientName,
	documentName,
	signingLink,
	signOrderLabel,
}: {
	recipientName: string
	documentName: string
	signingLink: string
	signOrderLabel: string
}) {
	return (
		<Html>
			<Head />
			<Preview>Your document is ready for signing</Preview>
			<Body style={main}>
				<Container style={container}>
					<Heading style={h1}>Document ready for signing</Heading>

					<Text style={text}>Hello {recipientName},</Text>

					<Text style={text}>
						The document <strong>{documentName}</strong> is ready for signing.
					</Text>

					<Section style={card}>
						<Text style={label}>Signing order</Text>
						<Text style={value}>{signOrderLabel}</Text>
					</Section>

					<Section style={buttonContainer}>
						<Link href={signingLink} style={button}>
							Open signing link
						</Link>
					</Section>

					<Text style={footer}>
						If you are not the current signer, DocOnChain will show a “Previous signer(s) must sign first”
						message until it’s your turn.
					</Text>
				</Container>
			</Body>
		</Html>
	)
}

const main = {
	backgroundColor: "#f6f9fc",
	fontFamily:
		'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
	backgroundColor: "#ffffff",
	margin: "0 auto",
	padding: "20px 0 48px",
	marginBottom: "64px",
}

const h1 = {
	color: "#333",
	fontSize: "24px",
	fontWeight: "600",
	lineHeight: "40px",
	margin: "0 0 20px",
}

const text = {
	color: "#333",
	fontSize: "16px",
	lineHeight: "26px",
}

const card = {
	backgroundColor: "#f9fafb",
	border: "1px solid #e5e7eb",
	borderRadius: "8px",
	padding: "20px",
	margin: "20px 0",
}

const label = {
	color: "#6b7280",
	fontSize: "14px",
	fontWeight: "600",
	margin: "12px 0 4px",
}

const value = {
	color: "#111827",
	fontSize: "16px",
	margin: "0 0 16px",
}

const buttonContainer = {
	textAlign: "center" as const,
	margin: "32px 0",
}

const button = {
	backgroundColor: "#3b82f6",
	borderRadius: "6px",
	color: "#fff",
	fontSize: "16px",
	fontWeight: "600",
	textDecoration: "none",
	textAlign: "center" as const,
	display: "inline-block",
	padding: "12px 24px",
}

const footer = {
	color: "#6b7280",
	fontSize: "12px",
	lineHeight: "20px",
	marginTop: "32px",
	textAlign: "center" as const,
}

