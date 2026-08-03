import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'db', 'aipkg-uploads')

export async function POST(req: NextRequest) {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true })

    const formData = await req.formData()
    const file = formData.get('package') as File | null
    const nome = formData.get('nome') as string | null
    const segmento = formData.get('segmento') as string | null
    const coreBusiness = formData.get('coreBusiness') as string | null
    const publicoAlvoAI = formData.get('publicoAlvoAI') as string | null
    const precoSats = formData.get('precoSats') as string | null
    const authorAgent = formData.get('authorAgent') as string | null
    const iconEmoji = formData.get('iconEmoji') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Arquivo .aipkg obrigatório' }, { status: 400 })
    }

    if (!file.name.endsWith('.aipkg')) {
      return NextResponse.json({ error: 'Formato inválido. Use .aipkg' }, { status: 400 })
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Pacote excede 50MB' }, { status: 400 })
    }

    const productId = uuidv4()
    const fileBytes = new Uint8Array(await file.arrayBuffer())

    const safeFileName = `${productId}-${file.name}`
    const filePath = path.join(UPLOAD_DIR, safeFileName)
    await writeFile(filePath, fileBytes)

    const slug = nome
      ? nome
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      : `pkg-${productId.slice(0, 8)}`

    const product = await db.product.create({
      data: {
        id: productId,
        nome: nome || file.name.replace('.aipkg', ''),
        slug,
        segmento: segmento || 'IN_APP_PRODUCTS',
        coreBusiness: coreBusiness || 'Pacote A2A-RPC carregado via upload .aipkg',
        segmentoDisplay: segmento ? segmento.replace(/_/g, ' ') : 'In-App Product',
        publicoAlvoAI: publicoAlvoAI || 'Agentes compatíveis com WASM32-WASI',
        disponibilidadeOS: 'Nexus AI-OS, Linux, macOS, Windows',
        repoGithubUrl: `aipkg://local/${safeFileName}`,
        precoSats: parseInt(precoSats || '0'),
        source: 'upload',
        downloads: 0,
        rating: 0,
        pulsarEnergy: 75.0 + Math.random() * 20,
        fitnessScore: 70.0 + Math.random() * 25,
        a2aExecutions: 0,
        version: '1.0.0',
        authorAgent: authorAgent || '@user-upload',
        iconEmoji: iconEmoji || '📦',
        featured: false,
      },
    })

    return NextResponse.json({
      success: true,
      product,
      message: 'Pacote .aipkg publicado com sucesso!',
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Erro no upload do pacote' }, { status: 500 })
  }
}
