import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia } from "@/core/components/ui/item"
import { Separator } from "@/core/components/ui/separator"
import { Skeleton } from "@/core/components/ui/skeleton"

function EventCardSkeleton() {
	return (
		<Item variant="outline" size="sm" className="hover:bg-muted/50">
			<ItemMedia>
				<Skeleton className="size-8 rounded-full" />
			</ItemMedia>
			<ItemContent className="min-w-0">
				<div className="flex items-center gap-1.5">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-4 w-16 rounded-full" />
				</div>
				<Skeleton className="h-3 w-24" />
				<Skeleton className="h-3 w-20" />
			</ItemContent>
			<ItemActions>
				<Skeleton className="h-8 w-16" />
				<Skeleton className="h-8 w-20" />
			</ItemActions>
		</Item>
	)
}

export function EventListSkeleton() {
	return (
		<Card className="order-first col-span-1 lg:order-0 lg:col-span-1 lg:flex lg:max-h-[calc(100vh-12rem)] lg:flex-col">
			<CardHeader className="shrink-0">
				<div>
					<CardTitle>
						<Skeleton className="h-7 w-40" />
					</CardTitle>
					<CardDescription>
						<Skeleton className="h-4 w-32" />
					</CardDescription>
				</div>
				<CardAction>
					<Skeleton className="h-9 w-24" />
				</CardAction>
			</CardHeader>
			<Separator />
			<CardContent className="min-h-0 flex-1 overflow-y-auto">
				<ItemGroup>
					{Array.from({ length: 4 }, (_, index) => (
						<EventCardSkeleton key={index} />
					))}
				</ItemGroup>
			</CardContent>
		</Card>
	)
}
