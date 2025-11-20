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

interface NotarizationRequestTemplateProps {
	enpName: string
	principalName: string
	requestTitle: string
	requestDescription?: string
	workflow: "REN" | "IEN"
	priority: "NORMAL" | "HIGH" | "URGENT"
	requestUrl: string
}

export function NotarizationRequestTemplate({
	enpName,
	principalName,
	requestTitle,
	requestDescription,
	workflow,
	priority,
	requestUrl,
}: NotarizationRequestTemplateProps) {
	const priorityLabels = {
		NORMAL: "Normal",
		HIGH: "High",
		URGENT: "Urgent",
	}

	const workflowLabels = {
		REN: "Remote Electronic Notarization (REN)",
		IEN: "In-Person Electronic Notarization (IEN)",
	}

	return (
		<Html>
			<Head />
			<Preview>New notarization request from {principalName}</Preview>
			<Body style={main}>
				<Container style={container}>
					<Heading style={h1}>New Notarization Request</Heading>
					
					<Text style={text}>
						Hello {enpName},
					</Text>
					
					<Text style={text}>
						You have received a new notarization request from <strong>{principalName}</strong>.
					</Text>

					<Section style={card}>
						<Text style={label}>Request Title:</Text>
						<Text style={value}>{requestTitle}</Text>

						{requestDescription && (
							<>
								<Text style={label}>Description:</Text>
								<Text style={value}>{requestDescription}</Text>
							</>
						)}

						<Text style={label}>Workflow Type:</Text>
						<Text style={value}>{workflowLabels[workflow]}</Text>

						<Text style={label}>Priority:</Text>
						<Text style={value}>{priorityLabels[priority]}</Text>
					</Section>

					<Section style={buttonContainer}>
						<Link href={requestUrl} style={button}>
							View Request
						</Link>
					</Section>

					<Text style={footer}>
						This is an automated notification from Quanby Sign. Please log in to your account to review and respond to this request.
					</Text>
				</Container>
			</Body>
		</Html>
	)
}

const main = {
	backgroundColor: "#f6f9fc",
	fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
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

