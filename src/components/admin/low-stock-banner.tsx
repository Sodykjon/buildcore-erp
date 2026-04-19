import { prisma } from '@/lib/prisma'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export async function LowStockBanner() {
  const alerts = await prisma.lowStockAlert.findMany({
    where:   { isRead: false },
    include: { store: true },
    orderBy: { createdAt: 'desc' },
    take:    5,
  })

  if (alerts.length === 0) return null

  return (
    <div className="bg-red-950/50 border-b border-red-800/50 px-6 py-2.5 flex items-center gap-3">
      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
      <p className="text-sm text-red-300 flex-1">
        <span className="font-semibold">{alerts.length} low stock alert{alerts.length > 1 ? 's' : ''}</span>
        {' '}— {alerts.slice(0, 3).map(a => a.store.name).join(', ')}
        {alerts.length > 3 ? ` +${alerts.length - 3} more` : ''}
      </p>
      <Link
        href="/admin/inventory?filter=low-stock"
        className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
      >
        View all →
      </Link>
    </div>
  )
}
