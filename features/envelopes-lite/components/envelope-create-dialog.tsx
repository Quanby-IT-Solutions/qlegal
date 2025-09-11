"use client"

import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from "@/core/components/ui/dialog"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from "@/core/components/ui/form"
import { Input } from "@/core/components/ui/input"
import { Textarea } from "@/core/components/ui/textarea"

import { trpc } from "@/services/trpc/client"

import {
	createEnvelopeSchema,
	type CreateEnvelopeSchema
} from "../api/envelope-lite-schema"

export function EnvelopeCreateDialog() {
	const form = useForm({
		resolver: zodResolver(createEnvelopeSchema),
		defaultValues: {
			title: "",
			description: ""
		}
	})

	const router = useRouter()

	const { mutate, isPending } = trpc.envelopeLite.createEnvelope.useMutation({
		onSuccess: (data) => {
			toast.info("Envelope created successfully!", {
				description: "You can now manage your envelope."
			})
			form.reset()
			if (data && 'id' in data) {
				router.push(`/envelope/${(data as { id: string }).id}`)
			}
		},
		onError: (err) => toast.info(err.message)
	})

	const onSubmit = (values: CreateEnvelopeSchema) => mutate(values)

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button className="px-3 text-sm">
					<PlusIcon />
					New Envelope
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="text-lg font-medium">
						Create New Envelope
					</DialogTitle>
					<DialogDescription>
						Create a new envelope for digital signatures and document
						management.
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="title"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Title</FormLabel>
									<FormControl>
										<Input
											placeholder="Enter title..."
											className="bg-muted/60"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Add a description... (optional)"
											className="bg-muted/60"
											rows={3}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex justify-end gap-2 pt-4">
							<DialogClose asChild>
								<Button
									variant="outline"
									size="sm"
									type="button"
									className="h-8 px-3 text-sm"
									onClick={() => form.reset()}
								>
									Cancel
								</Button>
							</DialogClose>
							<Button size="sm" type="submit" className="h-8 px-3 text-sm">
								{isPending ? (
									<div className="flex items-center gap-2">
										<div className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white"></div>
										Creating...
									</div>
								) : (
									"Create"
								)}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
