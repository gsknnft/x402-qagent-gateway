import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

const DOC_MAP: Record<string, string> = {
  architecture: 'ARCHITECTURE.md',
  storyboard: 'DEMO_STORYBOARD.md',
  submission: 'SUBMISSION.md',
  readme: 'README.md',
  sigilnet: 'SIGILNET_INTEGRATION.md',
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params
  const key = slug?.toLowerCase()
  const target = DOC_MAP[key]

  if (!target) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  try {
    const content = await readFile(path.join(process.cwd(), target), 'utf-8')
    return new NextResponse(content, {
      headers: {
        'content-type': 'text/markdown; charset=utf-8',
      },
    })
  } catch (error) {
    if (isEnoent(error)) {
      return NextResponse.json({ error: 'Document missing' }, { status: 404 })
    }
    throw error
  }
}

function isEnoent(error: unknown): error is NodeJS.ErrnoException {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT')
}
