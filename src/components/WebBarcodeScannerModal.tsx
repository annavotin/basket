// Native/jest stub. Real implementation is WebBarcodeScannerModal.web.tsx, which
// Metro resolves only for the web bundle — keeping html5-qrcode out of the native
// bundle and the jest graph.
export type WebBarcodeScannerModalProps = {
  visible: boolean
  onScanned: (barcode: string) => void
  onClose: () => void
}

export default function WebBarcodeScannerModal(_props: WebBarcodeScannerModalProps) {
  return null
}
