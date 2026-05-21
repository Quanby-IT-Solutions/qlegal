import {
	Body,
	Button,
	Container,
	Head,
	Html,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components"

interface VaultFolderShareTemplateProps {
	enpName: string
	principalName: string
	principalEmail?: string
	folderName: string
	fileCount: number
	reviewUrl: string
	note?: string
	siteUrl?: string
}

export function VaultFolderShareTemplate({
	enpName,
	principalName,
	principalEmail,
	folderName,
	fileCount,
	reviewUrl,
	note,
	siteUrl = "https://qlegal.quanbyit.com/",
}: VaultFolderShareTemplateProps) {
	return (
		<Html>
			<Head />
			<Preview>
				{principalName} shared a folder for your review: {folderName}
			</Preview>
			<Tailwind>
				<Body className="mx-auto my-auto bg-gray-100 p-4 font-sans text-gray-800">
					<Container className="mx-auto max-w-xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
						<Section
							className="py-10 text-center"
							style={{
								background: "linear-gradient(135deg, #FF5E7E 0%, #E22C9A 50%, #C300B0 100%)",
							}}
						>
							<Text className="m-0 text-lg font-bold text-white">Quanby Sign</Text>
						</Section>
						<Section className="px-8 py-8">
							<Text className="mb-2 text-base font-semibold text-gray-900">Hello {enpName},</Text>
							<Text className="mb-4 text-sm leading-relaxed text-gray-700">
								<strong>{principalName}</strong>
								{principalEmail ? (
									<>
										{" "}
										(<span style={{ color: "#6b7280" }}>{principalEmail}</span>)
									</>
								) : null}{" "}
								shared the folder <strong>{folderName}</strong> with you so you can review whether
								the documents look correct before notarization. The folder includes{" "}
								<strong>{fileCount}</strong> file{fileCount === 1 ? "" : "s"} (including
								subfolders).
							</Text>
							{note ? (
								<Text className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-gray-800">
									<span className="font-semibold">Note from sender: </span>
									{note}
								</Text>
							) : null}
							<Section className="mb-6 text-center">
								<Button
									href={reviewUrl}
									className="rounded-lg px-8 py-3 text-center text-sm font-bold text-white no-underline"
									style={{
										background: "linear-gradient(135deg, #FF5E7E 0%, #E22C9A 50%, #C300B0 100%)",
									}}
								>
									Review folder
								</Button>
							</Section>
							<Text className="text-xs leading-relaxed text-gray-500">
								You must be signed in as the notary this link was sent to. The link expires on the
								date shown on the review page. —{" "}
								<a href={siteUrl} className="text-pink-600 underline">
									Quanby Sign
								</a>
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	)
}
