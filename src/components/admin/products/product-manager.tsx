'use client'

import { useState, useTransition, useRef } from 'react'
import { Package, Plus, Pencil, Archive, ArchiveRestore, Printer, Tag, Upload, Download, RefreshCw } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { ActionButton } from '@/components/ui/action-button'
import { formatCurrency } from '@/lib/utils'
import {
  createProductAction, updateProductAction, archiveProductAction,
  createCategoryAction, deleteCategoryAction,
} from '@/app/actions/products'
import Link from 'next/link'
import { toast } from 'sonner'

type Category = { id: string; name: string }
type Product = {
  id: string; sku: string; barcode: string; name: string; description: string | null
  unit: string; costPrice: number; sellPrice: number; isActive: boolean
  category: Category
  inventory: { storeId: string; quantityOnHand: number; store: { name: string } }[]
}

interface Props {
  products: Product[]
  categories: Category[]
}

const inputCls = `w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors`
const labelCls = 'block text-xs mb-1'

export function ProductManager({ products: initial, categories: initialCats }: Props) {
  const [products, setProducts] = useState(initial)
  const [categories, setCategories] = useState(initialCats)
  const [showArchived, setShowArchived] = useState(false)
  const [search, setSearch] = useState('')

  // Modals
  const [addOpen, setAddOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [catOpen, setCatOpen]   = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null)
  const [importing, setImporting] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  const [, startTrans] = useTransition()

  const visible = products.filter(p =>
    (showArchived ? !p.isActive : p.isActive) &&
    (search === '' || p.name.toLowerCase().includes(search.toLowerCase()) ||
     p.sku.toLowerCase().includes(search.toLowerCase()))
  )

  async function handleCreate(fd: FormData) {
    try {
      await createProductAction(fd)
      setAddOpen(false)
      toast.success('Product created')
      window.location.reload()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error creating product')
    }
  }

  async function handleUpdate(fd: FormData) {
    try {
      await updateProductAction(fd)
      setEditTarget(null)
      toast.success('Product updated')
      window.location.reload()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error updating product')
    }
  }

  async function handleArchive(id: string, archive: boolean) {
    startTrans(async () => {
      try {
        await archiveProductAction(id, archive)
        setProducts(ps => ps.map(p => p.id === id ? { ...p, isActive: !archive } : p))
        toast.success(archive ? 'Product archived' : 'Product restored')
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Error')
      }
    })
  }

  async function handleAddCategory(fd: FormData) {
    try {
      const cat = await createCategoryAction(fd)
      setCategories(cs => [...cs, cat].sort((a, b) => a.name.localeCompare(b.name)))
      toast.success('Category added')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error adding category')
    }
  }

  async function handleDeleteCategory(id: string) {
    try {
      await deleteCategoryAction(id)
      setCategories(cs => cs.filter(c => c.id !== id))
      toast.success('Category removed')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error removing category')
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/products/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      setImportResult(data)
      if (data.created > 0 || data.updated > 0) {
        toast.success(`Import complete — ${data.created} created, ${data.updated} updated`)
        window.location.reload()
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
      if (importRef.current) importRef.current.value = ''
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Inventory</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{visible.length} products</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 w-52"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={() => setShowArchived(a => !a)}
            className="px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={showArchived
              ? { background: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
              : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            {showArchived ? 'Show Active' : 'Show Archived'}
          </button>
          <button
            onClick={() => setCatOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:text-white"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            <Tag className="w-3.5 h-3.5" /> Categories
          </button>
          <a
            href="/api/products/import/template"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:text-white"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            title="Download CSV template"
          >
            <Download className="w-3.5 h-3.5" /> Template
          </a>
          <label
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: importing ? 'var(--text-muted)' : 'var(--text-secondary)' }}
          >
            <Upload className="w-3.5 h-3.5" />
            {importing ? 'Importing…' : 'Import CSV'}
            <input
              ref={importRef}
              type="file"
              accept=".csv"
              className="hidden"
              disabled={importing}
              onChange={handleImport}
            />
          </label>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold
                       bg-amber-500 hover:bg-amber-400 text-gray-950 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {importResult && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 text-sm space-y-1">
          <p className="text-green-400 font-medium">
            Import complete — {importResult.created} created, {importResult.updated} updated
          </p>
          {importResult.errors.length > 0 && (
            <ul className="text-yellow-400 text-xs space-y-0.5 list-disc list-inside">
              {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <th className="text-left px-4 py-3 font-medium">Product</th>
              <th className="text-left px-4 py-3 font-medium">Category</th>
              <th className="text-left px-4 py-3 font-medium">Barcode</th>
              <th className="text-right px-4 py-3 font-medium">Cost</th>
              <th className="text-right px-4 py-3 font-medium">Price</th>
              <th className="text-right px-4 py-3 font-medium">Total Stock</th>
              <th className="text-left px-4 py-3 font-medium">Unit</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visible.map(product => {
              const totalStock = product.inventory.reduce((s, i) => s + i.quantityOnHand, 0)
              const isLow = false
              return (
                <tr key={product.id} className={`transition-colors hover:bg-gray-800/40 ${!product.isActive ? 'opacity-50' : ''}`} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3">
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{product.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{product.sku}</p>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{product.category.name}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{product.barcode}</td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(product.costPrice)}</td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(product.sellPrice)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono font-semibold ${isLow ? 'text-red-400' : 'text-green-400'}`}>
                      {totalStock}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{product.unit}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/admin/inventory/${product.id}/label?copies=1`}
                        target="_blank"
                        className="text-gray-500 hover:text-amber-400 transition-colors"
                        title="Print label"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => setEditTarget(product)}
                        className="text-gray-500 hover:text-blue-400 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <ActionButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchive(product.id, product.isActive)}
                        className="!px-2 !py-1"
                        title={product.isActive ? 'Archive' : 'Restore'}
                      >
                        {product.isActive
                          ? <Archive className="w-3.5 h-3.5 text-gray-500 hover:text-red-400" />
                          : <ArchiveRestore className="w-3.5 h-3.5 text-gray-500 hover:text-green-400" />
                        }
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              )
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Product" size="lg">
        <ProductForm categories={categories} onSubmit={handleCreate} submitLabel="Create Product" />
      </Modal>

      {/* Edit Product Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Product" size="lg">
        {editTarget && (
          <ProductForm
            categories={categories}
            product={editTarget}
            onSubmit={handleUpdate}
            submitLabel="Save Changes"
          />
        )}
      </Modal>

      {/* Category Manager Modal */}
      <Modal open={catOpen} onClose={() => setCatOpen(false)} title="Manage Categories" size="sm">
        <CategoryManager
          categories={categories}
          onAdd={handleAddCategory}
          onDelete={handleDeleteCategory}
        />
      </Modal>
    </div>
  )
}

// ── Barcode generation (EAN-13) ───────────────────────────────────────────────

function generateShortCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

// ── Product Form ──────────────────────────────────────────────────────────────

function ProductForm({
  categories, product, onSubmit, submitLabel,
}: {
  categories: Category[]
  product?: Product
  onSubmit: (fd: FormData) => Promise<void>
  submitLabel: string
}) {
  const [pending, startTrans] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [barcode, setBarcode] = useState(product?.barcode ?? '')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTrans(async () => {
      try {
        setErr(null)
        await onSubmit(fd)
      } catch (ex: unknown) {
        setErr(ex instanceof Error ? ex.message : 'Error')
      }
    })
  }

  const inputStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
  const labelStyle = { color: 'var(--text-muted)' }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={`${labelCls}`} style={labelStyle}>SKU *</label>
          <input name="sku" required defaultValue={product?.sku} disabled={!!product}
            className={`${inputCls} ${product ? 'opacity-50' : ''}`} placeholder="PROD-001"
            style={inputStyle} />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Barcode *</label>
          <div className="flex gap-1.5">
            <input name="barcode" required value={barcode} onChange={e => setBarcode(e.target.value)}
              className={`${inputCls} flex-1 font-mono`} placeholder="e.g. 482910"
              style={inputStyle} />
            <button
              type="button"
              onClick={() => setBarcode(generateShortCode())}
              title="Generate EAN-13 barcode"
              className="px-2.5 rounded-lg hover:text-amber-400 hover:border-amber-500 transition-colors shrink-0"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className={labelCls} style={labelStyle}>Product Name *</label>
        <input name="name" required defaultValue={product?.name}
          className={inputCls} placeholder="Portland Cement 50kg" style={inputStyle} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls} style={labelStyle}>Category *</label>
          <select name="categoryId" required defaultValue={product?.category.id} className={inputCls} style={inputStyle}>
            <option value="">Select category…</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Unit *</label>
          <input name="unit" required defaultValue={product?.unit}
            className={inputCls} placeholder="bag, kg, m, piece…" style={inputStyle} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls} style={labelStyle}>Cost Price *</label>
          <input name="costPrice" type="number" step="0.01" min="0" required
            defaultValue={product?.costPrice} className={inputCls} placeholder="0.00" style={inputStyle} />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Sell Price *</label>
          <input name="sellPrice" type="number" step="0.01" min="0" required
            defaultValue={product?.sellPrice} className={inputCls} placeholder="0.00" style={inputStyle} />
        </div>
      </div>

      <div>
        <label className={labelCls} style={labelStyle}>Description</label>
        <textarea name="description" rows={2} defaultValue={product?.description ?? ''}
          className={`${inputCls} resize-none`} placeholder="Optional description…" style={inputStyle} />
      </div>

      {err && <p className="text-sm text-red-400">{err}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950
                   font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {pending && <span className="w-3.5 h-3.5 border-2 border-gray-950/40 border-t-gray-950 rounded-full animate-spin" />}
        {submitLabel}
      </button>
    </form>
  )
}

// ── Category Manager ──────────────────────────────────────────────────────────

function CategoryManager({
  categories, onAdd, onDelete,
}: {
  categories: Category[]
  onAdd: (fd: FormData) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [pending, startTrans] = useTransition()

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTrans(async () => { await onAdd(fd); (e.target as HTMLFormElement).reset() })
  }

  const inputStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input name="name" required placeholder="New category name"
          className={`${inputCls} flex-1`} style={inputStyle} />
        <button type="submit" disabled={pending}
          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 text-sm font-bold transition-all disabled:opacity-50">
          Add
        </button>
      </form>

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {categories.map(c => (
          <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
            <ActionButton variant="danger" size="sm" onClick={() => onDelete(c.id)}>
              Remove
            </ActionButton>
          </div>
        ))}
        {categories.length === 0 && <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No categories yet.</p>}
      </div>
    </div>
  )
}
