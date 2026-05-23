"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

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
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Catch the 409 Concurrency / Out of Stock Error
        toast.error(data.error || "Failed to reserve item.")
        fetchProducts() // Refresh stock numbers
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
    <main className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Available Products</h1>
      <div className="grid gap-6 md:grid-cols-2">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle>{product.name}</CardTitle>
              <CardDescription>Select a warehouse to reserve</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.stock.map((inv) => (
                <div key={inv.warehouseId} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{inv.warehouseName}</p>
                    <Badge variant={inv.available > 0 ? "secondary" : "destructive"}>
                      {inv.available} in stock
                    </Badge>
                  </div>
                  <Button 
                    disabled={inv.available === 0 || loadingId === `${product.id}-${inv.warehouseId}`}
                    onClick={() => handleReserve(product.id, inv.warehouseId)}
                  >
                    Reserve 1 Unit
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}