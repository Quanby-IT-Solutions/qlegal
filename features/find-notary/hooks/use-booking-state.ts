"use client"

import { useState } from "react"

import type { BookingState, WorkflowType } from "../types/find-notary.types"

export function useBookingState() {
	const [bookingState, setBookingState] = useState<BookingState>({
		selectedENP: null,
		bookingWorkflow: "REN",
		selectedDate: undefined,
		selectedTime: "",
		consultationType: "INITIAL",
		meetingPreference: "VIDEO_CALL",
		specialRequirements: "",
		location: "",
	})

	const updateBookingState = (updates: Partial<BookingState>) => {
		setBookingState(prev => ({ ...prev, ...updates }))
	}

	const initializeBooking = (enpId: string, workflow: WorkflowType) => {
		setBookingState(prev => ({
			...prev,
			selectedENP: enpId,
			bookingWorkflow: workflow,
			selectedDate: undefined,
			selectedTime: "",
		}))
	}

	const resetBooking = () => {
		setBookingState(prev => ({
			...prev,
			selectedENP: null,
			selectedDate: undefined,
			selectedTime: "",
		}))
	}

	return {
		bookingState,
		updateBookingState,
		initializeBooking,
		resetBooking,
	}
}
