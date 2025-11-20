import {
	AudioWaveform,
	BadgeCheck,
	BarChartIcon,
	BellIcon,
	BookIcon,
	BookOpen,
	CalendarIcon,
	ChevronRight,
	ChevronsUpDown,
	ClipboardCheckIcon,
	Command,
	CreditCard,
	EyeIcon,
	FileText,
	FileTextIcon,
	GalleryVerticalEnd,
	Globe,
	Handshake,
	HouseIcon,
	LayersIcon,
	LifeBuoy,
	LogOut,
	MailIcon,
	MessageSquareIcon,
	Monitor,
	PenToolIcon,
	PieChart,
	PieChartIcon,
	Plus,
	ScanIcon,
	Send,
	Settings2,
	SettingsIcon,
	ShieldIcon,
	Sparkles,
	UserCheckIcon,
	UserIcon,
	UsersIcon,
	type LucideIcon,
} from "lucide-react"

import type { UserRole } from "@/services/drizzle/schema/auth"

import type { NavItem, NavSection, Team, WorkflowConfig, WorkflowType } from "./types"

// Icon mapping for string-based icon references
export const iconMap = {
	house: HouseIcon,
	document: FileTextIcon,
	mail: MailIcon,
	message: MessageSquareIcon,
	shield: ShieldIcon,
	calendar: CalendarIcon,
	clipboard: ClipboardCheckIcon,
	bell: BellIcon,
	users: UsersIcon,
	chart: BarChartIcon,
	userCheck: UserCheckIcon,
	eye: EyeIcon,
	layers: LayersIcon,
	user: UserIcon,
	settings: SettingsIcon,
	signature: PenToolIcon,
	book: BookIcon,
	// Additional icons from app-sidebar
	pieChart: PieChart,
	fileText: FileText,
	bookOpen: BookOpen,
	badgeCheck: BadgeCheck,
	monitor: Monitor,
	settings2: Settings2,
	globe: Globe,
	handshake: Handshake,
	// Team logos
	audioWaveform: AudioWaveform,
	galleryVerticalEnd: GalleryVerticalEnd,
	command: Command,
	// User actions
	chevronRight: ChevronRight,
	chevronsUpDown: ChevronsUpDown,
	creditCard: CreditCard,
	logOut: LogOut,
	plus: Plus,
	sparkles: Sparkles,
	// Secondary navigation icons
	lifeBuoy: LifeBuoy,
	send: Send,
} as const

export type IconName = keyof typeof iconMap

// Workflow configurations
// Based on Philippine Supreme Court Rules on Electronic Notarization (A.M. No. 24-10-14-SC)
//
// REN (Remote Electronic Notarization) Requirements:
// - Video/audio recording of entire session (mandatory)
// - Remote identity verification via credential analysis + KBA
// - Appointment scheduling system for remote coordination
// - Electronic Notarization Facility (ENF) Provider accreditation
// - Principals can participate from anywhere (including abroad)
//
// IEN (In-Person Electronic Notarization) Requirements:
// - Physical presence verification
// - Identity verification via government-issued ID inspection
// - Document scanning capabilities for physical documents
// - Witness management for certain document types
// - No mandatory video recording (optional)
// - No ENF Provider dependency
export const workflows: WorkflowConfig[] = [
	{
		id: "REN",
		label: "REN",
		description: "Remote Electronic Notarization",
		icon: Globe,
	},
	{
		id: "IEN",
		label: "IEN",
		description: "In-Person Electronic Notarization",
		icon: Handshake,
	},
]

// Teams configuration (mock data)
export const teams: Team[] = [
	{
		name: "Acme Inc",
		logo: AudioWaveform,
		plan: "Enterprise",
	},
]

// Secondary navigation items
export const navSecondary: NavItem[] = [
	{
		title: "Support",
		url: "/support",
		icon: "lifeBuoy",
	},
	{
		title: "Feedback",
		url: "/feedback",
		icon: "send",
	},
]

// App sidebar sections configuration
// Based on Philippine Supreme Court Rules on Electronic Notarization (A.M. No. 24-10-14-SC)
export const appSidebarSections: NavSection[] = [
	{
		label: "Platform",
		items: [
			// ============================================================================
			// DASHBOARD - Universal entry point for all users
			// ============================================================================
			// Available to: All authenticated users
			// Workflows: REN, IEN
			// Purpose: Main dashboard showing user-specific overview and quick actions
			{
				title: "Dashboard",
				url: "/dashboard",
				icon: PieChartIcon,
			},

			// ============================================================================
			// FIND A NOTARY - Client discovery of available ENPs
			// ============================================================================
			// Available to: PRINCIPAL (clients looking for notary services)
			// Workflows: REN, IEN (workflow-agnostic - all ENPs support both)
			// Purpose: Browse and search for Electronic Notaries Public
			// Features: ENP profiles, location, specialization, availability, ratings
			// Next Step: Book consultation or request notarization
			{
				title: "Find a Notary",
				url: "/find-notary",
				icon: UsersIcon,
				roles: ["PRINCIPAL"],
				workflows: ["REN", "IEN"],
			},

			// ============================================================================
			// CONSULTATION - Book or manage consultation appointments
			// ============================================================================
			// Available to: PRINCIPAL (booking), ENP (managing)
			// Workflows: REN, IEN (branches based on selected workflow)
			// Purpose:
			//   - REN: Schedule remote video consultation
			//   - IEN: Schedule in-person meeting or walk-in
			// Features: Calendar, ENP selection, workflow choice, appointment management
			{
				title: "Consultations",
				url: "/consultations",
				icon: CalendarIcon,
				roles: ["PRINCIPAL"],
				workflows: ["REN", "IEN"],
			},

			// ============================================================================
			// MY CALENDAR (ENP Calendar Management) - REN-specific
			// ============================================================================
			// Available to: ENP only
			// Workflows: REN only
			// Purpose: ENP manages their remote appointment calendar and availability
			// Features: Calendar view, availability slots, scheduled remote sessions
			// Note: IEN doesn't need separate appointment management (walk-in or consultation)
			{
				title: "My Calendar",
				url: "/appointments",
				icon: CalendarIcon,
				roles: ["ENP"],
				workflows: ["REN"],
			},

			// ============================================================================
			// DOCUMENT SCANNING - IEN-specific document digitization
			// ============================================================================
			// Available to: ENP only
			// Workflows: IEN only
			// Purpose: Scan physical documents for in-person notarization
			// Features: Camera/scanner integration, PDF generation, document upload
			// Note: REN doesn't need this (documents already digital/uploaded remotely)
			{
				title: "Scan Documents",
				url: "/scan",
				icon: ScanIcon,
				roles: ["ENP"],
				workflows: ["IEN"],
			},

			// ============================================================================
			// NOTARIZATION REQUESTS - Client-initiated notarization workflow
			// ============================================================================
			// Available to: PRINCIPAL, ENP
			// Workflows: REN, IEN
			// Purpose:
			//   - PRINCIPAL: Request notarization service, upload documents
			//   - ENP: View incoming notarization requests
			// Features: Document upload, ENP selection, workflow choice, request tracking
			{
				title: "Notarization Requests",
				url: "/requests",
				icon: FileText,
				roles: ["PRINCIPAL", "ENP"],
				workflows: ["REN", "IEN"],
				items: [
					// PRINCIPAL: Create new notarization request
					{
						title: "New Request",
						url: "/requests/new",
						roles: ["PRINCIPAL"],
						workflows: ["REN", "IEN"],
					},
					// PRINCIPAL: View their submitted requests
					{
						title: "My Requests",
						url: "/requests/my-requests",
						roles: ["PRINCIPAL"],
						workflows: ["REN", "IEN"],
					},
					// ENP: View incoming requests from clients
					{
						title: "Incoming Requests",
						url: "/requests/incoming",
						roles: ["ENP"],
						workflows: ["REN", "IEN"],
					},
				],
			},

			// ============================================================================
			// ACTIVE NOTARIZATIONS - Live notarization sessions and pending actions
			// ============================================================================
			// Available to: ENP, PRINCIPAL
			// Workflows: REN, IEN
			// Purpose: Active notarization sessions requiring action
			// Features:
			//   - REN: Video session active, remote signing, recording indicator
			//   - IEN: In-person session, physical presence verified, signing
			// Routes to: /notarize/[id] (workflow-aware notarization page)
			{
				title: "Active Notarizations",
				url: "/notarizations/active",
				icon: PenToolIcon,
				roles: ["ENP", "PRINCIPAL"],
				workflows: ["REN", "IEN"],
			},

			// ============================================================================
			// NOTARIZATION HISTORY - Completed and historical notarizations
			// ============================================================================
			// Available to: ENP, PRINCIPAL
			// Workflows: REN, IEN
			// Purpose: View completed notarizations and history
			// Features: Search, filter by date/workflow, download certificates, audit trail
			{
				title: "Notarization History",
				url: "/notarizations/history",
				icon: BookIcon,
				roles: ["ENP", "PRINCIPAL"],
				workflows: ["REN", "IEN"],
			},

			// ============================================================================
			// DOCUMENT MANAGEMENT - All documents and envelopes
			// ============================================================================
			// Available to: ENP, PRINCIPAL
			// Workflows: REN, IEN
			// Purpose: Manage all documents, envelopes, and templates
			// Note: Consolidates /envelopes and /documents into one clear section
			{
				title: "Documents",
				url: "/documents",
				icon: FileText,
				roles: ["ENP", "PRINCIPAL"],
				workflows: ["REN", "IEN"],
				items: [
					// ENP: Create new document envelope for notarization
					{
						title: "Create Envelope",
						url: "/documents/create",
						roles: ["ENP"],
						workflows: ["REN", "IEN"],
					},
					// All: View documents pending signature
					{
						title: "Pending Signatures",
						url: "/documents/pending",
						roles: ["ENP", "PRINCIPAL"],
						workflows: ["REN", "IEN"],
					},
					// All: View completed documents
					{
						title: "Completed Documents",
						url: "/documents/completed",
						roles: ["ENP", "PRINCIPAL"],
						workflows: ["REN", "IEN"],
					},
					// ENP: Document templates for reuse
					{
						title: "Templates",
						url: "/documents/templates",
						roles: ["ENP"],
						workflows: ["REN", "IEN"],
					},
				],
			},

			// ============================================================================
			// ELECTRONIC NOTARIAL BOOK - ENP's official record book
			// ============================================================================
			// Available to: ENP only
			// Workflows: REN, IEN (both must maintain records)
			// Purpose: Official electronic notarial register per Supreme Court rules
			// Features: All notarial acts, chronological entries, search, export
			// Legal: Required by Philippine Supreme Court Rules (A.M. No. 24-10-14-SC)
			{
				title: "Notarial Book",
				url: "/notarial-book",
				icon: BookOpen,
				roles: ["ENP"],
				workflows: ["REN", "IEN"],
			},

			// ============================================================================
			// AUDIT & COMPLIANCE - ENA oversight and monitoring
			// ============================================================================
			// Available to: ENA (Electronic Notarization Authority) only
			// Workflows: REN, IEN
			// Purpose: ENA monitors compliance, reviews records, generates reports
			// Legal: ENA oversight per Supreme Court Rules
			{
				title: "Audit & Compliance",
				url: "/audit",
				icon: BadgeCheck,
				roles: ["ENA"],
				workflows: ["REN", "IEN"],
				items: [
					{
						title: "Notarial Records",
						url: "/audit/records",
						roles: ["ENA"],
						workflows: ["REN", "IEN"],
					},
					{
						title: "Compliance Reports",
						url: "/audit/reports",
						roles: ["ENA"],
						workflows: ["REN", "IEN"],
					},
					{
						title: "Violations",
						url: "/audit/violations",
						roles: ["ENA"],
						workflows: ["REN", "IEN"],
					},
				],
			},

			// ============================================================================
			// IDENTITY VERIFICATION - IEN-specific in-person ID check
			// ============================================================================
			// Available to: ENP only
			// Workflows: IEN only
			// Purpose: Verify identity via government-issued ID inspection
			// Features: ID scanning, comparison, validation checklist, photo capture
			// Legal: IEN requires physical ID inspection per Supreme Court Rules
			// Note: REN uses different verification (credential analysis + KBA)
			{
				title: "Identity Verification",
				url: "/verification/identity",
				icon: UserIcon,
				roles: ["ENP"],
				workflows: ["IEN"],
			},

			// ============================================================================
			// WITNESS MANAGEMENT - IEN-specific physical witness verification
			// ============================================================================
			// Available to: ENP only
			// Workflows: IEN only
			// Purpose: Manage witnesses for documents requiring physical witnesses
			// Features: Witness registration, ID verification, signature capture
			// Legal: Certain documents require witnesses per Supreme Court Rules
			{
				title: "Witness Management",
				url: "/verification/witness",
				icon: UsersIcon,
				roles: ["ENP"],
				workflows: ["IEN"],
			},

			// ============================================================================
			// VIDEO MEETINGS - REN-specific remote session management
			// ============================================================================
			// Available to: ENP, PRINCIPAL
			// Workflows: REN only
			// Purpose: Manage remote video consultation and notarization sessions
			// Features: Video call, screen sharing, recording, meeting history
			// Legal: REN requires video/audio recording per Supreme Court Rules
			// Note: Integrated with VideoSDK
			{
				title: "Video Meetings",
				url: "/meetings",
				icon: Monitor,
				roles: ["ENP", "PRINCIPAL"],
				workflows: ["REN"],
			},
		],
	},
	{
		label: "Management",
		items: [
			// ============================================================================
			// ENP MANAGEMENT - ENA oversight of Electronic Notaries Public
			// ============================================================================
			// Available to: ENA only
			// Workflows: REN, IEN (ENA manages all ENPs)
			// Purpose: Manage ENP commissions, applications, and revocations
			// Legal: ENA oversight per Supreme Court Rules
			{
				title: "ENP Management",
				url: "/management/enp",
				icon: UsersIcon,
				roles: ["ENA"],
				workflows: ["REN", "IEN"],
				items: [
					{
						title: "Active Commissions",
						url: "/management/enp/commissions",
						roles: ["ENA"],
						workflows: ["REN", "IEN"],
					},
					{
						title: "Applications",
						url: "/management/enp/applications",
						roles: ["ENA"],
						workflows: ["REN", "IEN"],
					},
					{
						title: "Revocations & Suspensions",
						url: "/management/enp/revocations",
						roles: ["ENA"],
						workflows: ["REN", "IEN"],
					},
				],
			},

			// ============================================================================
			// FACILITY PROVIDERS - REN-specific ENF Provider accreditation
			// ============================================================================
			// Available to: ENA only
			// Workflows: REN only
			// Purpose: Manage Electronic Notarization Facility (ENF) Provider accreditation
			// Legal: REN requires accredited ENF Providers per Supreme Court Guidelines
			// Features: Accreditation applications, monitoring, compliance, penalties
			{
				title: "Facility Providers",
				url: "/management/providers",
				icon: Monitor,
				roles: ["ENA"],
				workflows: ["REN"],
				items: [
					{
						title: "Accreditation",
						url: "/management/providers/accreditation",
						roles: ["ENA"],
						workflows: ["REN"],
					},
					{
						title: "Performance Monitoring",
						url: "/management/providers/monitoring",
						roles: ["ENA"],
						workflows: ["REN"],
					},
					{
						title: "Compliance & Penalties",
						url: "/management/providers/compliance",
						roles: ["ENA"],
						workflows: ["REN"],
					},
				],
			},
		],
	},
	{
		label: "Settings",
		items: [
			// ============================================================================
			// ACCOUNT SETTINGS - User profile and security management
			// ============================================================================
			// Available to: All authenticated users
			// Workflows: REN, IEN
			// Purpose: Manage user profile, security settings, and preferences
			// Features: Profile editing, password change, 2FA, notification preferences
			// Legal: All users need profile and security management per Supreme Court Rules
			{
				title: "Account Settings",
				url: "/settings",
				icon: Settings2,
				roles: ["ENP", "PRINCIPAL", "ENA", "ADMIN"],
				workflows: ["REN", "IEN"],
				items: [
					{
						title: "Profile",
						url: "/settings/profile",
						roles: ["ENP", "PRINCIPAL", "ENA", "ADMIN"],
						workflows: ["REN", "IEN"],
					},
					{
						title: "Security",
						url: "/settings/security",
						roles: ["ENP", "PRINCIPAL", "ENA", "ADMIN"],
						workflows: ["REN", "IEN"],
					},
					{
						title: "System Settings",
						url: "/settings/system",
						roles: ["ENA"],
						workflows: ["REN", "IEN"],
					},
				],
			},
		],
	},
]

// Helper functions for workflows
export function getWorkflowConfig(workflowId: WorkflowType): WorkflowConfig | undefined {
	return workflows.find(workflow => workflow.id === workflowId)
}

export function getWorkflowLabel(workflowId: WorkflowType): string {
	const config = getWorkflowConfig(workflowId)
	return config?.label ?? workflowId
}

export function getWorkflowDescription(workflowId: WorkflowType): string {
	const config = getWorkflowConfig(workflowId)
	return config?.description ?? workflowId
}

export function getWorkflowIcon(workflowId: WorkflowType): LucideIcon | undefined {
	const config = getWorkflowConfig(workflowId)
	return config?.icon
}

// Site user configuration (for authenticated user dropdown)
const siteUserConfig: NavItem[] = [
	{
		title: "Profile",
		url: "/profile",
		icon: "user",
	},
	{
		title: "Notifications",
		url: "/notifications",
		icon: "bell",
	},
	{
		title: "Settings",
		url: "/settings",
		icon: "settings",
	},
]

// Navigation Filtering Functions for site user
function isValidUserRole(role: string | null | undefined): role is UserRole {
	if (!role) {
		return false
	}
	return ["ENP", "Principal", "ENA"].includes(role)
}

function filterNavItemsByRole(navItems: NavItem[], userRole?: string | null): NavItem[] {
	return navItems.filter(item => {
		const roles = item.roles
		if (!roles || roles.length === 0) return true
		if (!userRole || !isValidUserRole(userRole)) return false
		// Handle union type: roles can be NotaryRole[] | UserRole[]
		// Check if any role in the array matches the user's role
		return (roles as readonly string[]).includes(userRole)
	})
}

// Getter functions for easy access
export function getAppSidebarSections(): NavSection[] {
	return appSidebarSections
}

export function getWorkflows(): WorkflowConfig[] {
	return workflows
}

export function getTeams(): Team[] {
	return teams
}

export function getSiteUserItems(userRole?: UserRole | null): NavItem[] {
	return filterNavItemsByRole(siteUserConfig, userRole)
}

export function getNavSecondary(): NavItem[] {
	return navSecondary
}
