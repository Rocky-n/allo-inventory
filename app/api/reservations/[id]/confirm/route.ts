import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. IDEMPOTENCY CHECK
    const idempotencyKey = req.headers.get('idempotency-key')
    const redisKey = idempotencyKey ? `idemp:confirm:${idempotencyKey}` : null

    if (redisKey) {
      const cached = await redis.get<{ body: any, status: number }>(redisKey)
      if (cached) {
        return NextResponse.json(cached.body, { status: cached.status })
      }
    }

    const resolvedParams = await params
    const id = resolvedParams.id
    
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { inventory: true }
    })

    if (!reservation) return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    if (reservation.status !== 'PENDING') return NextResponse.json({ error: `Reservation is already ${reservation.status}` }, { status: 400 })
    if (new Date() > reservation.expiresAt) return NextResponse.json({ error: 'Reservation has expired' }, { status: 410 })

    const [confirmedReservation] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id },
        data: { status: 'CONFIRMED' }
      }),
      prisma.inventory.update({
        where: { id: reservation.inventoryId },
        data: {
          totalUnits: { decrement: reservation.quantity },
          reservedUnits: { decrement: reservation.quantity }
        }
      })
    ])

    // 2. IDEMPOTENCY SAVE
    if (redisKey) {
      await redis.set(redisKey, { body: confirmedReservation, status: 200 }, { ex: 86400 })
    }

    return NextResponse.json(confirmedReservation, { status: 200 })

  } catch (error) {
    console.error('Confirm Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}