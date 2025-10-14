import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    const allowedDomains = ['http://localhost:3000', 'https://bn-alpha.site', 'https://www.bn-alpha.site']
    const isValidOrigin = origin && allowedDomains.includes(origin)
    const isValidReferer = referer && allowedDomains.some(domain => referer.startsWith(domain))

    if (!isValidOrigin && !isValidReferer) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const userAgent = request.headers.get('user-agent')
    const blockedUserAgents = ['curl/', 'wget/', 'python-requests/', 'postman', 'insomnia', 'httpie']

    if (userAgent && blockedUserAgents.some(blocked => userAgent.toLowerCase().includes(blocked))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const response = NextResponse.next()

    // CORS Headers
    response.headers.set('Access-Control-Allow-Origin', origin || allowedDomains[0])
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key')
    response.headers.set('Access-Control-Max-Age', '86400')

    // Security Headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
