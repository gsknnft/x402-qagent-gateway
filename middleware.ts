import { Address } from 'viem'
import { paymentMiddleware, Resource, Network } from 'x402-next'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULTS = {
  address: 'CmGgLQL36Y9ubtTsy2zmE46TAxwCBm66onZmPPhUWNqv' as Address,
  network: 'solana-devnet' as Network,
  facilitatorUrl: 'https://x402.org/facilitator' as Resource,
  cdpClientKey: 'demo-client-key',
}

const address = (process.env.NEXT_PUBLIC_RECEIVER_ADDRESS as Address | undefined) ?? DEFAULTS.address
const network = (process.env.NEXT_PUBLIC_NETWORK as Network | undefined) ?? DEFAULTS.network
const facilitatorUrl =
  (process.env.NEXT_PUBLIC_FACILITATOR_URL as Resource | undefined) ?? DEFAULTS.facilitatorUrl
const cdpClientKey = process.env.NEXT_PUBLIC_CDP_CLIENT_KEY ?? DEFAULTS.cdpClientKey
// const demoMode = process.env.NEXT_PUBLIC_X402_DEMO_MODE === 'skip'
const DEMO_BYPASS_PARAMS = ['demo', 'skipPaywall']

if (process.env.NODE_ENV !== 'production') {
  if (!process.env.NEXT_PUBLIC_RECEIVER_ADDRESS) {
    console.warn('[x402] NEXT_PUBLIC_RECEIVER_ADDRESS not set, defaulting to demo receiver address')
  }
  if (!process.env.NEXT_PUBLIC_CDP_CLIENT_KEY) {
    console.warn('[x402] NEXT_PUBLIC_CDP_CLIENT_KEY not set, using demo client key — set one for production runs')
  }
  // if (demoMode) {
  //   console.warn('[x402] Demo mode enabled — middleware will skip payment checks')
  // }
}

const x402PaymentMiddleware = paymentMiddleware(
  address,
  {
    '/content/cheap': {
      price: '$0.01',
      config: {
        description: 'Access to cheap content',
      },
      network,
    },
    '/content/expensive': {
      price: '$0.25',
      config: {
        description: 'Access to expensive content',
      },
      network,
    },
  },
  {
    url: facilitatorUrl,
  },
  {
    cdpClientKey,
    appLogo: '/logos/x402-examples.png',
    appName: 'x402 Demo',
    sessionTokenEndpoint: '/api/x402/session-token',
  },
)

export const middleware = (req: NextRequest) => {
  // if (demoMode || DEMO_BYPASS_PARAMS.some(param => req.nextUrl.searchParams.has(param))) {
  //   return NextResponse.next()
  // }

  const delegate = x402PaymentMiddleware as unknown as (
    request: NextRequest,
  ) => ReturnType<typeof x402PaymentMiddleware>
  return delegate(req)
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/', // Include the root path explicitly
  ],
}
