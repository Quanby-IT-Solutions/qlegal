import { Navbar } from "@/features/home/components/navbar"
import ShapesContainer from "@/features/profile/components/shapes-container"

export default function Page() {
	return (
		// <div className="from-background via-background to-muted/20 flex flex-col bg-gradient-to-br">

		<ShapesContainer>
			<Navbar isAuthenticated={true} />
			<div className="mt-16 bg-green-800">
				<h1>Profile page</h1>
			</div>
		</ShapesContainer>
		// </div>
	)
}
