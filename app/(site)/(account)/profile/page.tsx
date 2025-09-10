import { Navbar } from "@/features/home/components/navbar"
import ShapesContainer from "@/features/profile/components/shapes-container"

export default function Page() {
	return (
		<ShapesContainer>
			<Navbar isAuthenticated={true} />
			<main className="min-h-dvh pt-16">
				<div className="bg-background/60 rounded-lg border p-8 shadow-sm backdrop-blur">
					<h1 className="text-2xl font-semibold tracking-tight">Profile section </h1>
					<p className="text-muted-foreground mt-2 text-sm">
						Placeholder content for profile details. Scroll to see the navbar animate.
					</p>
				</div>
			</main>
		</ShapesContainer>
	)
}
