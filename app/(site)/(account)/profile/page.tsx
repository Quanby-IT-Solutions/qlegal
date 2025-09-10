import { Navbar } from "@/features/home/components/navbar"
import ShapesContainer from "@/features/profile/components/shapes-container"

export default function Page() {
	return (
		<div className="from-background via-background to-muted/20 flex flex-col bg-gradient-to-br">
			<Navbar isAuthenticated={true} />

			<ShapesContainer>
				<h1>Profile page</h1>
			</ShapesContainer>
		</div>
	)
}
