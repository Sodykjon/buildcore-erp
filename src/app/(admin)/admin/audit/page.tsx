import { prisma } from '@/lib/prisma'
import { getServerProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AuditLogViewer } from '@/components/admin/audit/audit-log-viewer'

export const revalidate = 0

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string; productId?: string; type?: string; from?: string; to?: string; page?: string }>
}) {
  const profile = await getServerProfile()
  if (!profile || profile.role !== 'ADMIN') redirect('/login')

  const params  = await searchParams
  const page    = Math.max(1, parseInt(params.page ?? '1'))
  const perPage = 50

  const now   = new Date()
  const start = params.from ? new Date(params.from) : new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = params.to   ? new Date(params.to)   : now
  end.setHours(23, 59, 59, 999)

  const where = {
    createdAt:  { gte: start, lte: end },
    ...(params.storeId   && { storeId:   params.storeId }),
    ...(params.productId && { productId: params.productId }),
    ...(params.type      && { type:      params.type }),
  }

  const [logs, total, stores, products] = await Promise.all([
    prisma.inventoryAdjustmentLog.findMany({
      where,
      include: {
        store:   { select: { name: true } },
        product: { select: { name: true, sku: true, unit: true } },
      },
      orderBy: { createdAt: 'desc' },
      take:    perPage,
      skip:    (page - 1) * perPage,
    }),
    prisma.inventoryAdjustmentLog.count({ where }),
    prisma.store.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, sku: true } }),
  ])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <AuditLogViewer
        logs={logs.map(l => ({
          ...l,
          createdAt:   l.createdAt.toISOString(),
          storeName:   l.store.name,
          productName: l.product.name,
          productSku:  l.product.sku,
          productUnit: l.product.unit,
        }))}
        total={total}
        page={page}
        perPage={perPage}
        stores={stores}
        products={products}
        filters={{
          storeId:   params.storeId   ?? '',
          productId: params.productId ?? '',
          type:      params.type      ?? '',
          from:      start.toISOString().slice(0, 10),
          to:        end.toISOString().slice(0, 10),
        }}
      />
    </div>
  )
}
