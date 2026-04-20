import type { Store, StoreInventory, Product } from '@prisma/client'

type StoreWithInventory = Store & {
  inventory: (StoreInventory & { product: Product })[]
}

export function StoreStockCard({ store }: { store: StoreWithInventory }) {
  const criticalItems = store.inventory.filter(
    i => i.quantityOnHand <= i.lowStockThreshold
  )

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>{store.name}</h3>
        {criticalItems.length > 0 && (
          <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">
            {criticalItems.length} low
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {criticalItems.slice(0, 4).map(inv => (
          <div key={inv.id} className="flex items-center justify-between text-xs">
            <span className="truncate max-w-[100px]" style={{ color: 'var(--text-secondary)' }}>{inv.product.name}</span>
            <span className="text-red-400 font-mono font-medium">{inv.quantityOnHand}</span>
          </div>
        ))}
        {criticalItems.length === 0 && (
          <p className="text-xs text-green-400">All stock healthy</p>
        )}
      </div>

      <p className="text-xs pt-2" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
        {store.inventory.length} active SKUs
      </p>
    </div>
  )
}
