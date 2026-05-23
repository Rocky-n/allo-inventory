import { Redis } from '@upstash/redis'

// Initialize the Upstash client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

/**
 * Attempts to acquire a distributed lock for a specific resource.
 * @param lockKey The unique identifier for the lock (e.g., "lock:inventory:product123")
 * @param ttlSeconds How long the lock should live before auto-expiring (prevents deadlocks if the server crashes)
 * @returns boolean indicating if the lock was successfully acquired
 */
export async function acquireLock(lockKey: string, ttlSeconds: number = 5): Promise<boolean> {
  try {
    // The 'nx: true' argument is the magic here. It tells Redis: 
    // "Only set this key if it DOES NOT already exist."
    const result = await redis.set(lockKey, 'locked', {
      ex: ttlSeconds,
      nx: true,
    })
    
    // If result is 'OK', we got the lock. If null, someone else has it.
    return result === 'OK'
  } catch (error) {
    console.error(`Failed to acquire lock for ${lockKey}:`, error)
    return false
  }
}

/**
 * Releases a previously acquired lock.
 * @param lockKey The unique identifier for the lock
 */
export async function releaseLock(lockKey: string): Promise<void> {
  try {
    await redis.del(lockKey)
  } catch (error) {
    console.error(`Failed to release lock for ${lockKey}:`, error)
  }
}