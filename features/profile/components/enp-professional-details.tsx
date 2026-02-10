"use client"

import { useState } from "react"
import { Edit2 } from "lucide-react"

import { Button } from "@/core/components/ui/button"

import { trpc } from "@/services/trpc/client"

import { ProfessionalDetailsForm } from "./forms/form.professional-details"
import { ProfessionalDetailsSkeleton } from "./ui/enp-details-skeleton"

export function ProfessionalDetails() {
	const [isHovering, setIsHovering] = useState(false)
	const [isEditing, setIsEditing] = useState(false)

	const { data, isLoading } = trpc.profile.getEnpProfile.useQuery()

	if (isLoading) {
		return <ProfessionalDetailsSkeleton />
	}

	const currentData = {
		bio: data?.bio ?? "",
		experience: data?.experience ?? "",
		responseTime: data?.responseTime ?? "",
	}
	const rating = data?.rating ?? 0
	const totalReviews = data?.reviewCount ?? 0

	const handleEdit = () => setIsEditing(true)

	const handleCancel = () => setIsEditing(false)

	const handleSuccess = () => setIsEditing(false)

	return (
		<div
			className={`relative space-y-6 rounded-lg border-2 p-6 transition-all duration-300 ${
				isHovering || isEditing
					? "border-primary/50 bg-primary/5"
					: "border-transparent bg-transparent"
			}`}
			onMouseEnter={() => setIsHovering(true)}
			onMouseLeave={() => setIsHovering(false)}
		>
			{/* Edit Button */}
			{!isEditing && (
				<div className="absolute top-4 right-4">
					<Button
						size="sm"
						variant="ghost"
						onClick={handleEdit}
						className="text-muted-foreground hover:bg-primary/10 hover:text-primary h-8 w-8 p-0"
						aria-label="Edit profile"
					>
						<Edit2 className="size-4" />
					</Button>
				</div>
			)}

			{/* Edit Form or Display Mode */}
			{isEditing ? (
				<ProfessionalDetailsForm
					bio={currentData.bio}
					experience={currentData.experience}
					responseTime={currentData.responseTime}
					onCancel={handleCancel}
					onSuccess={handleSuccess}
				/>
			) : (
				<>
					{/* BIO */}
					<div className="pt-4">
						<h4 className="text-foreground mb-2 font-semibold">Bio</h4>
						<p className="text-muted-foreground text-sm leading-relaxed">
							{currentData.bio || <span className="italic">No bio added yet.</span>}
						</p>
					</div>

					{/* Experience Badge */}
					<div>
						<h4 className="text-foreground mb-3 font-semibold">Experience</h4>
						{currentData.experience ? (
							<span className="bg-primary/10 text-primary inline-block rounded-full px-4 py-2 text-sm font-semibold">
								{currentData.experience}
							</span>
						) : (
							<span className="text-muted-foreground text-sm italic">No experience listed.</span>
						)}
					</div>

					{/* Response Time */}
					<div>
						<h4 className="text-foreground mb-2 font-semibold">Response Time</h4>
						<p className="text-muted-foreground text-sm">
							{currentData.responseTime || <span className="italic">Not specified.</span>}
						</p>
					</div>

					{/* Rating with Stars (Read-only) */}
					<div>
						<h4 className="text-foreground mb-3 font-semibold">Rating</h4>
						<div className="flex items-center gap-2">
							<div className="flex gap-1">
								{[...Array<number>(5)].map((_, i) => (
									<span
										key={i}
										className={`text-lg ${
											i < Math.floor(rating)
												? "text-yellow-400"
												: i < rating
													? "text-yellow-400 opacity-50"
													: "text-muted-foreground"
										}`}
									>
										★
									</span>
								))}
							</div>
							<span className="text-foreground text-sm font-medium">{rating}</span>
							<span className="text-muted-foreground text-xs">({totalReviews} review/s)</span>
						</div>
					</div>
				</>
			)}
		</div>
	)
}
