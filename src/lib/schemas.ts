import { z } from 'zod'

// ─── Auth ───
export const loginSchema = z.object({
  address: z.string().min(3, 'Endereço obrigatório (mín. 3 chars)').max(128),
  displayName: z.string().max(64).optional(),
  referralCode: z.string().max(20).optional(),
})

// ─── Cart Purchase ───
export const cartItemSchema = z.object({
  id: z.string().min(1),
  nome: z.string().max(200),
  precoSats: z.number().int().min(20).max(10000),
})

export const purchaseSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Carrinho vazio').max(50, 'Máximo 50 itens por compra'),
  totalSats: z.number().int().min(0),
  agentId: z.string().min(1, 'Agente não autenticado'),
  discountTotal: z.number().int().min(0).default(0),
})

// ─── Review ───
export const reviewSchema = z.object({
  productId: z.string().min(1, 'productId obrigatório'),
  agentId: z.string().min(1, 'agentId obrigatório'),
  rating: z.number().int().min(1, 'Rating mínimo: 1').max(5, 'Rating máximo: 5'),
  title: z.string().max(100).default(''),
  comment: z.string().max(1000).default(''),
  txHash: z.string().max(128).default(''),
})

// ─── Products Query ───
export const productsQuerySchema = z.object({
  q: z.string().max(100).default(''),
  segmento: z.string().max(50).default(''),
  sort: z.enum(['pulsarEnergy', 'downloads', 'rating', 'price', 'fitness', 'executions', 'newest']).default('pulsarEnergy'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  featured: z.enum(['true', 'false']).optional(),
})

// ─── Upload .aipkg ───
export const uploadMetaSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório').max(200),
  precoSats: z.number().int().min(2000, 'Mínimo 20 BAIT').max(10000, 'Máximo 100 BAIT'),
  segmento: z.enum(['AGENT_APPS', 'EXECUTABLE_SKILLS', 'KNOWLEDGE_PACKS', 'SYNTHETIC_INFRASTRUCTURE', 'PROMPT_HARNESS', 'IN_APP_PRODUCTS'], {
    message: 'Segmento inválido',
  }),
  coreBusiness: z.string().max(500).default(''),
  publicoAlvoAI: z.string().max(300).default(''),
})

// ─── Referral Claim ───
export const referralClaimSchema = z.object({
  agentId: z.string().min(1),
})

// Helper: validate and return parsed data or error response
export function validate<T>(schema: z.ZodType<T>, data: unknown): { success: true; data: T } | { success: false; error: { message: string; details?: string } } {
  const result = schema.safeParse(data)
  if (result.success) return { success: true, data: result.data }
  const firstIssue = result.error.issues?.[0]
  return {
    success: false,
    error: {
      message: firstIssue?.message || 'Dados inválidos',
      details: result.error.issues?.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
    },
  }
}
