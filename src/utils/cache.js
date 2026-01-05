/**
 * Simple in-memory cache utility for development
 * For production, consider using Redis or similar
 */

class Cache {
  constructor() {
    this.store = new Map();
    this.timers = new Map();
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    const cached = this.store.get(key);
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.delete(key);
      return null;
    }
    
    return cached.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - TTL in seconds
   * @returns {Promise<boolean>}
   */
  async set(key, value, ttl = 300) {
    const expiresAt = Date.now() + (ttl * 1000);
    
    this.store.set(key, { value, expiresAt });
    
    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    
    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl * 1000);
    
    this.timers.set(key, timer);
    return true;
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async delete(key) {
    this.store.delete(key);
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    
    return true;
  }

  /**
   * Clear all cache
   * @returns {Promise<boolean>}
   */
  async clear() {
    this.store.clear();
    
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.timers.clear();
    return true;
  }

  /**
   * Get cache stats
   * @returns {Promise<Object>} Cache statistics
   */
  async stats() {
    return {
      keys: this.store.size,
      items: Array.from(this.store.keys())
    };
  }
}

// Create singleton instance
const cache = new Cache();

module.exports = cache;