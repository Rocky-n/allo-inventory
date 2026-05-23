import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const id = resolvedParams.id
    
    // 1. Fetch the reservation
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { inventory: true }
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // 2. Check if it's already processed
    if (reservation.status !== 'PENDING') {
      return NextResponse.json({ error: `Reservation is already ${reservation.status}` }, { status: 400 })
    }

    // 3. Check for Expiration (Requirement: Return 410 if expired)
    if (new Date() > reservation.expiresAt) {
      // Note: A cron job usually cleans this up, but we double-check here just in case.
      return NextResponse.json({ error: 'Reservation has expired' }, { status: 410 })
    }

    // 4. Database Transaction
    // Update the reservation status AND finalize the inventory numbers safely
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

    return NextResponse.json(confirmedReservation, { status: 200 })

  } catch (error) {
    console.error('Confirm Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}