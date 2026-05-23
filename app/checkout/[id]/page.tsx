"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

type Reservation = {
  id: string
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED'
  expiresAt: string
  quantity: number
}

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const loadReservation = async () => {
      const mockExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString()
      setReservation({ id: resolvedParams.id, status: 'PENDING', expiresAt: mockExpiry, quantity: 1 })
    }
    loadReservation()
  }, [resolvedParams.id])

  useEffect(() => {
    if (!reservation || reservation.status !== 'PENDING') return

    const interval = setInterval(() => {
      const now = new Date().getTime()
      const expiry = new Date(reservation.expiresAt).getTime()
      const distance = expiry - now

      if (distance <= 0) {
        clearInterval(interval)
        setTimeLeft(0)
        toast.error("Your reservation has expired.")
        router.push('/')
      } else {
        setTimeLeft(Math.floor(distance / 1000))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [reservation, router])

  const handleAction = async (action: 'confirm' | 'release') => {
    setIsProcessing(true)
    // Generate a unique ID for this specific confirmation/cancellation attempt
    const idempotencyKey = crypto.randomUUID()

    try {
      const res = await fetch(`/api/reservations/${resolvedParams.id}/${action}`, {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey
        }
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || `Failed to ${action} reservation.`)
        if (res.status === 410) router.push('/')
        return
      }

      setReservation({ ...reservation!, status: data.status })
      toast.success(action === 'confirm' ? "Purchase confirmed!" : "Reservation cancelled.")
      
      if (action === 'release') {
        setTimeout(() => router.push('/'), 1500)
      }
    } catch (error) {
      toast.error("Network error.")
    } finally {
      setIsProcessing(false)
    }
  }

  if (!reservation) return <div className="p-8 text-center">Loading secure checkout...</div>

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <main className="container mx-auto p-8 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Checkout
            <Badge variant={
              reservation.status === 'CONFIRMED' ? 'default' : 
              reservation.status === 'RELEASED' ? 'destructive' : 'outline'
            }>
              {reservation.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {reservation.status === 'PENDING' && timeLeft > 0 && (
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Time remaining to complete purchase</p>
              <p className="text-3xl font-mono font-bold text-red-500">{formatTime(timeLeft)}</p>
            </div>
          )}
          <div className="border-t pt-4">
            <p className="font-medium">Order Summary</p>
            <div className="flex justify-between text-sm mt-2">
              <span>Item Quantity</span>
              <span>{reservation.quantity} Unit(s)</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          <Button 
            variant="outline" 
            onClick={() => handleAction('release')}
            disabled={reservation.status !== 'PENDING' || isProcessing}
          >
            Cancel Order
          </Button>
          <Button 
            onClick={() => handleAction('confirm')}
            disabled={reservation.status !== 'PENDING' || isProcessing || timeLeft === 0}
          >
            Confirm Purchase
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}