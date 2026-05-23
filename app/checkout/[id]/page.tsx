"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Timer, CheckCircle2, XCircle, ShoppingBag, Loader2 } from "lucide-react"

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

  if (!reservation) return <div className="p-8 text-center flex justify-center items-center h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-lg">
      <Card className="border-slate-200 shadow-lg overflow-hidden">
        {/* Status Header */}
        <div className={`h-2 w-full ${
          reservation.status === 'CONFIRMED' ? 'bg-green-500' : 
          reservation.status === 'RELEASED' ? 'bg-red-500' : 'bg-primary'
        }`} />
        
        <CardHeader className="space-y-1 pb-6">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Secure Checkout
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">Order ID: <span className="font-mono text-xs">{reservation.id.split('-')[0]}</span></p>
            </div>
            <Badge variant={
              reservation.status === 'CONFIRMED' ? 'default' : 
              reservation.status === 'RELEASED' ? 'destructive' : 'secondary'
            } className="px-3 py-1 text-xs uppercase tracking-wider">
              {reservation.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Active Timer Alert */}
          {reservation.status === 'PENDING' && timeLeft > 0 && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3 text-red-600">
                <Timer className="w-5 h-5 animate-pulse" />
                <span className="font-medium text-sm">Hold expires in</span>
              </div>
              <span className="text-2xl font-mono font-bold text-red-600 tracking-tighter">
                {formatTime(timeLeft)}
              </span>
            </div>
          )}

          {/* Receipt Details */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Order Summary</p>
            <div className="flex justify-between text-sm items-center">
              <span className="text-slate-600 font-medium">Reserved Quantity</span>
              <span className="font-semibold bg-white px-2 py-1 rounded border shadow-sm">{reservation.quantity} Unit(s)</span>
            </div>
            <div className="flex justify-between text-sm items-center pt-2 border-t border-slate-200">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-medium">₹12,499</span>
            </div>
          </div>
        </CardContent>

        {/* FIX: grid-cols-2 forces both buttons to take up exactly 50% space */}
        <CardFooter className="grid grid-cols-2 gap-3 border-t bg-slate-50/50 p-6">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => handleAction('release')}
            disabled={reservation.status !== 'PENDING' || isProcessing}
          >
            {isProcessing && reservation.status === 'PENDING' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
            Cancel
          </Button>
          <Button 
            className="w-full"
            onClick={() => handleAction('confirm')}
            disabled={reservation.status !== 'PENDING' || isProcessing || timeLeft === 0}
          >
            {isProcessing && reservation.status === 'PENDING' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Confirm Pay
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}