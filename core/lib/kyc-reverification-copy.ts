/**
 * Copy for users whose verification lapsed after {@link KYC_VERIFICATION_VALIDITY_DAYS}
 * (see env / `getUserKycInfo().kycVerificationValidityDays`).
 */
export function kycExpiryRenewalDescription(validityDays: number): string {
	return `For security and to align with our verification provider's data retention, identity checks are only considered valid for about ${validityDays} days. Your previous verification period has ended, so we need a fresh verification.`
}

export function kycExpiryRenewalDialogTitle(): string {
	return "Verification period ended"
}
