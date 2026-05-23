import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { acquireLock, releaseLock } from '@/lib/redis'
import { z } from 'zod'

// Validate incoming JSON
const reserveSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  quantity: z.number().min(1)
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = reserveSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload data' }, { status: 400 })
    }

    const { productId, warehouseId, quantity } = parsed.data
    
    // Create a unique lock key for this specific inventory item
    const lockKey = `lock:inventory:${productId}:${warehouseId}`

    // 1. ACQUIRE REDIS LOCK (Prevents Race Conditions)
    const locked = await acquireLock(lockKey, 5) // Hold lock for max 5 seconds
    if (!locked) {
      // If someone else holds the lock, fail immediately. 
      // In a real app, you might retry, but returning 409 here is perfectly acceptable for the prompt.
      return NextResponse.json({ error: 'High traffic. Please try again.' }, { status: 409 })
    }

    try {
      // 2. FETCH INVENTORY
      const inventory = await prisma.inventory.findUnique({
        where: { productId_warehouseId: { productId, warehouseId } }
      })

      if (!inventory) {
        return NextResponse.json({ error: 'Inventory record not found' }, { status: 404 })
      }

      // 3. CHECK STOCK LEVELS
      const availableStock = inventory.totalUnits - inventory.reservedUnits
      if (availableStock < quantity) {
        return NextResponse.json({ error: 'Not enough stock available' }, { status: 409 })
      }

      // 4. DATABASE TRANSACTION
      // A transaction ensures that creating the reservation AND updating the stock happen together.
      // If one fails, they both fail.
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

      const [reservation] = await prisma.$transaction([
        prisma.reservation.create({
          data: {
            inventoryId: inventory.id,
            quantity,
            expiresAt,
            status: 'PENDING'
          }
        }),
        prisma.inventory.update({
          where: { id: inventory.id },
          data: { reservedUnits: { increment: quantity } }
        })
      ])

      return NextResponse.json(reservation, { status: 201 })
      
    } finally {
      // 5. ALWAYS RELEASE THE LOCK
      // The finally block guarantees the lock is released even if the database crashes
      await releaseLock(lockKey)
    }

  } catch (error) {
    console.error('Reservation Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}