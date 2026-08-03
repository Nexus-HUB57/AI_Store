import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ loggedOut: true })
  res.cookies.set('agent_id', '', {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', path: '/', maxAge: 0,
  })
  return res
}
