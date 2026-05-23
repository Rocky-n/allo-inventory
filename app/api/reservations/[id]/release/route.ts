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
      where: { id }
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // 2. Check if it's already processed
    if (reservation.status !== 'PENDING') {
      return NextResponse.json({ error: `Reservation is already ${reservation.status}` }, { status: 400 })
    }

    // 3. Database Transaction
    // Update the reservation status AND free up the reserved units
    const [releasedReservation] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id },
        data: { status: 'RELEASED' }
      }),
      prisma.inventory.update({
        where: { id: reservation.inventoryId },
        data: { reservedUnits: { decrement: reservation.quantity } }
      })
    ])

    return NextResponse.json(releasedReservation, { status: 200 })

  } catch (error) {
    console.error('Release Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}