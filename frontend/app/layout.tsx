import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DentaLedger — ระบบรายได้ทันตแพทย์',
  description: 'จัดการรายได้ คำนวณภาษี พร้อม AI อ่านใบเสร็จ',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
