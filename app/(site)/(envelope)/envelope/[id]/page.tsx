export default function Page({ params }: { params: { id: string } }) {
	return (
		<div>
			<h1>Envelope {params.id}</h1>
		</div>
	)
}
