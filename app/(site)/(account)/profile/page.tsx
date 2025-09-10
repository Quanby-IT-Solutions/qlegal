import { Navbar } from "@/features/home/components/navbar"
import ShapesContainer from "@/features/profile/components/shapes-container"

export default function Page() {
	return (
		<ShapesContainer>
			<Navbar isAuthenticated={true} />
			<div className="h-dvh pt-16">
				<h1>Profile page</h1>
			</div>
		</ShapesContainer>
	)
}
