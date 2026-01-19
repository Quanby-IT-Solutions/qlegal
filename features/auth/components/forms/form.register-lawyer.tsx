"use client"

import { type Route } from "next"
import { zodResolver } from "@hookform/resolvers/zod"
import { Scale } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/core/components/ui/button"
import { Checkbox } from "@/core/components/ui/checkbox"
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/core/components/ui/form"
import { Input } from "@/core/components/ui/input"
import { InputPassword } from "@/core/components/ui/input-password"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { defineStepper } from "@/core/components/ui/stepper"
import { Textarea } from "@/core/components/ui/textarea"
import { cn } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"

import { lawyerRegisterSchema, type LawyerRegisterSchema } from "@/features/auth/api/auth.schemas"
import { FormResponse } from "@/features/auth/components/ui/form-response"

// Define the stepper with steps
const { useStepper, steps, Stepper } = defineStepper(
	{ id: "account", title: "Account Info", description: "Basic account details" },
	{ id: "seal", title: "Notary Seal", description: "ENP seal information" },
	{ id: "notary", title: "Credentials", description: "Professional credentials" },
	{ id: "review", title: "Review", description: "Confirm your details" }
)

interface LawyerRegisterFormProps {
	callbackUrl?: Route
}

export function LawyerRegisterForm({ callbackUrl: _callbackUrl }: LawyerRegisterFormProps) {
	return (
		<Stepper.Provider variant="horizontal" className="space-y-6">
			<LawyerRegisterFormContent />
		</Stepper.Provider>
	)
}

function LawyerRegisterFormContent() {
	const methods = useStepper()
	const form = useForm<LawyerRegisterSchema>({
		resolver: zodResolver(lawyerRegisterSchema),
		defaultValues: {
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
			agreeToTerms: false,
			seal: {
				enpName: "",
				enpRoleNumber: "",
			},
			notaryInfo: {
				attyName: "",
				rollNo: "",
				rollNoDate: "",
				commissionNo: "",
				commissionNoValidUntil: "",
				ptrNo: "",
				ptrNoLocation: "",
				ptrNoDate: "",
				ibpNo: "",
				ibpNoDate: "",
				notaryEmail: "",
				notaryAddress: "",
				mcleNoPeriod: "",
				mcleNo: "",
				mcleNoDate: "",
				modeOfNotarization: "REN",
			},
		},
	})

	const { mutate, data, error, isPending } = trpc.auth.registerLawyer.useMutation({
		onSuccess: data => {
			toast.success(data.message)
			form.reset()
			methods.reset()
		},
		onError: err => toast.error(err.message),
	})

	const onSubmit = (values: LawyerRegisterSchema) => mutate(values)

	const goToNextStep = async () => {
		let fieldsToValidate: (keyof LawyerRegisterSchema)[] = []

		if (methods.current.id === "account") {
			fieldsToValidate = ["name", "email", "password", "confirmPassword"]
		} else if (methods.current.id === "seal") {
			fieldsToValidate = ["seal"]
		} else if (methods.current.id === "notary") {
			fieldsToValidate = ["notaryInfo"]
		}

		const isValid = await form.trigger(fieldsToValidate)

		if (isValid && !methods.isLast) {
			methods.next()
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				{/* Stepper Navigation */}
				<Stepper.Navigation className="mb-6">
					{steps.map(step => (
						<Stepper.Step key={step.id} of={step.id}>
							<Stepper.Title>{step.title}</Stepper.Title>
						</Stepper.Step>
					))}
				</Stepper.Navigation>

				{/* Step 1: Account Info */}
				{methods.current.id === "account" && (
					<div className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Full Name</FormLabel>
									<FormControl>
										<Input placeholder="Enter your full name" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input type="email" placeholder="Enter your email" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Password</FormLabel>
									<FormControl>
										<InputPassword placeholder="Create a password" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="confirmPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Confirm Password</FormLabel>
									<FormControl>
										<InputPassword placeholder="Confirm your password" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				)}

				{/* Step 2: Seal Info */}
				{methods.current.id === "seal" && (
					<div className="space-y-4">
						<div className="bg-muted/50 rounded-lg p-4">
							<div className="flex items-center gap-2">
								<Scale className="text-primary size-5" />
								<h3 className="font-medium">Notary Seal Information</h3>
							</div>
							<p className="text-muted-foreground mt-1 text-sm">
								This information will appear on your official notary seal.
							</p>
						</div>

						<FormField
							control={form.control}
							name="seal.enpName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>ENP Name (as it appears on seal)</FormLabel>
									<FormControl>
										<Input
											placeholder="e.g., Mariae Francine Geraldine Biglaen y Sibulop"
											{...field}
										/>
									</FormControl>
									<FormDescription>
										Your full name as it should appear on the notary seal
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="seal.enpRoleNumber"
							render={({ field }) => (
								<FormItem>
									<FormLabel>ENP Role Number</FormLabel>
									<FormControl>
										<Input placeholder="e.g., 123456" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				)}

				{/* Step 3: Notary Credentials */}
				{methods.current.id === "notary" && (
					<div className="space-y-4">
						<FormField
							control={form.control}
							name="notaryInfo.attyName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Attorney Name</FormLabel>
									<FormControl>
										<Input
											placeholder="e.g., ATTY. MARIA ANGELICA M. DELA CRUZ-SAN FELIPE"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="notaryInfo.rollNo"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Roll No.</FormLabel>
										<FormControl>
											<Input placeholder="e.g., 123456" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="notaryInfo.rollNoDate"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Roll No. Date</FormLabel>
										<FormControl>
											<Input placeholder="e.g., 5 June 2018" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="notaryInfo.commissionNo"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Commission No.</FormLabel>
										<FormControl>
											<Input placeholder="e.g., 2024 - 024" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="notaryInfo.commissionNoValidUntil"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Valid Until</FormLabel>
										<FormControl>
											<Input placeholder="e.g., Dec 31, 2025" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="notaryInfo.ptrNo"
								render={({ field }) => (
									<FormItem>
										<FormLabel>PTR No.</FormLabel>
										<FormControl>
											<Input placeholder="e.g., 1234567" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="notaryInfo.ptrNoLocation"
								render={({ field }) => (
									<FormItem>
										<FormLabel>PTR Location</FormLabel>
										<FormControl>
											<Input placeholder="e.g., Manila" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="notaryInfo.ptrNoDate"
							render={({ field }) => (
								<FormItem>
									<FormLabel>PTR Date</FormLabel>
									<FormControl>
										<Input placeholder="e.g., Jan 02, 2025" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="notaryInfo.ibpNo"
								render={({ field }) => (
									<FormItem>
										<FormLabel>IBP No.</FormLabel>
										<FormControl>
											<Input placeholder="e.g., 123456" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="notaryInfo.ibpNoDate"
								render={({ field }) => (
									<FormItem>
										<FormLabel>IBP Date</FormLabel>
										<FormControl>
											<Input placeholder="e.g., Dec 18, 2024 (for 2025)" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="notaryInfo.notaryEmail"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Official Notary Email</FormLabel>
									<FormControl>
										<Input type="email" placeholder="e.g., juan.cruz@email.com" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="notaryInfo.notaryAddress"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Official Notary Address</FormLabel>
									<FormControl>
										<Textarea
											placeholder="e.g., 123, The Actual Bldg., 1234 Avenue, Malate, Manila"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="notaryInfo.mcleNoPeriod"
								render={({ field }) => (
									<FormItem>
										<FormLabel>MCLE Period</FormLabel>
										<FormControl>
											<Input placeholder="e.g., VIII" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="notaryInfo.mcleNo"
								render={({ field }) => (
									<FormItem>
										<FormLabel>MCLE No.</FormLabel>
										<FormControl>
											<Input placeholder="e.g., 1234567" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="notaryInfo.mcleNoDate"
							render={({ field }) => (
								<FormItem>
									<FormLabel>MCLE Date</FormLabel>
									<FormControl>
										<Input placeholder="e.g., Jun 12, 2024" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="notaryInfo.modeOfNotarization"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Mode of Notarization</FormLabel>
									<Select onValueChange={field.onChange} defaultValue={field.value}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select mode of notarization" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="REN">REN - Remote Electronic Notarization</SelectItem>
											<SelectItem value="IPEN">IPEN - In-Person Electronic Notarization</SelectItem>
											<SelectItem value="RON">RON - Remote Online Notarization</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				)}

				{/* Step 4: Review */}
				{methods.current.id === "review" && (
					<div className="space-y-4">
						<div className="bg-muted/50 rounded-lg p-4">
							<h3 className="mb-3 font-medium">Review Your Information</h3>

							<div className="space-y-4">
								<div>
									<h4 className="text-muted-foreground text-sm font-medium">Account</h4>
									<p className="text-sm">
										{form.getValues("name")} ({form.getValues("email")})
									</p>
								</div>

								<div>
									<h4 className="text-muted-foreground text-sm font-medium">Notary Seal</h4>
									<p className="text-sm">
										{form.getValues("seal.enpName")} - Role #{form.getValues("seal.enpRoleNumber")}
									</p>
								</div>

								<div>
									<h4 className="text-muted-foreground text-sm font-medium">Credentials</h4>
									<div className="text-sm">
										<p>{form.getValues("notaryInfo.attyName")}</p>
										<p>Roll No: {form.getValues("notaryInfo.rollNo")}</p>
										<p>
											Commission: {form.getValues("notaryInfo.commissionNo")} (Valid until{" "}
											{form.getValues("notaryInfo.commissionNoValidUntil")})
										</p>
										<p>PTR: {form.getValues("notaryInfo.ptrNo")}</p>
										<p>IBP: {form.getValues("notaryInfo.ibpNo")}</p>
										<p>MCLE: {form.getValues("notaryInfo.mcleNo")}</p>
									</div>
								</div>
							</div>
						</div>

						<FormField
							control={form.control}
							name="agreeToTerms"
							render={({ field }) => (
								<FormItem className="flex flex-row items-start space-y-0 space-x-2 rounded-md px-4">
									<FormControl>
										<Checkbox checked={field.value} onCheckedChange={field.onChange} />
									</FormControl>
									<div className="space-y-1 leading-none">
										<FormLabel className="text-muted-foreground text-xs">
											I agree to the
											<span
												className={cn(
													buttonVariants({ variant: "link" }),
													"text-primary hover:text-primary/80 h-fit p-0 text-xs hover:cursor-pointer"
												)}
											>
												Terms of Service
											</span>
											and
											<span
												className={cn(
													buttonVariants({ variant: "link" }),
													"text-primary hover:text-primary/80 h-fit p-0 text-xs hover:cursor-pointer"
												)}
											>
												Privacy Policy
											</span>
											. I certify that all information provided is accurate and complete.
										</FormLabel>
										<FormMessage />
									</div>
								</FormItem>
							)}
						/>
					</div>
				)}

				<FormResponse type="error" message={error?.message} />
				<FormResponse type="success" message={data?.message} />

				{/* Navigation Controls */}
				<Stepper.Controls>
					{!methods.isFirst && (
						<Button type="button" variant="outline" onClick={methods.prev} className="flex-1">
							Previous
						</Button>
					)}

					{!methods.isLast ? (
						<Button type="button" onClick={goToNextStep} className="flex-1">
							Next
						</Button>
					) : (
						<Button type="submit" disabled={isPending} className="flex-1">
							{isPending ? "Submitting..." : "Submit Application"}
						</Button>
					)}
				</Stepper.Controls>
			</form>
		</Form>
	)
}
