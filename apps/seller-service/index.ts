/**
 * Seller Service - Provides text transformation behind X402 paywall
 * 
 * This simulates a micro-service that sells compute (text transformations)
 * to autonomous agents via X402 payments.
 */

import express from 'express'
import { Address } from 'viem'
import { isValidAddress } from '../../packages/x402-middleware/src/utils'

const app = express()
app.use(express.json())

// Validate seller address from environment
const SELLER_ADDRESS_RAW = process.env.SELLER_ADDRESS || '9iGq3Y62Uva9AKAsM63WtAuggdLQUz6LUCuy8ANRjMEN'
if (!isValidAddress(SELLER_ADDRESS_RAW)) {
  throw new Error(`Invalid SELLER_ADDRESS: ${SELLER_ADDRESS_RAW}`)
}
const SELLER_ADDRESS = SELLER_ADDRESS_RAW as Address

const PORT = process.env.PORT || 3001

// In-memory payment verification (in production, would check blockchain)
const validPayments = new Set<string>()

/**
 * Text transformation endpoint (requires payment)
 */
app.post('/api/transform', async (req, res) => {
  try {
    const { text, operation, paymentSignature } = req.body

    // Verify payment signature
    if (!paymentSignature || !validPayments.has(paymentSignature)) {
      return res.status(402).json({
        error: 'Payment Required',
        vendor: SELLER_ADDRESS,
        price: '$0.01',
        endpoint: '/api/transform',
      })
    }

    // Mark payment as used (prevent replay)
    validPayments.delete(paymentSignature)

    // Perform transformation
    let result: string
    switch (operation) {
      case 'uppercase':
        result = text.toUpperCase()
        break
      case 'lowercase':
        result = text.toLowerCase()
        break
      case 'reverse':
        result = text.split('').reverse().join('')
        break
      default:
        return res.status(400).json({ error: 'Invalid operation' })
    }

    res.json({
      result,
      operation,
      vendor: SELLER_ADDRESS,
      timestamp: Date.now(),
    })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Register payment endpoint (simulates on-chain verification)
 */
app.post('/api/payment/register', async (req, res) => {
  try {
    const { signature, amount, endpoint } = req.body
    
    // In production, would verify on Solana blockchain
    // For demo, just add to valid set
    validPayments.add(signature)
    
    res.json({
      verified: true,
      signature,
      vendor: SELLER_ADDRESS,
    })
  } catch (error) {
    res.status(500).json({ error: 'Payment verification failed' })
  }
})

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    vendor: SELLER_ADDRESS,
    services: ['text-transform'],
    pricing: {
      '/api/transform': '$0.01',
    },
  })
})

app.listen(PORT, () => {
  console.log(`🏪 Seller service running on port ${PORT}`)
  console.log(`💰 Vendor address: ${SELLER_ADDRESS}`)
  console.log(`📝 Offering: Text transformation @ $0.01/request`)
})
