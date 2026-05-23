"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { MapPin, Box, Loader2, ArrowRight } from "lucide-react"

type Product = {
  id: string
  name: string
  stock: { warehouseId: string; warehouseName: string; available: number }[]
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const router = useRouter()

  const fetchProducts = async () => {
    const res = await fetch('/api/products')
    const data = await res.json()
    setProducts(data)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleReserve = async (productId: string, warehouseId: string) => {
    setLoadingId(`${productId}-${warehouseId}`)
    const idempotencyKey = crypto.randomUUID() 

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey 
        },
        body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to reserve item.")
        fetchProducts() 
        return
      }

      toast.success("Item reserved!")
      router.push(`/checkout/${data.id}`)
      
    } catch (error) {
      toast.error("Network error. Please try again.")
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center mb-12 space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Limited Edition Drops
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl">
          Secure your items before they sell out. Our high-speed inventory system reserves your cart for 10 minutes to guarantee a stress-free checkout.
        </p>
      </div>

      {/* Product Grid */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Card key={product.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
            {/* Mock Image Placeholder */}
            <div className="aspect-video bg-slate-100 flex items-center justify-center border-b">
              <Box className="w-12 h-12 text-slate-300" />
            </div>
            
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">{product.name}</CardTitle>
              <CardDescription>Select a fulfillment center</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-3 bg-slate-50/50 pt-4 border-t">
              {product.stock.map((inv) => {
                const isLoading = loadingId === `${product.id}-${inv.warehouseId}`
                const isOutOfStock = inv.available === 0

                return (
                  <div key={inv.warehouseId} className="flex flex-col space-y-3 p-4 bg-white border rounded-xl shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {inv.warehouseName}
                      </div>
                      <Badge variant={isOutOfStock ? "destructive" : "secondary"} className="font-mono">
                        {inv.available} left
                      </Badge>
                    </div>
                    
                    <Button 
                      className="w-full font-semibold"
                      variant={isOutOfStock ? "secondary" : "default"}
                      disabled={isOutOfStock || isLoading}
                      onClick={() => handleReserve(product.id, inv.warehouseId)}
                    >
                      {isLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reserving...</>
                      ) : isOutOfStock ? (
                        "Out of Stock"
                      ) : (
                        <>Reserve Unit <ArrowRight className="ml-2 w-4 h-4" /></>
                      )}
                    </Button>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}