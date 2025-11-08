import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'

import { TELEMETRY_LOG_PATH } from '@/lib/telemetry'

export async function GET() {
  try {
    const content = await readFile(TELEMETRY_LOG_PATH, 'utf-8')
    return new NextResponse(content, {
      headers: {
        'content-type': 'application/jsonl; charset=utf-8',
      },
    })
  } catch (error) {
    if (isEnoent(error)) {
      return new NextResponse('', {
        headers: {
          'content-type': 'application/jsonl; charset=utf-8',
        },
      })
    }
    throw error
  }
}

function isEnoent(error: unknown): error is NodeJS.ErrnoException {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT')
}
