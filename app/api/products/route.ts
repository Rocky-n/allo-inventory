import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        inventories: {
          include: { warehouse: true }
        }
      }
    })
    
    // Calculate the real available stock (total - reserved)
    const formattedProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      stock: p.inventories.map(inv => ({
        warehouseId: inv.warehouse.id,
        warehouseName: inv.warehouse.name,
        available: inv.totalUnits - inv.reservedUnits
      }))
    }))
    
    return NextResponse.json(formattedProducts)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}