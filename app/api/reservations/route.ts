import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { acquireLock, releaseLock, redis } from '@/lib/redis' // imported redis here
import { z } from 'zod'

const reserveSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  quantity: z.number().min(1)
})

export async function POST(req: Request) {
  try {
    // 1. IDEMPOTENCY CHECK: Look for the header
    const idempotencyKey = req.headers.get('idempotency-key')
    const redisKey = idempotencyKey ? `idemp:reserve:${idempotencyKey}` : null

    if (redisKey) {
      // Check if we already processed this exact request
      const cached = await redis.get<{ body: any, status: number }>(redisKey)
      if (cached) {
        console.log("Idempotency cache hit! Returning saved response.")
        return NextResponse.json(cached.body, { status: cached.status })
      }
    }

    const body = await req.json()
    const parsed = reserveSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload data' }, { status: 400 })
    }

    const { productId, warehouseId, quantity } = parsed.data
    const lockKey = `lock:inventory:${productId}:${warehouseId}`

    const locked = await acquireLock(lockKey, 5)
    if (!locked) {
      return NextResponse.json({ error: 'High traffic. Please try again.' }, { status: 409 })
    }

    try {
      const inventory = await prisma.inventory.findUnique({
        where: { productId_warehouseId: { productId, warehouseId } }
      })

      if (!inventory) return NextResponse.json({ error: 'Inventory record not found' }, { status: 404 })

      const availableStock = inventory.totalUnits - inventory.reservedUnits
      if (availableStock < quantity) {
        return NextResponse.json({ error: 'Not enough stock available' }, { status: 409 })
      }

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

      const [reservation] = await prisma.$transaction([
        prisma.reservation.create({
          data: { inventoryId: inventory.id, quantity, expiresAt, status: 'PENDING' }
        }),
        prisma.inventory.update({
          where: { id: inventory.id },
          data: { reservedUnits: { increment: quantity } }
        })
      ])

      // 2. IDEMPOTENCY SAVE: Cache the successful response in Redis for 24 hours
      if (redisKey) {
        await redis.set(redisKey, { body: reservation, status: 201 }, { ex: 86400 })
      }

      return NextResponse.json(reservation, { status: 201 })
      
    } finally {
      await releaseLock(lockKey)
    }

  } catch (error) {
    console.error('Reservation Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}