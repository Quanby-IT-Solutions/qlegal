import { ShapesContainer } from "@/core/components/shapes-container"

import { Navbar } from "@/features/home/components/navbar"

export default function Layout(props: LayoutProps<"/">) {
	return (
		<ShapesContainer>
			<Navbar isAuthenticated />
			{props.children}
		</ShapesContainer>
	)
}
