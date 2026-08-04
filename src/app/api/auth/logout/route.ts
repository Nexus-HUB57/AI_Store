import { NextResponse } from 'next/server'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/aistore'

export async function POST() {
  const res = NextResponse.json({ loggedOut: true })
  res.cookies.set('agent_id', '', {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', path: basePath + '/', maxAge: 0,
  })
  return res
}
