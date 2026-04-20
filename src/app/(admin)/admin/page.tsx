import { prisma } from '@/lib/prisma'
import { getGlobalStock } from '@/lib/inventory'
import { StoreStockCard } from '@/components/admin/store-stock-card'
import { GlobalStockTable } from '@/components/admin/global-stock-table'
import { KpiCard } from '@/components/admin/kpi-card'
import { ActivityFeed } from '@/components/admin/activity-feed'
import { DashboardLive } from '@/components/admin/dashboard-live'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, Package, AlertTriangle, ClipboardList, ShoppingCart, Truck } from 'lucide-react'

export const revalidate = 60

async function getDashboardData() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [
    stores, globalStock,
    todayRevenue, openOrders, pendingTransfers,
    lowAlerts, pendingWOs, pendingPOs,
    recentOrders, recentAdjustments,
  ] = await Promise.all([
    prisma.store.findMany({
      include: {
        inventory: { include: { product: true }, orderBy: { quantityOnHand: 'asc' }, take: 5 },
      },
    }),
    getGlobalStock().catch(() => []),

    prisma.order.aggregate({
      where: { createdAt: { gte: todayStart }, status: { in: ['PAID', 'PARTIAL', 'FULFILLED'] } },
      _sum: { totalAmount: true }, _count: true,
    }),
    prisma.order.count({ where: { status: { in: ['PAID', 'PARTIAL'] } } }),
    prisma.storeTransfer.count({ where: { status: { in: ['REQUESTED', 'APPROVED', 'SHIPPED'] } } }),
    prisma.lowStockAlert.count({ where: { isRead: false } }),
    prisma.workOrder.count({ where: { status: 'SUBMITTED' } }),
    prisma.purchaseOrder.count({ where: { status: { in: ['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED'] } } }),

    prisma.order.findMany({
      where: { createdAt: { gte: todayStart } },
      include: { customer: { select: { fullName: true } }, store: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.inventoryAdjustmentLog.findMany({
      include: { product: { select: { name: true } }, store: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ])

  return {
    stores, globalStock,
    todayRevenue, openOrders, pendingTransfers,
    lowAlerts, pendingWOs, pendingPOs,
    recentOrders, recentAdjustments,
  }
}

export default async function AdminDashboard() {
  const {
    stores, globalStock,
    todayRevenue, openOrders, pendingTransfers,
    lowAlerts, pendingWOs, pendingPOs,
    recentOrders, recentAdjustments,
  } = await getDashboardData()

  const totalUnits = globalStock.reduce((s, r) => s + r.totalOnHand, 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Operations Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Live overview · {stores.length} stores</p>
      </div>

      {/* Today KPIs */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Today</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Today's Revenue"
            value={formatCurrency(Number(todayRevenue._sum.totalAmount ?? 0))}
            icon={<TrendingUp className="w-5 h-5" />}
            accent="green"
          />
          <KpiCard
            label="Today's Orders"
            value={todayRevenue._count}
            icon={<ShoppingCart className="w-5 h-5" />}
            accent="blue"
          />
          <KpiCard
            label="Low Stock Alerts"
            value={lowAlerts}
            icon={<AlertTriangle className="w-5 h-5" />}
            accent={lowAlerts > 0 ? 'red' : 'green'}
          />
          <KpiCard
            label="Pending Work Orders"
            value={pendingWOs}
            icon={<ClipboardList className="w-5 h-5" />}
            accent={pendingWOs > 0 ? 'amber' : 'green'}
          />
        </div>
      </div>

      {/* Network KPIs */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Network</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Open Orders"
            value={openOrders}
            icon={<ShoppingCart className="w-5 h-5" />}
            accent="amber"
          />
          <KpiCard
            label="Active Transfers"
            value={pendingTransfers}
            icon={<Package className="w-5 h-5" />}
            accent="blue"
          />
          <KpiCard
            label="Active POs"
            value={pendingPOs}
            icon={<Truck className="w-5 h-5" />}
            accent="blue"
          />
          <KpiCard
            label="Units in Network"
            value={totalUnits.toLocaleString()}
            icon={<Package className="w-5 h-5" />}
            accent="green"
          />
        </div>
      </div>

      {/* Live dashboard section */}
      <DashboardLive />

      {/* Per-store status */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>Per-Store Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {stores.map(store => <StoreStockCard key={store.id} store={store} />)}
        </div>
      </section>

      {/* Stock table + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GlobalStockTable rows={globalStock} />
        </div>
        <ActivityFeed orders={recentOrders.map(o => ({
          id: o.id, orderNumber: o.orderNumber, status: o.status,
          totalAmount: Number(o.totalAmount),
          customerName: o.customer?.fullName ?? 'Guest', storeName: o.store.name,
          createdAt: o.createdAt.toISOString(),
        }))} adjustments={recentAdjustments.map(a => ({
          id: a.id, type: a.type, quantity: a.quantity, before: a.before, after: a.after,
          reason: a.reason, productName: a.product.name, storeName: a.store.name,
          createdAt: a.createdAt.toISOString(),
        }))} />
      </div>
    </div>
  )
}
