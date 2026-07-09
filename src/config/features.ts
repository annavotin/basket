/** Feature flags.
 *
 * EMAIL_AUTH_ENABLED gates the email/password sign-up + sign-in UI. It is OFF for the
 * Apple-only App Store resubmit: email confirmation depends on a production SMTP provider
 * that is not configured yet (see TODO.md). Flip to true once custom SMTP is set up to
 * re-enable the email option in onboarding, the auth sheet, and Settings.
 */
export const EMAIL_AUTH_ENABLED: boolean = false
