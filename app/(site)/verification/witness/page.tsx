"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Search, Plus, UserCheck, FileText, Calendar, CheckCircle, XCircle, Clock, Edit, Trash2 } from "lucide-react"
import { format } from "date-fns"

import { trpc } from "@/services/trpc/client"
import { toast } from "sonner"
import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Badge } from "@/core/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Avatar, AvatarFallback } from "@/core/components/ui/avatar"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { AddWitnessDialog } from "@/features/witnesses/components/add-witness-dialog"

export default function WitnessManagementPage() {
	const { data: session } = useSession()
	const utils = trpc.useUtils()
	const [searchTerm, setSearchTerm] = useState("")
	const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "VERIFIED" | "REJECTED">("ALL")
	const [isAddWitnessOpen, setIsAddWitnessOpen] = useState(false)
	const [editingWitnessId, setEditingWitnessId] = useState<string | null>(null)

	// Fetch witnesses from backend
	const { data: witnesses, isLoading } = trpc.witnesses.getMyWitnesses.useQuery({
		status: statusFilter === "ALL" ? undefined : statusFilter,
		limit: 100,
		offset: 0,
	})

	// Delete mutation
	const deleteWitness = trpc.witnesses.deleteWitness.useMutation({
		onSuccess: () => {
			toast.success("Witness deleted successfully!")
			void utils.witnesses.getMyWitnesses.invalidate()
		},
		onError: (error) => {
			toast.error(error.message || "Failed to delete witness")
		},
	})

	const handleDelete = async (witnessId: string) => {
		if (confirm("Are you sure you want to delete this witness?")) {
			await deleteWitness.mutateAsync({ witnessId })
		}
	}

	const getInitials = (name: string | null | undefined): string => {
		if (!name) return "W"
		const parts: string[] = name.split(" ")
		return parts
			.map((n: string) => n[0] ?? "")
			.join("")
			.toUpperCase() || "W"
	}

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "VERIFIED":
				return <Badge variant="outline" className="text-green-600 border-green-600">Verified</Badge>
			case "PENDING":
				return <Badge variant="secondary">Pending</Badge>
			case "REJECTED":
				return <Badge variant="destructive">Rejected</Badge>
			default:
				return <Badge variant="secondary">{status}</Badge>
		}
	}

	const filteredWitnesses = (witnesses || []).filter(witness => {
		const matchesSearch = 
			witness.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			witness.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			witness.idNumber?.toLowerCase().includes(searchTerm.toLowerCase())
		// Status filtering is done on the backend, but we can also filter here for search
		return matchesSearch
	})

	return (
		<>
			<SiteNavbar 
				items={[
					{ label: "Verification", url: "/verification/witness" },
					{ label: "Witness Management", url: "/verification/witness" }
				]} 
			/>
			
			<div className="min-h-screen bg-muted/30">
				<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					{/* Header */}
					<div className="mb-8">
						<div className="flex items-center justify-between">
							<div>
								<h1 className="text-3xl font-bold tracking-tight">Witness Management</h1>
								<p className="mt-2 text-muted-foreground">
									Manage witnesses for IEN notarization sessions requiring physical witnesses
								</p>
							</div>
							<Button onClick={() => setIsAddWitnessOpen(true)}>
								<Plus className="mr-2 h-4 w-4" />
								Add Witness
							</Button>
						</div>
					</div>

					{/* Filters */}
					<Card className="mb-8">
						<CardContent className="pt-6">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<Input
									placeholder="Search witnesses by name, email, or ID number..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
								<Select 
									value={statusFilter} 
									onValueChange={(value) => setStatusFilter(value as "ALL" | "PENDING" | "VERIFIED" | "REJECTED")}
								>
									<SelectTrigger>
										<SelectValue placeholder="All Status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="ALL">All Status</SelectItem>
										<SelectItem value="VERIFIED">Verified</SelectItem>
										<SelectItem value="PENDING">Pending</SelectItem>
										<SelectItem value="REJECTED">Rejected</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</CardContent>
					</Card>

					{/* Witnesses List */}
					<Card>
						<CardHeader>
							<CardTitle>Registered Witnesses</CardTitle>
							<CardDescription>
								{isLoading ? (
									<Skeleton className="h-4 w-32" />
								) : (
									<>
										{filteredWitnesses.length} witness{filteredWitnesses.length !== 1 ? "es" : ""} found
									</>
								)}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{isLoading ? (
								<div className="space-y-4">
									{Array.from({ length: 5 }).map((_, i) => (
										<Skeleton key={i} className="h-16 w-full" />
									))}
								</div>
							) : filteredWitnesses.length === 0 ? (
								<div className="py-12 text-center">
									<UserCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
									<h3 className="text-lg font-medium mb-2">No witnesses found</h3>
									<p className="text-muted-foreground mb-4">
										{searchTerm || statusFilter !== "ALL"
											? "Try adjusting your search criteria or filters."
											: "You haven't registered any witnesses yet. Add your first witness to get started."}
									</p>
									{!searchTerm && statusFilter === "ALL" && (
										<Button onClick={() => setIsAddWitnessOpen(true)}>
											<Plus className="mr-2 h-4 w-4" />
											Add First Witness
										</Button>
									)}
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Witness</TableHead>
											<TableHead>ID Number</TableHead>
											<TableHead>Contact</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Registered</TableHead>
											<TableHead>Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredWitnesses.map((witness) => (
											<TableRow key={witness.id}>
												<TableCell>
													<div className="flex items-center gap-3">
														<Avatar className="h-10 w-10">
															<AvatarFallback>
																{getInitials(witness.name)}
															</AvatarFallback>
														</Avatar>
														<div>
															<p className="font-medium">{witness.name || "Unknown"}</p>
															<p className="text-sm text-muted-foreground">{witness.email || "No email"}</p>
														</div>
													</div>
												</TableCell>
												<TableCell>
													<span className="font-mono text-sm">{witness.idNumber || "N/A"}</span>
												</TableCell>
												<TableCell>
													<div className="text-sm">
														<p>{witness.phoneNumber || "N/A"}</p>
														<p className="text-muted-foreground">{witness.address || ""}</p>
													</div>
												</TableCell>
												<TableCell>
													{getStatusBadge(witness.status)}
												</TableCell>
												<TableCell>
													{witness.createdAt ? (
														<span className="text-sm text-muted-foreground">
															{format(new Date(witness.createdAt), "MMM dd, yyyy")}
														</span>
													) : (
														<span className="text-sm text-muted-foreground">N/A</span>
													)}
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-2">
														<Button
															variant="ghost"
															size="icon"
															onClick={() => setEditingWitnessId(witness.id)}
															title="Edit witness"
														>
															<Edit className="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															onClick={() => handleDelete(witness.id)}
															disabled={deleteWitness.isPending}
															title="Delete witness"
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Add Witness Dialog */}
			<AddWitnessDialog
				open={isAddWitnessOpen}
				onOpenChange={setIsAddWitnessOpen}
			/>
		</>
	)
}

