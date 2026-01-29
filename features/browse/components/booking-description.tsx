import { Label } from "@/core/components/ui/label"
import { Textarea } from "@/core/components/ui/textarea"

interface BookingDescriptionProps {
	value: string
	onChange: (value: string) => void
	disabled?: boolean
}

export function BookingDescription({ value, onChange, disabled = false }: BookingDescriptionProps) {
	return (
		<div className="space-y-2">
			<Label className="text-base font-medium">Description (Optional)</Label>
			<Textarea
				placeholder="Add any additional notes or requirements for this booking..."
				value={value}
				onChange={e => onChange(e.target.value)}
				className="min-h-[100px] resize-none"
				rows={4}
				disabled={disabled}
			/>
		</div>
	)
}
