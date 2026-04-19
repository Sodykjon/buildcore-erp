/**
 * Seed script for BuildCore ERP
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
 */
import { PrismaClient, OrderStatus, TransferStatus, WorkOrderStatus } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── helpers ──────────────────────────────────────────────────────────────────

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function rndFloat(min: number, max: number, dp = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(dp))
}
function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(rnd(8, 20), rnd(0, 59), rnd(0, 59), 0)
  return d
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

// ── auth users ────────────────────────────────────────────────────────────────

interface AuthUserDef {
  email: string
  password: string
  fullName: string
  role: 'ADMIN' | 'WAREHOUSE_MANAGER' | 'STAFF'
  storeIndex: number | null
}

const AUTH_USERS: AuthUserDef[] = [
  { email: 'admin@buildcore.com',    password: 'Admin1234!',   fullName: 'Alisher Nazarov',    role: 'ADMIN',             storeIndex: null },
  { email: 'manager1@buildcore.com', password: 'Manager123!',  fullName: 'Bobur Toshmatov',    role: 'WAREHOUSE_MANAGER', storeIndex: 0 },
  { email: 'manager2@buildcore.com', password: 'Manager123!',  fullName: 'Dilnoza Yusupova',   role: 'WAREHOUSE_MANAGER', storeIndex: 1 },
  { email: 'staff1@buildcore.com',   password: 'Staff1234!',   fullName: 'Eldor Raximov',      role: 'STAFF',             storeIndex: 0 },
  { email: 'staff2@buildcore.com',   password: 'Staff1234!',   fullName: 'Feruza Mirzayeva',   role: 'STAFF',             storeIndex: 1 },
  { email: 'wh1@buildcore.com',      password: 'Warehouse1!',  fullName: 'Gʻayrat Sultonov',   role: 'WAREHOUSE_MANAGER', storeIndex: 2 },
  { email: 'cashier1@buildcore.com', password: 'Cashier123!',  fullName: 'Hulkar Qodirov',     role: 'STAFF',             storeIndex: 3 },
]

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting seed…')

  // 1. System config & feature flags
  const configs = [
    { key: 'store_name',         value: 'BuildCore ERP' },
    { key: 'currency',           value: 'UZS' },
    { key: 'low_stock_default',  value: '10' },
    { key: 'loyalty_rate',       value: '1' },
    { key: 'loyalty_redeem_min', value: '100' },
    { key: 'feature_delivery',   value: 'true' },
    { key: 'feature_credit',     value: 'true' },
    { key: 'feature_quotes',     value: 'true' },
    { key: 'feature_ap',         value: 'false' },
  ]
  for (const c of configs) {
    await prisma.systemConfig.upsert({ where: { key: c.key }, update: { value: c.value }, create: c })
  }
  console.log('✓ System config')

  // 2. Stores
  const storeData = [
    { name: 'BuildCore Chilonzor',  address: 'Chilonzor tumani, Toshkent',    phone: '+998712345678' },
    { name: 'BuildCore Yunusobod',  address: 'Yunusobod tumani, Toshkent',    phone: '+998712345679' },
    { name: 'BuildCore Uchtepa',    address: 'Uchtepa tumani, Toshkent',      phone: '+998712345680' },
    { name: 'BuildCore Mirzo Ulug', address: 'Mirzo Ulugʻbek tumani, Toshkent', phone: '+998712345681' },
  ]
  const stores = []
  for (const s of storeData) {
    const existing = await prisma.store.findFirst({ where: { name: s.name } })
    const store = existing ?? await prisma.store.create({ data: s })
    stores.push(store)
  }
  console.log(`✓ ${stores.length} stores`)

  // 3. Auth users + profiles
  const profiles: Array<{ id: string; fullName: string; role: string; storeId: string | null }> = []

  for (const u of AUTH_USERS) {
    // Try to create; if exists, fetch
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: u.email, password: u.password, email_confirm: true,
    })

    let userId: string
    if (created?.user) {
      userId = created.user.id
    } else if (createErr?.message?.includes('already been registered')) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers()
      const existing = list?.users?.find(x => x.email === u.email)
      if (!existing) { console.warn(`⚠ could not find user ${u.email}`); continue }
      userId = existing.id
    } else {
      console.warn(`⚠ ${u.email}: ${createErr?.message}`)
      continue
    }

    const storeId = u.storeIndex !== null ? stores[u.storeIndex].id : null
    const profile = await prisma.profile.upsert({
      where: { id: userId },
      update: { fullName: u.fullName, role: u.role as never, storeId },
      create: { id: userId, email: u.email, fullName: u.fullName, role: u.role as never, storeId },
    })
    profiles.push({ id: profile.id, fullName: profile.fullName, role: profile.role, storeId: profile.storeId })
  }
  console.log(`✓ ${profiles.length} users/profiles`)

  // 4. Categories
  const catData = [
    'Cement & Concrete', 'Steel & Rebar', 'Bricks & Blocks', 'Tiles & Flooring',
    'Paints & Coatings', 'Plumbing', 'Electrical', 'Wood & Lumber',
    'Insulation', 'Tools & Equipment',
  ]
  const categories = []
  for (const name of catData) {
    const cat = await prisma.category.upsert({ where: { name }, update: {}, create: { name } })
    categories.push(cat)
  }
  console.log(`✓ ${categories.length} categories`)

  const catMap = Object.fromEntries(categories.map(c => [c.name, c.id]))

  // 5. Products
  type ProductSeed = {
    sku: string; name: string; unit: string; categoryName: string
    costPrice: number; sellPrice: number; lowStockThreshold: number  // stored on inventory
  }
  const productData: ProductSeed[] = [
    // Cement
    { sku: 'CEM-50KG',  name: 'Portland Cement 50kg',       unit: 'bag',  categoryName: 'Cement & Concrete', costPrice: 45000,  sellPrice: 52000,  lowStockThreshold: 50 },
    { sku: 'CEM-25KG',  name: 'Portland Cement 25kg',       unit: 'bag',  categoryName: 'Cement & Concrete', costPrice: 24000,  sellPrice: 28000,  lowStockThreshold: 30 },
    { sku: 'CON-MIX',   name: 'Ready Mix Concrete M300',    unit: 'm³',   categoryName: 'Cement & Concrete', costPrice: 620000, sellPrice: 720000, lowStockThreshold: 5 },
    // Steel
    { sku: 'RBR-12MM',  name: 'Rebar 12mm (6m)',            unit: 'pcs',  categoryName: 'Steel & Rebar',     costPrice: 38000,  sellPrice: 44000,  lowStockThreshold: 20 },
    { sku: 'RBR-16MM',  name: 'Rebar 16mm (6m)',            unit: 'pcs',  categoryName: 'Steel & Rebar',     costPrice: 67000,  sellPrice: 78000,  lowStockThreshold: 20 },
    { sku: 'WIRE-MESH', name: 'Wire Mesh 2×1m',             unit: 'sheet',categoryName: 'Steel & Rebar',     costPrice: 28000,  sellPrice: 33000,  lowStockThreshold: 15 },
    { sku: 'ANGLE-40',  name: 'Angle Iron 40×40mm (6m)',    unit: 'pcs',  categoryName: 'Steel & Rebar',     costPrice: 52000,  sellPrice: 61000,  lowStockThreshold: 10 },
    // Bricks
    { sku: 'BRK-RED',   name: 'Red Brick (standard)',       unit: 'pcs',  categoryName: 'Bricks & Blocks',   costPrice: 650,    sellPrice: 800,    lowStockThreshold: 500 },
    { sku: 'BLK-GAS',   name: 'Gas Concrete Block 600×300', unit: 'pcs',  categoryName: 'Bricks & Blocks',   costPrice: 8500,   sellPrice: 10000,  lowStockThreshold: 50 },
    { sku: 'BLK-FOAM',  name: 'Foam Block 600×300',         unit: 'pcs',  categoryName: 'Bricks & Blocks',   costPrice: 7200,   sellPrice: 8500,   lowStockThreshold: 50 },
    // Tiles
    { sku: 'TILE-60',   name: 'Floor Tile 60×60cm (white)', unit: 'm²',   categoryName: 'Tiles & Flooring',  costPrice: 85000,  sellPrice: 98000,  lowStockThreshold: 20 },
    { sku: 'TILE-30W',  name: 'Wall Tile 30×60cm',          unit: 'm²',   categoryName: 'Tiles & Flooring',  costPrice: 72000,  sellPrice: 85000,  lowStockThreshold: 20 },
    { sku: 'TILE-GROUT',name: 'Tile Grout 5kg (white)',     unit: 'bag',  categoryName: 'Tiles & Flooring',  costPrice: 12000,  sellPrice: 15000,  lowStockThreshold: 20 },
    { sku: 'TILE-ADH',  name: 'Tile Adhesive 25kg',         unit: 'bag',  categoryName: 'Tiles & Flooring',  costPrice: 35000,  sellPrice: 42000,  lowStockThreshold: 15 },
    // Paint
    { sku: 'PNT-INT-W', name: 'Interior Paint White 20L',   unit: 'can',  categoryName: 'Paints & Coatings', costPrice: 135000, sellPrice: 158000, lowStockThreshold: 10 },
    { sku: 'PNT-EXT',   name: 'Exterior Paint 20L',         unit: 'can',  categoryName: 'Paints & Coatings', costPrice: 165000, sellPrice: 192000, lowStockThreshold: 10 },
    { sku: 'PRIMER-10', name: 'Wall Primer 10L',            unit: 'can',  categoryName: 'Paints & Coatings', costPrice: 55000,  sellPrice: 65000,  lowStockThreshold: 10 },
    // Plumbing
    { sku: 'PIPE-20PP', name: 'PP Pipe 20mm (4m)',          unit: 'pcs',  categoryName: 'Plumbing',          costPrice: 8500,   sellPrice: 10500,  lowStockThreshold: 20 },
    { sku: 'PIPE-32PP', name: 'PP Pipe 32mm (4m)',          unit: 'pcs',  categoryName: 'Plumbing',          costPrice: 14000,  sellPrice: 17000,  lowStockThreshold: 15 },
    { sku: 'PLB-VALV',  name: 'Ball Valve 25mm',            unit: 'pcs',  categoryName: 'Plumbing',          costPrice: 12000,  sellPrice: 15500,  lowStockThreshold: 10 },
    // Electrical
    { sku: 'WIRE-2.5',  name: 'Electric Wire 2.5mm² (100m)',unit: 'roll', categoryName: 'Electrical',        costPrice: 185000, sellPrice: 215000, lowStockThreshold: 5 },
    { sku: 'WIRE-1.5',  name: 'Electric Wire 1.5mm² (100m)',unit: 'roll', categoryName: 'Electrical',        costPrice: 120000, sellPrice: 140000, lowStockThreshold: 5 },
    { sku: 'SOCKET-EU', name: 'EU Socket Outlet',           unit: 'pcs',  categoryName: 'Electrical',        costPrice: 8500,   sellPrice: 11000,  lowStockThreshold: 20 },
    // Wood
    { sku: 'PLWD-18',   name: 'Plywood 18mm 2.44×1.22m',   unit: 'sheet',categoryName: 'Wood & Lumber',     costPrice: 145000, sellPrice: 168000, lowStockThreshold: 10 },
    { sku: 'PLWD-12',   name: 'Plywood 12mm 2.44×1.22m',   unit: 'sheet',categoryName: 'Wood & Lumber',     costPrice: 98000,  sellPrice: 115000, lowStockThreshold: 10 },
    { sku: 'BEAM-100',  name: 'Timber Beam 100×100mm (6m)', unit: 'pcs',  categoryName: 'Wood & Lumber',     costPrice: 95000,  sellPrice: 115000, lowStockThreshold: 8 },
    // Insulation
    { sku: 'INS-ROCK',  name: 'Rock Wool 100mm (pack)',     unit: 'pack', categoryName: 'Insulation',        costPrice: 155000, sellPrice: 182000, lowStockThreshold: 5 },
    { sku: 'INS-FOAM',  name: 'Foam Board 50mm (6m²)',      unit: 'pack', categoryName: 'Insulation',        costPrice: 88000,  sellPrice: 105000, lowStockThreshold: 5 },
    // Tools
    { sku: 'TOOL-DRILL',name: 'Rotary Hammer Drill 850W',   unit: 'pcs',  categoryName: 'Tools & Equipment', costPrice: 485000, sellPrice: 560000, lowStockThreshold: 3 },
    { sku: 'TOOL-MIXER',name: 'Concrete Mixer 130L',        unit: 'pcs',  categoryName: 'Tools & Equipment', costPrice: 1850000,sellPrice: 2100000,lowStockThreshold: 2 },
    { sku: 'TOOL-LEVEL',name: 'Spirit Level 1.2m',          unit: 'pcs',  categoryName: 'Tools & Equipment', costPrice: 45000,  sellPrice: 56000,  lowStockThreshold: 5 },
    { sku: 'TOOL-TAPE', name: 'Measuring Tape 5m',          unit: 'pcs',  categoryName: 'Tools & Equipment', costPrice: 12000,  sellPrice: 16000,  lowStockThreshold: 10 },
  ]

  const products = []
  let barcodeSeq = 1000000000000
  for (const p of productData) {
    const barcode = String(barcodeSeq++)
    const prod = await prisma.product.upsert({
      where: { sku: p.sku },
      update: { name: p.name, unit: p.unit, categoryId: catMap[p.categoryName], costPrice: p.costPrice, sellPrice: p.sellPrice, isActive: true },
      create: { sku: p.sku, barcode, name: p.name, unit: p.unit, categoryId: catMap[p.categoryName], costPrice: p.costPrice, sellPrice: p.sellPrice, isActive: true },
    })
    products.push(prod)
  }
  console.log(`✓ ${products.length} products`)

  // 6. Store inventory
  const productDataMap = Object.fromEntries(productData.map(p => [p.sku, p]))
  for (const store of stores) {
    for (const product of products) {
      const qty = rnd(0, 200)
      const threshold = productDataMap[product.sku]?.lowStockThreshold ?? 10
      await prisma.storeInventory.upsert({
        where: { storeId_productId: { storeId: store.id, productId: product.id } },
        update: {},
        create: {
          storeId: store.id,
          productId: product.id,
          quantityOnHand: qty,
          quantityReserved: 0,
          lowStockThreshold: threshold,
        },
      })
    }
  }
  console.log(`✓ Store inventory (${stores.length * products.length} records)`)

  // 7. Customers
  const customerData = [
    { fullName: 'Jasur Qodirov',       phone: '+998901234567', email: 'jasur@example.com',     loyaltyPoints: 350 },
    { fullName: 'Malika Tursunova',     phone: '+998901234568', email: 'malika@example.com',    loyaltyPoints: 120 },
    { fullName: 'Sanjar Ergashev',      phone: '+998901234569', email: 'sanjar@example.com',    loyaltyPoints: 800 },
    { fullName: 'Nodira Xoliqova',      phone: '+998901234570', email: null,                    loyaltyPoints: 0 },
    { fullName: 'Behruz Mirzayev',      phone: '+998901234571', email: 'behruz@example.com',    loyaltyPoints: 1250 },
    { fullName: 'Zulfiya Rahimova',     phone: '+998901234572', email: null,                    loyaltyPoints: 50 },
    { fullName: 'Otabek Nishonov',      phone: '+998901234573', email: 'otabek@example.com',    loyaltyPoints: 430 },
    { fullName: 'Shahlo Yuldosheva',    phone: '+998901234574', email: null,                    loyaltyPoints: 200 },
    { fullName: 'Ulugbek Sobirov',      phone: '+998901234575', email: 'ulugbek@example.com',   loyaltyPoints: 0 },
    { fullName: 'Kamola Hasanova',      phone: '+998901234576', email: 'kamola@example.com',    loyaltyPoints: 900 },
    { fullName: 'Rustam Muxtarov',      phone: '+998901234577', email: null,                    loyaltyPoints: 75 },
    { fullName: 'Nilufar Azimova',      phone: '+998901234578', email: 'nilufar@example.com',   loyaltyPoints: 600 },
  ]

  const customers = []
  for (const c of customerData) {
    const cust = await prisma.customer.upsert({
      where: { phone: c.phone },
      update: {},
      create: { fullName: c.fullName, phone: c.phone, email: c.email, loyaltyPoints: c.loyaltyPoints },
    })
    customers.push(cust)
  }
  console.log(`✓ ${customers.length} customers`)

  // 8. Suppliers
  const supplierData = [
    { name: 'ToshSement JSC',       contact: 'Anvar Sobirov',  phone: '+998712001001', email: 'anvar@toshsement.uz' },
    { name: 'UzMetall Group',       contact: 'Bekzod Aliev',   phone: '+998712001002', email: 'bekzod@uzmetall.uz' },
    { name: 'QurilishMateriallar',  contact: 'Iroda Nazarova', phone: '+998712001003', email: null },
    { name: 'GlobalBuild Import',   contact: 'Denis Petrov',   phone: '+998712001004', email: 'denis@globalbuild.uz' },
  ]
  const suppliers = []
  for (const s of supplierData) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } })
    const sup = existing ?? await prisma.supplier.create({ data: s })
    suppliers.push(sup)
  }
  console.log(`✓ ${suppliers.length} suppliers`)

  // 9. Orders (90 days history)
  const adminProfile   = profiles.find(p => p.role === 'ADMIN')!
  const staffProfiles  = profiles.filter(p => ['STAFF','WAREHOUSE_MANAGER'].includes(p.role))

  const allStatuses: OrderStatus[] = ['PAID', 'PAID', 'PAID', 'PARTIAL', 'FULFILLED', 'PENDING', 'CANCELLED']
  let orderCount = await prisma.order.count()
  const createdOrders = []

  for (let day = 89; day >= 0; day--) {
    const ordersToday = rnd(2, 8)
    for (let o = 0; o < ordersToday; o++) {
      const store    = pick(stores)
      const staff    = staffProfiles.length > 0 ? pick(staffProfiles) : adminProfile
      const customer = pick(customers)
      const status   = pick(allStatuses)
      const createdAt = daysAgo(day)

      // 2-5 line items
      const numItems = rnd(2, 5)
      const chosenProducts = shuffle(products).slice(0, numItems)
      const items = chosenProducts.map(p => ({
        productId: p.id,
        unitPrice: Number(p.sellPrice),
        quantityOrdered: rnd(1, 10),
      }))
      const totalAmount = items.reduce((s, i) => s + i.unitPrice * i.quantityOrdered, 0)

      orderCount++
      const orderNumber = `ORD-${String(orderCount).padStart(6, '0')}`

      try {
        const order = await prisma.order.create({
          data: {
            orderNumber, storeId: store.id, customerId: customer.id,
            staffId: staff.id, status, totalAmount, createdAt,
            items: { create: items },
          },
        })
        createdOrders.push(order)
      } catch (_) {
        // skip duplicates silently
      }
    }
  }
  console.log(`✓ ${createdOrders.length} orders`)

  // 10. Loyalty transactions (for PAID orders)
  const paidOrders = createdOrders.filter(o => ['PAID','FULFILLED'].includes(o.status as string))
  for (const order of paidOrders.slice(0, 150)) {
    const pts = Math.floor(Number(order.totalAmount) / 10000)
    if (pts > 0) {
      await prisma.loyaltyTransaction.create({
        data: {
          customerId: order.customerId,
          orderId: order.id,
          type: 'EARN',
          points: pts,
          note: `Order ${order.orderNumber}`,
          createdAt: order.createdAt,
        },
      }).catch(() => {})
    }
  }
  console.log('✓ Loyalty transactions')

  // 11. Low stock alerts (for items below threshold)
  const inventories = await prisma.storeInventory.findMany({
    include: { product: true, store: true },
  })
  let alertCount = 0
  for (const inv of inventories) {
    if (inv.quantityOnHand <= inv.product.lowStockThreshold) {
      await prisma.lowStockAlert.create({
        data: {
          storeId: inv.storeId,
          productId: inv.productId,
          currentQty: inv.quantityOnHand,
          threshold: inv.product.lowStockThreshold,
          isRead: Math.random() > 0.6,
        },
      }).catch(() => {})
      alertCount++
    }
  }
  console.log(`✓ ${alertCount} low stock alerts`)

  // 12. Purchase orders
  const poStatuses = ['DRAFT', 'ORDERED', 'RECEIVED', 'PARTIAL'] as const
  for (let i = 0; i < 5; i++) {
    const supplier = pick(suppliers)
    const store    = pick(stores)
    const staff    = adminProfile
    const poItems  = shuffle(products).slice(0, rnd(3, 6)).map(p => ({
      productId: p.id,
      quantity: rnd(20, 100),
      unitCost: Number(p.costPrice),
    }))
    const total = poItems.reduce((s, it) => s + it.quantity * it.unitCost, 0)
    await prisma.purchaseOrder.create({
      data: {
        poNumber:    `PO-${String(i + 1).padStart(5, '0')}`,
        supplierId:  supplier.id,
        storeId:     store.id,
        staffId:     staff.id,
        status:      pick(poStatuses) as never,
        totalCost:   total,
        notes:       null,
        items: { create: poItems },
      },
    }).catch(() => {})
  }
  console.log('✓ Purchase orders')

  // 13. Work orders
  const woStatuses: WorkOrderStatus[] = ['DRAFT', 'SUBMITTED', 'IN_PROGRESS', 'COMPLETED']
  for (let i = 0; i < 5; i++) {
    const store  = pick(stores)
    const staff  = adminProfile
    await prisma.workOrder.create({
      data: {
        woNumber:    `WO-${String(i + 1).padStart(5, '0')}`,
        storeId:     store.id,
        staffId:     staff.id,
        title:       pick(['Floor Tile Installation', 'Plumbing Repair', 'Painting Interior', 'Concrete Mixing', 'Roof Insulation']),
        description: 'Work order auto-generated by seed',
        status:      pick(woStatuses),
        scheduledAt: daysAgo(rnd(-5, 30)),
      },
    }).catch(() => {})
  }
  console.log('✓ Work orders')

  // 14. Store transfers
  const transferStatuses: TransferStatus[] = ['PENDING', 'APPROVED', 'SHIPPED', 'RECEIVED']
  for (let i = 0; i < 4; i++) {
    const [fromStore, toStore] = shuffle(stores).slice(0, 2)
    const product = pick(products)
    await prisma.storeTransfer.create({
      data: {
        fromStoreId:  fromStore.id,
        toStoreId:    toStore.id,
        productId:    product.id,
        quantity:     rnd(5, 30),
        status:       pick(transferStatuses),
        requestedById: adminProfile.id,
        notes:        'Transfer auto-generated by seed',
      },
    }).catch(() => {})
  }
  console.log('✓ Store transfers')

  // 15. Quotations
  const quoteStatuses = ['DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED'] as const
  let quoteCount = 0
  for (let i = 0; i < 8; i++) {
    const store    = pick(stores)
    const customer = pick(customers)
    const staff    = profiles.find(p => p.role === 'ADMIN') || profiles[0]
    const qItems   = shuffle(products).slice(0, rnd(2, 4)).map(p => ({
      productId: p.id,
      quantity:  rnd(1, 10),
      unitPrice: Number(p.sellPrice),
    }))
    quoteCount++
    await prisma.quotation.create({
      data: {
        quoteNumber: `QT-${String(quoteCount).padStart(5, '0')}`,
        storeId:     store.id,
        customerId:  customer.id,
        staffId:     staff.id,
        status:      pick(quoteStatuses) as never,
        expiresAt:   new Date(Date.now() + rnd(3, 30) * 86400000),
        notes:       'Quotation auto-generated by seed',
        items: { create: qItems },
      },
    }).catch(() => {})
  }
  console.log(`✓ ${quoteCount} quotations`)

  // 16. Credit accounts (for top customers)
  const creditCustomers = customers.slice(0, 4)
  for (const c of creditCustomers) {
    await prisma.creditAccount.upsert({
      where: { customerId: c.id },
      update: {},
      create: {
        customerId:   c.id,
        creditLimit:  rnd(5, 20) * 1000000,
        outstanding:  rnd(0, 3) * 1000000,
        status:       'ACTIVE',
      },
    }).catch(() => {})
  }
  console.log('✓ Credit accounts')

  // 17. Deliveries (for some recent orders)
  const recentPaid = createdOrders.filter(o => o.status === 'PAID').slice(0, 6)
  const deliveryStatuses = ['PENDING', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const
  for (const order of recentPaid) {
    await prisma.delivery.create({
      data: {
        orderId:       order.id,
        driverName:    pick(['Akbar Sobirov', 'Mirzo Toshev', 'Jahongir Aliev']),
        driverPhone:   `+99890${rnd(1000000, 9999999)}`,
        scheduledAt:   new Date(order.createdAt.getTime() + 86400000),
        status:        pick(deliveryStatuses) as never,
        deliveredAt:   null,
        notes:         null,
      },
    }).catch(() => {})
  }
  console.log('✓ Deliveries')

  console.log('\n✅ Seed complete!')
  console.log('\nLogin credentials:')
  for (const u of AUTH_USERS) {
    console.log(`  ${u.role.padEnd(10)} ${u.email} / ${u.password}`)
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })
