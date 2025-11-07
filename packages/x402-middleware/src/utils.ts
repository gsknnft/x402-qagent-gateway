/**
 * Utility functions for price conversion and validation
 */

/**
 * Convert USD price string to lamports
 * @param price USD price (e.g., "$0.01")
 * @param solPriceUSD Price of SOL in USD (defaults to env var or 150)
 */
export function usdToLamports(price: string, solPriceUSD?: number): number {
  const usd = parseFloat(price.replace('$', ''))
  
  if (isNaN(usd) || usd < 0) {
    throw new Error(`Invalid USD price: ${price}`)
  }

  // Use provided SOL price, environment variable, or default
  const solPrice = solPriceUSD || 
                   parseFloat(process.env.SOL_USD_PRICE || '150')
  
  if (isNaN(solPrice) || solPrice <= 0) {
    throw new Error(`Invalid SOL price: ${solPrice}`)
  }

  const sol = usd / solPrice
  const lamports = Math.floor(sol * 1e9)
  
  return lamports
}

/**
 * Validate signature format
 */
export function isValidSignature(signature: string): boolean {
  // Solana signatures are 88 characters base58
  // For simulation, accept sim_ prefix
  if (signature.startsWith('sim_')) {
    return signature.length > 4
  }
  
  // Real Solana signature validation
  return signature.length === 88 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(signature)
}

/**
 * Validate address format (simplified)
 */
export function isValidAddress(address: string): boolean {
  // Solana addresses are 32-44 characters base58
  if (!address || address.length < 32) {
    return false
  }
  
  // For demo, allow any reasonable string
  return address.length >= 10 && address.length <= 50
}
