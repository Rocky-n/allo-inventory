import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Initialize the PostgreSQL adapter
const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })

// Pass the adapter to Prisma 7
const prisma = new PrismaClient({ adapter })

async function main() {
  // Create a Warehouse
  const warehouse = await prisma.warehouse.create({
    data: {
      name: 'Chennai Central Hub',
      location: 'Chennai, TN',
    },
  })

  // Create a Product
  const product = await prisma.product.create({
    data: {
      name: 'Mechanical Keyboard v2',
    },
  })

  // Set up Initial Inventory (10 total units, 0 reserved)
  await prisma.inventory.create({
    data: {
      productId: product.id,
      warehouseId: warehouse.id,
      totalUnits: 10,
      reservedUnits: 0,
    },
  })

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })