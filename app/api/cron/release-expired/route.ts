import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    // Optional: Verify Vercel Cron Secret in production to prevent unauthorized triggers
    const authHeader = request.headers.get('authorization')
    if (
      process.env.NODE_ENV === 'production' && 
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return new Response('Unauthorized', { status: 401 })
    }

    const now = new Date()

    // 1. Find all expired, pending reservations
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: now }
      }
    })

    if (expiredReservations.length === 0) {
      return NextResponse.json({ message: 'No expired reservations to process' })
    }

    // 2. Process each expired reservation transactionally
    let releasedCount = 0
    for (const reservation of expiredReservations) {
      try {
        await prisma.$transaction([
          prisma.reservation.update({
            where: { id: reservation.id },
            data: { status: 'RELEASED' }
          }),
          prisma.inventory.update({
            where: { id: reservation.inventoryId },
            data: { reservedUnits: { decrement: reservation.quantity } }
          })
        ])
        releasedCount++
      } catch (err) {
        console.error(`Failed to release reservation ${reservation.id}:`, err)
      }
    }

    return NextResponse.json({ 
      message: `Successfully released ${releasedCount} expired reservations` 
    })

  } catch (error) {
    console.error('Cron job failed:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}