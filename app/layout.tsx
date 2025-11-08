import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Quantum Agent Gateway Dashboard',
  description:
    'Telemetry control plane for the X402 Quantum Agent Gateway — inspect budgets, payments, and task lineage emitted by the autonomous buyer demo.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
