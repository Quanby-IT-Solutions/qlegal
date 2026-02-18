import { PageHeader } from "@/core/components/navbar/page-header"
import { Skeleton } from "@/core/components/ui/skeleton"

export default function Loading() {
	return (
		<div className="flex flex-1 flex-col">
			<PageHeader items={[{ label: "Appointments", href: "/appointments" }]} />
			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="mx-auto max-w-7xl space-y-8">
					<div className="space-y-2">
						<Skeleton className="h-9 w-56" />
						<Skeleton className="h-5 w-72" />
					</div>

					<div className="space-y-4">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-64 w-full" />
					</div>
				</div>
			</main>
		</div>
	)
}
