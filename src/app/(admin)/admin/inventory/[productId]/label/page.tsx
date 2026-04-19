import { prisma } from '@/lib/prisma'
import { ThermalLabel } from '@/components/pos/thermal-label'
import { notFound } from 'next/navigation'

export default async function LabelPage({
  params,
  searchParams,
}: {
  params:       Promise<{ productId: string }>
  searchParams: Promise<{ copies?: string }>
}) {
  const { productId }  = await params
  const { copies: c }  = await searchParams

  const product = await prisma.product.findUnique({
    where:   { id: productId },
    include: { category: true },
  })

  if (!product) notFound()

  const copies = Math.min(parseInt(c ?? '1'), 100)

  return (
    <div className="thermal-print-area">
      {Array.from({ length: copies }).map((_, i) => (
        <ThermalLabel
          key={i}
          productName={product.name}
          barcode={product.barcode}
          price={Number(product.sellPrice)}
          unit={product.unit}
          storeName="BuildCore"
        />
      ))}
      <script dangerouslySetInnerHTML={{ __html: 'window.print()' }} />
    </div>
  )
}
