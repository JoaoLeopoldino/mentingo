/** Captured at issuance; legacy credentials intentionally remain null. */
export interface CertificateBrandingSnapshot {
  version: 1;
  issuer: string;
  logoKey: string | null;
  backgroundKey: string | null;
  signatureKey: string | null;
  fontColor: string | null;
  primaryColor: string | null;
  demonstration: boolean;
  capturedAt: string;
}
export interface CertificateBrandingSource {
  kind: "course" | "learningPath";
  id: string;
}
