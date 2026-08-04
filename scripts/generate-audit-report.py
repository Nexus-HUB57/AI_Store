import sys, os
sys.path.insert(0, '/home/z/my-project/skills/pdf/scripts')
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm, inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.pdfgen import canvas as pdfcanvas
import pypdf

FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
pdfmetrics.registerFont(TTFont('NotoSansSC', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSansSC-Bold', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Bold.ttf'))
registerFontFamily('NotoSansSC', normal='NotoSansSC', bold='NotoSansSC-Bold')

PAGE_BG       = colors.HexColor('#f1f2f2')
CARD_BG       = colors.HexColor('#e6e9eb')
TABLE_STRIPE  = colors.HexColor('#e9ebec')
HEADER_FILL   = colors.HexColor('#4b6572')
COVER_BLOCK   = colors.HexColor('#5c7682')
BORDER        = colors.HexColor('#bcc8ce')
ICON          = colors.HexColor('#4f8aa8')
ACCENT        = colors.HexColor('#267fac')
ACCENT_2      = colors.HexColor('#cb6b4b')
TEXT_PRIMARY   = colors.HexColor('#232527')
TEXT_MUTED     = colors.HexColor('#767d80')
SEM_SUCCESS   = colors.HexColor('#3e7f54')
SEM_WARNING   = colors.HexColor('#90784a')
SEM_ERROR     = colors.HexColor('#9e5b55')
SEM_INFO      = colors.HexColor('#547ea7')

class AuditReport:
    def __init__(self, filename):
        self.filename = filename
        self.W, self.H = A4
        self.MARGIN = 55
        self.story = []
        self.styles = self._build_styles()

    def _build_styles(self):
        s = {}
        s['h1'] = ParagraphStyle('H1', fontName='NotoSansSC-Bold', fontSize=18, leading=22, textColor=HEADER_FILL, spaceAfter=6, spaceBefore=14)
        s['h2'] = ParagraphStyle('H2', fontName='NotoSansSC-Bold', fontSize=14, leading=18, textColor=ACCENT, spaceAfter=4, spaceBefore=10)
        s['h3'] = ParagraphStyle('H3', fontName='NotoSansSC-Bold', fontSize=11, leading=14, textColor=TEXT_PRIMARY, spaceAfter=3, spaceBefore=8)
        s['body'] = ParagraphStyle('Body', fontName='NotoSansSC', fontSize=9, leading=13, textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=4)
        s['body_sm'] = ParagraphStyle('BodySm', fontName='NotoSansSC', fontSize=8, leading=11, textColor=TEXT_MUTED, spaceAfter=3)
        s['cell'] = ParagraphStyle('Cell', fontName='NotoSansSC', fontSize=8, leading=11, textColor=TEXT_PRIMARY, wordWrap='CJK')
        s['cell_b'] = ParagraphStyle('CellB', fontName='NotoSansSC-Bold', fontSize=8, leading=11, textColor=colors.white, wordWrap='CJK')
        s['cell_warn'] = ParagraphStyle('CellWarn', fontName='NotoSansSC-Bold', fontSize=8, leading=11, textColor=SEM_ERROR, wordWrap='CJK')
        s['cell_ok'] = ParagraphStyle('CellOk', fontName='NotoSansSC-Bold', fontSize=8, leading=11, textColor=SEM_SUCCESS, wordWrap='CJK')
        s['cell_info'] = ParagraphStyle('CellInfo', fontName='NotoSansSC', fontSize=8, leading=11, textColor=SEM_INFO, wordWrap='CJK')
        s['cell_muted'] = ParagraphStyle('CellMuted', fontName='NotoSansSC', fontSize=8, leading=11, textColor=TEXT_MUTED, wordWrap='CJK')
        s['caption'] = ParagraphStyle('Caption', fontName='NotoSansSC', fontSize=7, leading=10, textColor=TEXT_MUTED, alignment=TA_CENTER, spaceAfter=6)
        s['footer'] = ParagraphStyle('Footer', fontName='NotoSansSC', fontSize=7, leading=9, textColor=TEXT_MUTED)
        s['p0'] = ParagraphStyle('P0', fontName='NotoSansSC-Bold', fontSize=8, leading=11, textColor=SEM_ERROR, wordWrap='CJK')
        s['p1'] = ParagraphStyle('P1', fontName='NotoSansSC-Bold', fontSize=8, leading=11, textColor=ACCENT_2, wordWrap='CJK')
        s['p2'] = ParagraphStyle('P2', fontName='NotoSansSC-Bold', fontSize=8, leading=11, textColor=SEM_WARNING, wordWrap='CJK')
        return s

    def _avail_w(self):
        return self.W - 2 * self.MARGIN

    def add_h1(self, text):
        self.story.append(Paragraph(text, self.styles['h1']))

    def add_h2(self, text):
        self.story.append(Paragraph(text, self.styles['h2']))

    def add_h3(self, text):
        self.story.append(Paragraph(text, self.styles['h3']))

    def add_body(self, text):
        self.story.append(Paragraph(text, self.styles['body']))

    def add_spacer(self, h=6):
        self.story.append(Spacer(1, h))

    def add_hr(self):
        self.story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceBefore=4, spaceAfter=4))

    def build_table(self, headers, rows, col_widths=None, caption=None):
        available = self._avail_w()
        cs = self.styles['cell']
        header_data = [Paragraph(h, self.styles['cell_b']) for h in headers]
        data = [header_data]
        for row in rows:
            data.append([Paragraph(str(c), cs) if c else Paragraph('', cs) for c in row])
        n_cols = len(headers)
        if col_widths is None:
            col_widths = [available / n_cols] * n_cols
        else:
            total = sum(col_widths)
            if total > available:
                col_widths = [w * available / total for w in col_widths]
        t = Table(data, colWidths=col_widths, repeatRows=1)
        style_cmds = [
            ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('TOPPADDING', (0, 0), (-1, 0), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
            ('TOPPADDING', (0, 1), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]
        for i in range(1, len(data)):
            if i % 2 == 0:
                style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
        t.setStyle(TableStyle(style_cmds))
        elements = [t]
        if caption:
            elements.append(Paragraph(caption, self.styles['caption']))
        self.story.extend(elements)

    def build_prio_table(self, headers, rows, col_widths=None):
        available = self._avail_w()
        cs = self.styles['cell']
        header_data = [Paragraph(h, self.styles['cell_b']) for h in headers]
        data = [header_data]
        for row in rows:
            styled_row = []
            for i, c in enumerate(row):
                if i == 0:
                    style_key = 'p0' if str(c) == 'P0' else 'p1' if str(c) == 'P1' else 'p2'
                    styled_row.append(Paragraph(str(c), self.styles[style_key]))
                else:
                    styled_row.append(Paragraph(str(c), cs))
            data.append(styled_row)
        if col_widths is None:
            col_widths = [available / len(headers)] * len(headers)
        t = Table(data, colWidths=col_widths, repeatRows=1)
        style_cmds = [
            ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('TOPPADDING', (0, 0), (-1, 0), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
            ('TOPPADDING', (0, 1), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]
        for i in range(1, len(data)):
            if i % 2 == 0:
                style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
        t.setStyle(TableStyle(style_cmds))
        self.story.append(t)

    def build(self):
        M = self.MARGIN
        doc = SimpleDocTemplate(self.filename, pagesize=A4, leftMargin=M, rightMargin=M, topMargin=M, bottomMargin=M, title='AI Store Nexus - Auditoria Cirurgica e Roadmap Go-Live', author='Nexus AI-OS', subject='Auditoria tecnica e plano de desenvolvimento')
        doc.multiBuild(self.story)

    def build_cover(self, cover_path):
        c = pdfcanvas.Canvas(cover_path, pagesize=A4)
        W, H = A4
        M = 55
        c.setFillColor(HEADER_FILL)
        c.rect(0, 0, W, H, fill=1, stroke=0)
        c.setFillColor(colors.HexColor('#3a5562'))
        c.rect(0, H * 0.55, W, H * 0.45, fill=1, stroke=0)
        c.setFillColor(ACCENT)
        c.rect(0, H * 0.55, W, 3, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont('NotoSansSC-Bold', 28)
        c.drawString(M, H - 120, 'AI Store Nexus AI-OS')
        c.setFont('NotoSansSC', 14)
        c.drawString(M, H - 150, 'Auditoria Cirurgica e Roadmap Go-Live')
        c.setFillColor(colors.HexColor('#a0b8c4'))
        c.setFont('NotoSansSC', 10)
        c.drawString(M, H - 185, 'v0.7.0-alpha | 5 de agosto de 2026')
        c.setFillColor(colors.white)
        c.setFont('NotoSansSC', 9)
        labels = [
            'Escopo: 92 arquivos TypeScript, 23 endpoints API, 5 modelos Prisma',
            'Metodologia: Analise estatica de codigo + testes + infraestrutura',
            'Classificacao: P0 (Bloqueante) / P1 (Alta) / P2 (Media) / P3 (Baixa)',
            'Entregavel: Plano cirurgico com fases, estimativas e dependencias',
        ]
        y = H * 0.45
        for label in labels:
            c.drawString(M, y, label)
            y -= 16
        c.setFillColor(colors.HexColor('#6a8896'))
        c.setFont('NotoSansSC', 7)
        c.drawString(M, 30, 'Nexus AI-OS | Proprietario | Confidencial')
        c.save()

    def merge_cover(self, cover_path, body_path, final_path):
        cover_pdf = pypdf.PdfReader(cover_path)
        body_pdf = pypdf.PdfReader(body_path)
        writer = pypdf.PdfWriter()
        writer.add_page(cover_pdf.pages[0])
        for page in body_pdf.pages:
            writer.add_page(page)
        with open(final_path, 'wb') as f:
            writer.write(f)

    def run(self, final_path):
        cover_tmp = '/tmp/audit_cover.pdf'
        body_tmp = '/tmp/audit_body.pdf'
        self.build_cover(cover_tmp)
        self.filename = body_tmp
        self._build_content()
        self.build()
        self.merge_cover(cover_tmp, body_tmp, final_path)
        print(f'PDF gerado: {final_path}')
        sz = os.path.getsize(final_path)
        print(f'Tamanho: {sz / 1024:.0f} KB')

    def _build_content(self):
        self.add_h1('1. Resumo Executivo')
        self.add_body('Esta auditoria cirurgica analisa a plataforma AI Store Nexus AI-OS na versao v0.7.0-alpha, com o objetivo de identificar todos os bloqueios, vulnerabilidades e gaps que impedem o Go-Live em producao. O escopo abrange 92 arquivos TypeScript, 23 endpoints de API, 5 modelos de banco de dados, 4 especificacoes E2E, pipeline CI/CD, configuracao Docker e infraestrutura HTTPS.')
        self.add_body('A auditoria identificou <b>47 findings</b> distribuidos em 4 categorias de severidade: <b>12 criticos (P0)</b> que bloqueiam o Go-Live, <b>14 de alta prioridade (P1)</b> que devem ser resolvidos antes do lancamento, <b>13 de media prioridade (P2)</b> que impactam a confiabilidade, e <b>8 de baixa prioridade (P3)</b> que sao melhorias incrementais. Os P0 incluem vulnerabilidades de seguranca (IDOR, upload sem autenticacao), race conditions financeiras, e gaps criticos de cobertura de testes.')
        self.add_body('O plano de desenvolvimento proposto organiza as correcoes em <b>5 fases cirurgicas</b> com duracao total estimada de <b>3 a 4 semanas</b> para atingir o estado de Go-Live. Cada fase e independente e pode ser executada em paralelo quando nao houver dependencias tecnicas. A fase 1 (Seguranca e Dados) e o unico pre-requisito obrigatorio antes de qualquer deploy em producao.')
        self.add_spacer(4)
        self.build_table(
            ['Categoria', 'Encontrados', 'P0', 'P1', 'P2', 'P3'],
            [
                ['Seguranca e Auth', '14', '5', '4', '3', '2'],
                ['API Routes (23)', '22', '3', '6', '7', '6'],
                ['Banco de Dados', '12', '3', '3', '4', '2'],
                ['Frontend', '8', '1', '3', '3', '1'],
                ['Infra e CI/CD', '7', '0', '2', '3', '2'],
                ['Testes', '9', '0', '4', '3', '2'],
            ],
            col_widths=[110, 65, 35, 35, 35, 35],
            caption='Tabela 1: Resumo de findings por categoria e severidade'
        )
        self.story.append(PageBreak())

        self.add_h1('2. Findings Criticos (P0 - Bloqueantes)')
        self.add_body('Estes sao os problemas que <b>impedem o Go-Live</b>. Qualquer um deles, se nao corrigido, pode causar perda financeira, exposicao de dados sensiveis, ou falha catastrofica em producao. Devem ser resolvidos antes de qualquer deploy publico.')
        self.add_h2('2.1 Vulnerabilidades de Seguranca')
        self.build_table(
            ['ID', 'Rota / Arquivo', 'Finding', 'Impacto'],
            [
                ['SEC-01', 'POST /api/reviews', 'Sem verificacao de autenticacao: qualquer agente pode postar reviews como qualquer outro agenteId. O agentId vem do body sem validacao contra o cookie.', 'Reviews falsos, manipulacao de rating de produtos'],
                ['SEC-02', 'POST /api/upload-aipkg', 'Upload sem autenticacao. Qualquer usuario pode subir arquivos arbitrarios. O uploadMetaSchema existe em schemas.ts mas NAO e utilizado na rota.', 'Upload de malware, abuso de disco'],
                ['SEC-03', 'GET /api/agent/dashboard', 'IDOR: agentId vem da query string. Middleware verifica apenas a existencia do cookie, nao se o agentId corresponde ao agente autenticado.', 'Vazamento de dados de qualquer agente'],
                ['SEC-04', 'GET /api/admin/analytics', 'Sem verificacao de role admin. Qualquer usuario logado acessa analytics completos da plataforma.', 'Exposicao de dados comerciais sensiveis'],
                ['SEC-05', 'Caddyfile XTransformPort', 'Handler XTransformPort permite proxyar para qualquer porta localhost via query param. E um open proxy interno.', 'Acesso nao autorizado a servicos internos'],
            ],
            col_widths=[40, 85, 200, 135],
            caption='Tabela 2: Vulnerabilidades de seguranca criticas'
        )
        self.add_h2('2.2 Race Conditions Financeiras')
        self.build_table(
            ['ID', 'Local', 'Problema', 'Risco'],
            [
                ['RACE-01', 'POST /api/reviews', 'Rating recalculado fora de transacao: leitura de todas as reviews, calculo de media em JS, escrita. Duas reviews concurrentes sobrescrevem a media.', 'Rating de produto incorreto, inconsistencia de dados'],
                ['RACE-02', 'POST /api/auth/login', 'Referral bonus: find + create + update nao envolvidos em db.$transaction. Dois signups concorrentes com o mesmo referral code creditam duas vezes.', 'Duplicacao de bonus BAIT (corrupcao financeira)'],
                ['RACE-03', 'Prisma Schema', 'Sem constraint unica em (referrerId, referredId) em ReferralReward. Race condition no claim pode criar rewards duplicados ao nivel do banco.', 'Corrupcao de dados financeiros sem deteccao'],
            ],
            col_widths=[45, 85, 195, 135],
            caption='Tabela 3: Race conditions financeiras'
        )
        self.add_h2('2.3 Problemas de Dados Criticos')
        self.build_table(
            ['ID', 'Local', 'Problema', 'Risco'],
            [
                ['DB-01', 'Agent.referralCode', 'Default "" com @unique. So o PRIMEIRO agente pode ter codigo vazio. Todos os demais crasham com unique constraint violation se referralCode nao for gerado explicitamente.', 'Falha silenciosa na criacao de agentes'],
                ['DB-02', 'Transaction.txHash', 'Sem indice no txHash. Idempotency check (findFirst) em POST /api/cart faz full scan a cada compra. Hot path sem index.', 'Degradacao de performance com volume'],
                ['DB-03', 'Product (7 colunas)', 'Sem indices em pulsarEnergy (sort default), segmento, featured, createdAt, downloads, rating, precoSats, fitnessScore, a2aExecutions. Todas as 7 opcoes de sort sao full scans.', 'Queries lentas em catalogo com 1504 produtos'],
                ['DB-04', 'prisma/seed.ts', 'Seed e um no-op: nao faz nada se o DB esta vazio, nao faz nada se tem dados. scripts/seed_db.ts usa deleteMany (destrutivo), nao upsert.', 'Impossibilidade de re-seed idempotente'],
            ],
            col_widths=[40, 85, 195, 135],
            caption='Tabela 4: Problemas criticos de dados'
        )
        self.story.append(PageBreak())

        self.add_h1('3. Auditoria de Seguranca e Autenticacao')
        self.add_body('A analise do middleware, rotas de API, e schemas de validacao revela um padrao preocupante: a infraestrutura de seguranca existe (CSRF, rate-limiting, security headers, cookie httpOnly), mas a aplicacao nao a utiliza consistentemente. O middleware define rotas protegidas e valida CSRF, mas varias rotas de estado (POST) recebem dados do cliente sem verificar a identidade real do agente autenticado.')
        self.add_h2('3.1 Middleware: Infraestrutura Existe')
        self.add_body('O middleware em src/middleware.ts implementa: (1) Rate limiting com sliding window por IP+path, com headers Retry-After e X-RateLimit-Remaining; (2) CSRF tokens httpOnly com validacao timingSafeEqual; (3) Auth guards por cookie para /dashboard e /publish; (4) Security headers completos (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy); (5) Body size limit de 10MB. A infraestrutura e solida, mas a aplicacao subverte varias dessas protecoes.')
        self.add_h2('3.2 Falhas de Verificacao de Identidade')
        self.add_body('O problema central e que o middleware verifica a <b>presenca</b> do cookie agent_id, mas as rotas de API aceitam um agentId <b>arbitrario</b> no body ou query string sem verificar se corresponde ao cookie. Isso permite que um agente autenticado acesse dados de qualquer outro agente simplesmente alterando o parametro agentId na requisicao. As rotas afetadas sao: GET /api/agent/dashboard (IDOR), GET /api/auth/me (consulta dados de qualquer agente), GET /api/referral/stats (IDOR), e POST /api/reviews (postar como outro agente).')
        self.add_h2('3.3 Caddyfile: Proxy Aberto')
        self.add_body('O Caddyfile contem um handler XTransformPort que permite ao usuario especificar uma porta arbitraria via query parameter, e o Caddy faz proxy para localhost nessa porta. Isso expoe todos os servicos internos rodando na maquina. Alem disso, a configuracao TLS usa "tls internal" (self-signed) ao inves de Let\'s Encrypt, contradizendo o comentario no proprio arquivo que diz "automatic Let\'s Encrypt".')
        self.add_h2('3.4 CSP Fraca')
        self.add_body('O Content-Security-Policy inclui "unsafe-inline" e "unsafe-eval" para script-src, que anula a protecao contra XSS. Em producao, isso deve ser restrito ao minimo necessario. Alem disso, a CSP permite connect-src para wss: e https:, que e amplo demais para um marketplace financeiro.')
        self.story.append(PageBreak())

        self.add_h1('4. Auditoria de API Routes (23 Endpoints)')
        self.add_body('A auditoria completa de todas as 23 rotas de API revela padroes sistematicos de descuido. Apenas 2 de 23 rotas definem Cache-Control. Apenas 1 de 23 rotas chama recordCall() para metricas. 8 de 23 rotas nao possuem try/catch. Varias rotas com schemas Zod definidos nao os utilizam na pratica.')
        self.add_h2('4.1 Matriz de Roteamento de Erro')
        self.build_table(
            ['Rota', 'Zod', 'try/catch', 'Auth', 'recordCall', 'Cache'],
            [
                ['GET /api/products', 'parse() crasha', 'NAO', 'Publico', 'NAO', 'NAO'],
                ['GET /api/products/compact', 'validate()', 'Sim', 'Publico', 'NAO', 'NAO'],
                ['GET /api/stats', 'N/A', 'NAO', 'N/A', 'NAO', 'NAO'],
                ['GET /api/pulsar', 'N/A', 'Sim', 'N/A', 'NAO', 'Sim'],
                ['GET /api/reviews', 'Manual', 'NAO', 'N/A', 'NAO', 'NAO'],
                ['POST /api/reviews', 'validate()', 'Sim', 'N/A', 'NAO', 'NAO'],
                ['POST /api/upload-aipkg', 'Nao usado', 'Sim', 'N/A', 'NAO', 'NAO'],
                ['POST /api/auth/login', 'validate()', 'Sim', 'N/A', 'NAO', 'NAO'],
                ['GET /api/auth/me', 'Manual', 'Sim', 'N/A', 'NAO', 'NAO'],
                ['GET /api/agent/dashboard', 'Manual', 'NAO', 'IDOR', 'NAO', 'NAO'],
                ['GET /api/agent/discover', 'Manual', 'Parcial', 'N/A', 'NAO', 'NAO'],
                ['GET /api/agent/metrics', 'Manual', 'Parcial', 'N/A', 'N/A', 'NAO'],
                ['GET /api/agent/reputation', 'Manual', 'NAO', 'N/A', 'NAO', 'NAO'],
                ['POST /api/sandbox/try', 'validate()', 'NAO', 'N/A', 'NAO', 'NAO'],
                ['GET /api/sandbox/quick', 'Manual', 'NAO', 'N/A', 'NAO', 'NAO'],
                ['GET /api/admin/analytics', 'Manual', 'Sim', 'Sem role', 'Sim', 'NAO'],
            ],
            col_widths=[95, 60, 50, 55, 55, 50],
            caption='Tabela 5: Matriz de conformidade das rotas de API (selecao das 16 mais relevantes)'
        )
        self.add_h2('4.2 Schemas Zod Definidos Mas Nao Utilizados')
        self.add_body('O arquivo schemas.ts exporta uploadMetaSchema e referralClaimSchema, ambos com validacao Zod completa. Porem, /api/upload-aipkg le formData diretamente com cheques manuais if(!file), e /api/referral/claim faz await req.json() com destruturacao manual. Estes schemas sao codigo morto que daria uma falsa sensacao de seguranca durante code review.')
        self.add_h2('4.3 Hardcoded Values')
        self.add_body('Constantes financeiras criticas estao hardcodadas: SIGNUP_BONUS=10000 sats em auth/login, REFERRAL_BONUS=2500 duplicado em login e claim, balance inicial de 100000 sats, limite de upload de 50MB, intervalo Pulsar de 3000ms. Todas deveriam vir de variaveis de ambiente com valores padrao seguros.')
        self.story.append(PageBreak())

        self.add_h1('5. Auditoria de Banco de Dados')
        self.add_h2('5.1 Indices Ausentes')
        self.add_body('A analise do schema Prisma revela 12 indices ausentes. Os 3 mais criticos afetam o hot path de compra: Transaction.txHash (idempotency lookup a cada POST /api/cart), e os 7 indices de sort no Product (pulsarEnergy, segmento, featured, createdAt, downloads, rating, precoSats, fitnessScore, a2aExecutions). Com 1504 produtos e crescimento de transacoes, a ausencia desses indices causara degradacao linear de performance.')
        self.build_table(
            ['Tabela', 'Indice Ausente', 'Impacto', 'Prioridade'],
            [
                ['Transaction', 'txHash', 'Full scan no idempotency check (hot path)', 'P0'],
                ['Product', 'pulsarEnergy', 'Sort default sem indice', 'P0'],
                ['Product', 'segmento', 'Filtro por categoria sem indice', 'P0'],
                ['Product', 'featured', 'Filtro featured sem indice', 'P1'],
                ['Product', 'createdAt', 'Sort newest sem indice', 'P1'],
                ['Product', 'downloads, rating, precoSats, fitnessScore, a2aExecutions', '5 opcoes de sort sem indice', 'P1'],
                ['Transaction', 'type', 'Dashboard grouping sem indice', 'P2'],
                ['Transaction', 'createdAt', 'Dashboard order sem indice', 'P2'],
                ['Review', 'createdAt', 'Reviews order sem indice', 'P2'],
                ['Agent', 'referredBy', 'Referral chain lookup sem indice', 'P2'],
                ['ReferralReward', '(referrerId, referredId)', 'Idempotency check sem indice composto', 'P2'],
            ],
            col_widths=[75, 140, 165, 55],
            caption='Tabela 6: Indices ausentes no schema Prisma'
        )
        self.add_h2('5.2 Integridade Referencial')
        self.add_body('O modelo Agent possui referralCode com @unique e default "". Isso e uma bomba-relogio: apenas um agente pode ter codigo vazio. Se qualquer code path criar um Agent sem chamar generateReferralCode(), o segundo agente crasha com violacao de constraint. Alem disso, cascade delete em Review deleta silenciosamente todas as reviews de um produto sem soft-delete ou trilha de auditoria, enquanto Transaction usa RESTRICT. Esta assimetria permite deletar historico de reviews sem rastreio.')
        self.add_h2('5.3 SQLite vs PostgreSQL')
        self.add_body('O schema esta hardcoded para provider="sqlite". A migracao para PostgreSQL exige edicao manual do schema, regeneracao do client, e db push com accept-data-loss (destrutivo). O script migrate-to-postgres.sh nao e reversivel e nao usa upserts. A estrategia de migracao deveria usar Prisma Migrate com arquivos versionados, nao db push.')
        self.story.append(PageBreak())

        self.add_h1('6. Auditoria de Frontend')
        self.add_h2('6.1 page.tsx: Componente Gigante (860 linhas)')
        self.add_body('O componente principal (src/app/page.tsx) contem 4 responsabilidades misturadas: Header, HeroStats, ProductGrid com paginacao, e DashboardSheet (~200 linhas embutido). O DashboardSheet deveria ser um componente separado. Constantes como SEGMENT_COLORS e formatNumber estao duplicadas em 6+ arquivos. O hook usePulsarSSE() e chamado no nivel superior sem seletor, causando re-render de toda a arvore a cada batch SSE (3s).')
        self.add_h2('6.2 Pulsar Live Updates Desconectados')
        self.add_body('Os ProductCards recebem liveUpdates={{}} (objeto vazio) como prop. O sistema SSE funciona (conecta, recebe updates, atualiza Zustand store), mas os updates nunca sao passados para os cards do grid. O live updates sao visualmente inexistentes para o usuario.')
        self.add_h2('6.3 Hydration Mismatch em Reviews')
        self.add_body('O componente page-client.tsx usa new Date(review.createdAt).toLocaleDateString("pt-BR") que pode diferir entre server e client, causando hydration mismatch. Alem disso, reviews sao buscadas no mount sem estado de loading - o usuario ve "Nenhuma avaliacao" momentaneamente antes dos dados chegarem, e erros de fetch sao silenciados com catch vazio.')
        self.add_h2('6.4 loading.tsx Ineficaz')
        self.add_body('Os arquivos loading.tsx para /, /dashboard, e /publish nunca sao exibidos durante navegacao SPA. Apenas durante hard navigation (antes do JS hidratar). As paginas sao "use client" que gerenciam proprio estado de loading via useEffect + fetch. Os skeletons estao la, mas sao effectively dead code.')
        self.story.append(PageBreak())

        self.add_h1('7. Auditoria de Testes e Cobertura')
        self.add_body('O projeto possui 171 testes unitarios em 9 arquivos e 4 especificacoes E2E. Porem, a analise revela que 19 das 22 areas funcionais tem cobertura zero. Os testes existentes cobrem bem schemas, wallet SDK, e error resolver, mas nao testam nenhum fluxo de negocio real de ponta a ponta.')
        self.add_h2('7.1 Areas com Cobertura Zero')
        self.build_table(
            ['Area', 'Rotas', 'Unit', 'E2E', 'Risco'],
            [
                ['Upload .aipkg', '/api/upload-aipkg', 'ZERO', 'ZERO', 'Upload de malware sem deteccao'],
                ['Reviews CRUD', '/api/reviews', 'ZERO', 'ZERO', 'Rating manipulation sem teste'],
                ['Pulsar SSE', '/api/pulsar', 'ZERO', 'ZERO', 'SSE break sem regressao'],
                ['Sandbox', '/api/sandbox/*', 'ZERO', 'ZERO', 'Execucao sem validacao'],
                ['Referral', '/api/referral/*', 'ZERO', 'ZERO', 'Bonus duplication sem teste'],
                ['Dashboard', '/api/agent/dashboard', 'ZERO', 'ZERO', 'IDOR sem teste'],
                ['Auth logout/me', '/api/auth/*', 'ZERO', 'ZERO', 'Session leaks sem teste'],
                ['Middleware', 'middleware.ts', 'ZERO', 'ZERO', 'CSRF/rate-limit sem teste'],
                ['Admin analytics', '/api/admin/*', 'ZERO', 'ZERO', 'Data leak sem teste'],
            ],
            col_widths=[80, 95, 45, 45, 175],
            caption='Tabela 7: Areas funcionais com cobertura zero de testes'
        )
        self.add_h2('7.2 Teste Que Testa a Coisa Errada')
        self.add_body('O arquivo tests/cart-logic.test.ts e o teste mais perigoso da suite. Ele define copias LOCAIS de getDiscountTier(), calculateItemDiscount(), e calculateCartTotal(), e testa essas copias locais. Nao importa do codigo de producao em /api/cart/route.ts. Se a logica de desconto no route divergir da logica no teste, os testes continuam passando enquanto o codigo real esta quebrado. A solucao e extrair a logica para um modulo compartilhado que ambos importam.')
        self.story.append(PageBreak())

        self.add_h1('8. Auditoria de Infraestrutura e CI/CD')
        self.add_h2('8.1 Dockerfile: Caddy Morto')
        self.add_body('O Dockerfile instala Caddy e openssl na imagem de producao, copia o Caddyfile, mas o CMD inicia apenas "node server.js". Caddy nunca e executado. A porta 3443 e exposta mas nao ha nada escutando. O certificado auto-gerado com CN=localhost fica baked na imagem. Se ninguem montar certificados reais, a producao usa cert self-signed. O openssl deveria estar apenas no stage de build, nao na imagem final.')
        self.add_h2('8.2 Docker Compose: PostgreSQL Exposto')
        self.add_body('O docker-compose.prod.yml expoe a porta 5432 do PostgreSQL para o host (ports: "5432:5432"). O banco de dados acessivel pela rede externa sem autenticacao forte (senha default "aistore_secret"). Deveria usar rede interna isolada e remover o mapeamento de porta.')
        self.add_h2('8.3 .dockerignore: Segredos em Risco')
        self.add_body('O .dockerignore nao exclui .env, .env.*, ou certs/. Se algum arquivo .env com secrets reais existir no diretorio, ele sera copiado para o contexto de build e incluindo na imagem Docker. Esta e uma vulnerabilidade critica de supply chain.')
        self.add_h2('8.4 CI: Sem E2E e Sem Scan de Seguranca')
        self.add_body('O pipeline CI (5-stage DAG) executa testes unitarios, lint, typecheck, build, e docker. Porem: (1) Os 4 testes E2E Playwright nao sao executados no CI; (2) Nao ha npm audit para vulnerabilidades de dependencias; (3) Nao ha scanning de imagem Docker (Trivy/Grype); (4) Nao ha SAST (CodeQL). Alem disso, os jobs lint e typecheck reinstalam dependencias (npm ci) desnecessariamente porque o conditional cache-hit check esta ausente nesses jobs.')
        self.story.append(PageBreak())

        self.add_h1('9. Roadmap Cirurgico - Fases de Desenvolvimento')
        self.add_body('O plano a seguir organiza todas as correcoes em 5 fases executaveis. Cada fase tem um objetivo claro, estimativa de esforco, dependencias, e criterios de aceitacao. As fases 2-5 podem ser parcialmente paralelizadas com a fase 1, exceto onde indicado.')
        self.add_h2('Fase 1: Seguranca e Integridade de Dados (3-4 dias)')
        self.add_body('Pre-requisito OBRIGATORIO antes de qualquer deploy publico. Sem esta fase, a plataforma tem vulnerabilidades de seguranca ativas e corrupcao de dados financeiros possivel via race conditions. Todas as correcoes desta fase devem ser mergeadas juntas como um unico deploy atomico para evitar estado parcialmente corrigido em producao.')
        self.build_prio_table(
            ['Pri', 'Tarefa', 'Detalhes', 'Arquivos'],
            [
                ['P0', 'Auth cookie-to-agentId binding', 'Criar helper verifyAgent(req): le cookie agent_id, ignora agentId de query/body, retorna agente real. Usar em dashboard, reviews POST, auth/me, referral/stats, admin', 'middleware + 6 rotas'],
                ['P0', 'Admin role check', 'Adicionar verificacao de role="admin" em /api/admin/analytics. Se agente nao e admin, retornar 403', 'admin/analytics + Agent model'],
                ['P0', 'Upload auth + usar uploadMetaSchema', 'Exigir cookie auth. Substituir cheques manuais por validate(uploadMetaSchema) em formData', 'upload-aipkg + schemas'],
                ['P0', 'Referral em db.$transaction', 'Envolver login signup + referral bonus em db.$transaction atomico. Impedir double-credit', 'auth/login'],
                ['P0', 'Review rating atomico', 'Usar SQL UPDATE com subquery para rating medio ao inves de read-modify-write em JS', 'reviews/route'],
                ['P0', 'Unique constraint ReferralReward', 'Adicionar @@unique([referrerId, referredId]) no schema. Criar migration Prisma', 'schema.prisma + migration'],
                ['P0', 'Agent.referralCode default fix', 'Mudar default de "" para geracao automatica de codigo unico no Prisma schema ou criar trigger', 'schema.prisma + seed'],
                ['P0', 'Remover XTransformPort', 'Deletar o handler XTransformPort do Caddyfile imediatamente', 'Caddyfile'],
                ['P1', 'Adicionar 12 indices ao schema', 'Transaction.txHash, Product.* (7 sort columns), Transaction.type/createdAt, Review.createdAt, Agent.referredBy, ReferralReward composto', 'schema.prisma + migration'],
                ['P1', 'Corrigir Caddyfile TLS', 'Mudar "tls internal" para desafio HTTP-01 automatico do Caddy', 'Caddyfile'],
            ],
            col_widths=[30, 105, 225, 100],
        )
        self.story.append(PageBreak())

        self.add_h2('Fase 2: Robustez de API e Error Handling (2-3 dias)')
        self.add_body('Foco em tornar todas as 23 rotas resilientes: try/catch completo, validacao Zod consistente, Cache-Control apropriado, e integracao de metricas. Esta fase elimina os 500s nao tratados e padroniza o comportamento de todas as APIs.')
        self.build_prio_table(
            ['Pri', 'Tarefa', 'Detalhes', 'Rotas Afetadas'],
            [
                ['P1', 'try/catch em 8 rotas', 'Adicionar try/catch com error classification em: products, stats, reviews GET, agent/dashboard, agent/reputation, sandbox/quick, sandbox/try, referral/stats', '8 rotas'],
                ['P1', 'products GET: parse() para validate()', 'Substituir productsQuerySchema.parse() por validate() seguro que nao crasha', 'products'],
                ['P1', 'Usar schemas existentes', 'Conectar uploadMetaSchema e referralClaimSchema nas rotas correspondentes', 'upload-aipkg, referral/claim'],
                ['P1', 'Validacao Zod para reviews GET', 'Adicionar validacao de page/limit com Zod em GET /api/reviews', 'reviews'],
                ['P1', 'Usar referralClaimSchema', 'Substituir destruturacao manual por validate(referralClaimSchema) em referral/claim', 'referral/claim'],
                ['P2', 'Cache-Control em rotas publicas', 'Adicionar Cache-Control apropriado: products (s-maxage=60), stats (s-maxage=300), health (no-cache), compact (s-maxage=120)', '7 rotas'],
                ['P2', 'recordCall em todas as rotas', 'Criar wrapper instrumented-handler que chama recordCall automaticamente, ou adicionar manualmente', '22 rotas'],
                ['P2', 'Extrair constantes hardcoded', 'SIGNUP_BONUS, REFERRAL_BONUS, INITIAL_BALANCE, MAX_UPLOAD, PULSAR_INTERVAL para env vars com defaults', 'login, referral, upload, pulsar'],
                ['P2', 'Corrigir build_time no /api/version', 'Substituir new Date().toISOString() por process.env.BUILD_TIME setado no build', 'version'],
            ],
            col_widths=[30, 105, 225, 100],
        )
        self.story.append(PageBreak())

        self.add_h2('Fase 3: Qualidade de Testes (3-4 dias)')
        self.add_body('Levar a cobertura de teste de areas zero para niveis aceitaveis. Priorizar os fluxos financeiros (cart, referral, auth) e os endpoints de seguranca (upload, admin, reviews). Corrigir o teste cart-logic que testa codigo duplicado.')
        self.build_prio_table(
            ['Pri', 'Tarefa', 'Detalhes', 'Tipo'],
            [
                ['P1', 'Extrair logica de desconto compartilhada', 'Criar src/lib/cart-utils.ts com getDiscountTier, calculateItemDiscount, calculateCartTotal. Importar em route E testes', 'Refactor + Fix'],
                ['P1', 'Testes de auth flow', 'Login com bonus, signup duplicado, logout limpa cookie, /auth/me retorna agente correto', 'Unit (4 testes)'],
                ['P1', 'Testes de cart API', 'Purchase com balance insuficiente, purchase race condition, idempotency com key duplicado, purchase com produto inexistente', 'Unit (5 testes)'],
                ['P1', 'Testes de referral', 'Claim bonus, double-claim idempotency, stats com zero referrals, claim sem referral code', 'Unit (4 testes)'],
                ['P1', 'Testes de upload', 'Upload sem auth (401), upload com arquivo invalido (400), upload com tamanho excedido (413), upload valido', 'Unit (4 testes)'],
                ['P2', 'Testes de reviews', 'GET com paginacao, POST com rating valido, POST sem auth, rating atomico', 'Unit (4 testes)'],
                ['P2', 'Teste de middleware', 'Rate limiting, CSRF enforcement, auth guard redirect, security headers presence', 'Integration (4 testes)'],
                ['P2', 'E2E no CI', 'Adicionar stage Playwright ao CI com service container para o banco de dados', 'CI Config'],
                ['P2', 'npm audit no CI', 'Adicionar npm audit --audit-level=high ao stage de testes ou lint', 'CI Config'],
            ],
            col_widths=[30, 120, 220, 90],
        )
        self.story.append(PageBreak())

        self.add_h2('Fase 4: Infraestrutura e Docker (2 dias)')
        self.add_body('Enderecar os problemas de infraestrutura que afetam a confiabilidade do deploy. Remover Caddy morto da imagem Docker, corrigir .dockerignore, isolar rede PostgreSQL, e adicionar security hardening ao container.')
        self.build_prio_table(
            ['Pri', 'Tarefa', 'Detalhes', 'Arquivo'],
            [
                ['P1', 'Remover Caddy da imagem Docker', 'Caddy nao e usado no CMD. Ou iniciar Caddy como sidecar (supervisord/s6) ou remover completamente e usar proxy externo', 'Dockerfile'],
                ['P1', 'Corrigir .dockerignore', 'Adicionar: .env, .env.*, certs/, db/*.db, e2e/, tests/, .github/, *.log', '.dockerignore'],
                ['P1', 'Isolar rede PostgreSQL', 'Remover ports: "5432:5432". Criar rede internal. Conectar ambos servicos', 'docker-compose.prod.yml'],
                ['P1', 'Docker security hardening', 'Adicionar cap_drop: ALL, security_opt: no-new-privileges:true, read_only: true + tmpfs /tmp', 'docker-compose.prod.yml'],
                ['P2', 'Pin base image', 'Mudar node:20-alpine para node:20.18.0-alpine3.20 para builds reprodutiveis', 'Dockerfile'],
                ['P2', 'Remover openssl da imagem final', 'Mover geracao de cert para stage de build. Remover do runner', 'Dockerfile'],
                ['P2', 'Exigir POSTGRES_PASSWORD', 'Falhar se POSTGRES_PASSWORD nao esta definido ao usar profile postgres', 'docker-compose.prod.yml'],
                ['P2', 'Docker image scan no CI', 'Adicionar trivy image scan apos build no pipeline CI', '.github/workflows/ci.yml'],
            ],
            col_widths=[30, 115, 210, 100],
        )
        self.story.append(PageBreak())

        self.add_h2('Fase 5: Performance e Polimento Frontend (2-3 dias)')
        self.add_body('Otimizar performance do frontend, corrigir bugs visuais, e preparar para Lighthouse. Esta fase e a ultima antes do Go-Live e foca na experiencia do usuario final.')
        self.build_prio_table(
            ['Pri', 'Tarefa', 'Detalhes', 'Arquivo'],
            [
                ['P1', 'Extrair DashboardSheet', 'Mover ~200 linhas de DashboardSheet do page.tsx para componente separado. Reduzir page.tsx de 860 para ~660 linhas', 'page.tsx'],
                ['P1', 'Criar constants.ts compartilhado', 'Extrair SEGMENT_COLORS, formatNumber, toBait, BAIT_PER_SAT para src/lib/constants.ts. Usar em 6+ arquivos', '6+ componentes'],
                ['P1', 'Conectar liveUpdates aos ProductCards', 'Passar updates do Zustand store para ProductCard via props. Eliminar liveUpdates={{}}', 'page.tsx + product-card'],
                ['P2', 'Debounce handleSearch', 'Adicionar debounce de 300ms para evitar fetch per-keystroke. Usar useCallback + setTimeout', 'page.tsx'],
                ['P2', 'Zustand selector para PulsarSSE', 'Usar usePulsarStore(s => s.connected) ao inves de pull do store inteiro no page.tsx', 'page.tsx + hooks'],
                ['P2', 'Reviews loading state', 'Adicionar estado reviewsLoading. Mostrar skeleton ao inves de "Nenhuma avaliacao" momentaneo', 'page-client.tsx'],
                ['P2', 'Suppression hydration mismatch', 'Usar suppressHydrationWarning no elemento de data, ou renderizar client-only com useEffect', 'page-client.tsx'],
                ['P3', 'Adicionar compress: true', 'Habilitar gzip compression explicita no next.config.ts', 'next.config.ts'],
                ['P3', 'Bundle split em reputation/review', 'Mover imports diretos de framer-motion para motion-wrapper.tsx em reputation-ring.tsx e review-list.tsx', '2 componentes'],
            ],
            col_widths=[30, 115, 215, 100],
        )
        self.story.append(PageBreak())

        self.add_h1('10. Cronograma e Dependencias')
        self.build_table(
            ['Fase', 'Duracao', 'Depende de', 'Pode paralelizar com', 'Entregaveis'],
            [
                ['F1: Seguranca + Dados', '3-4 dias', 'Nenhuma', 'Nenhuma (obrigatoria primeiro)', '14 tasks P0+P1 resolvidos, 12 indices adicionados, schema Prisma v2'],
                ['F2: Robustez API', '2-3 dias', 'F1 (auth helper)', 'F3 (extrair logica de desconto)', '23 rotas com try/catch, Zod, Cache-Control, metricas'],
                ['F3: Testes', '3-4 dias', 'F1 (novos schemas)', 'F2 (rotas estaveis)', '25+ novos testes, E2E no CI, cart-logic fix'],
                ['F4: Infra/Docker', '2 dias', 'Nenhuma', 'F2, F3', 'Docker limpo, .dockerignore seguro, CI com scan'],
                ['F5: Frontend', '2-3 dias', 'Nenhuma', 'F2, F4', 'page.tsx refatorado, liveUpdates conectado, constants compartilhados'],
            ],
            col_widths=[80, 55, 75, 95, 165],
            caption='Tabela 8: Cronograma e dependencias entre fases'
        )
        self.add_spacer(8)
        self.add_body('Tempo total sequencial: <b>12-16 dias</b> (2.5-3.2 semanas). Com paralelizacao (F2||F3, F4||F5): <b>8-10 dias</b> (1.6-2 semanas). A Fase 1 e o unico bloqueio absoluto. Uma vez concluida, as demais fases podem avancar em paralelo com interferencia minima.')
        self.story.append(PageBreak())

        self.add_h1('11. Checklist de Go-Live')
        self.add_body('A tabela abaixo define os criterios obrigatorios que devem ser verificados antes do lancamento publico. Cada item deve ter uma verificacao manual ou automatizada documentada. O deploy so deve prosseguir quando todos os itens P0 e P1 estiverem marcados como completos.')
        self.build_table(
            ['#', 'Criterio', 'Prioridade', 'Verificacao'],
            [
                ['1', 'Todas as vulnerabilidades P0 resolvidas (SEC-01 a SEC-05)', 'OBRIGATORIO', 'Re-auditar rotas afetadas'],
                ['2', 'Race conditions financeiras eliminadas (RACE-01 a RACE-03)', 'OBRIGATORIO', 'Testes de concorrencia'],
                ['3', 'Indices de banco adicionados (12 indices)', 'OBRIGATORIO', 'EXPLAIN ANALYZE em queries'],
                ['4', 'Auth cookie-to-agentId binding implementado', 'OBRIGATORIO', 'Teste IDOR em todas as rotas'],
                ['5', 'Todas as 23 rotas com try/catch e Zod', 'OBRIGATORIO', 'npm run build (0 errors)'],
                ['6', 'Testes passando (200+ unit + 8+ E2E)', 'OBRIGATORIO', 'CI verde em main'],
                ['7', 'CSP sem unsafe-eval', 'Recomendado', 'Content-Security-Policy header check'],
                ['8', 'Docker sem Caddy morto', 'Recomendado', 'docker run + curl localhost:3000/health'],
                ['9', '.dockerignore exclui .env e certs', 'Recomendado', 'docker build + inspect layers'],
                ['10', 'E2E tests executando no CI', 'Recomendado', 'CI log mostra Playwright'],
                ['11', 'PostgreSQL isolado (sem porta exposta)', 'Recomendado', 'docker compose config + network inspect'],
                ['12', 'Seed idempotente com upserts', 'Recomendado', 'npx prisma db seed (2x sem erro)'],
                ['13', 'Lighthouse Performance > 70', 'Desejavel', 'Lighthouse CI run'],
                ['14', 'Pulsar live updates visiveis no grid', 'Desejavel', 'Visual check + log SSE updates'],
                ['15', 'Documentation atualizada apos F1-F5', 'Desejavel', 'README reflete versao pos-fase'],
            ],
            col_widths=[20, 195, 75, 170],
            caption='Tabela 9: Checklist de Go-Live - 15 criterios de lancamento'
        )
        self.story.append(PageBreak())

        self.add_h1('12. Matriz de Riscos Pos-Implementacao')
        self.build_table(
            ['Risco', 'Probabilidade', 'Impacto', 'Mitigacao'],
            [
                ['Regressao em rotas corrigidas', 'Media', 'Alto', 'E2E tests no CI + smoke test antes de deploy'],
                ['Migracao Prisma falha em prod', 'Baixa', 'Alto', 'Backup DB antes. Usar prisma migrate (nao db push) em prod'],
                ['Novos indices causam write slowdown', 'Baixa', 'Medio', 'Monitorar query performance apos migracao'],
                ['SSE Pulsar instavel sob carga', 'Media', 'Medio', 'Teste com 100+ conexoes simultaneas antes do Go-Live'],
                ['SQLite nao escala com trafego', 'Alta', 'Alto', 'Migrar para PostgreSQL ANTES do lancamento publico'],
                ['Refactoring de page.tsx quebra UI', 'Media', 'Medio', 'Teste visual completo apos cada extracao de componente'],
                ['Rate limiter in-memory reset em deploy', 'Alta', 'Baixo', 'Aceitavel para alpha. Redis para producao (Fase futura)'],
            ],
            col_widths=[130, 70, 60, 200],
            caption='Tabela 10: Matriz de riscos das fases de implementacao'
        )
        self.add_spacer(10)
        self.add_h2('Recomendacao Final')
        self.add_body('A plataforma AI Store Nexus AI-OS possui uma base tecnica solida (Next.js 16, Prisma, ISR, SSE, Zustand, Docker multi-stage). O produto e visualmente impressionante com o tema dark, animacoes Framer Motion, e 1504 paginas SSG. Porem, a auditoria revelou que a superficie polida esconde problemas estruturais que impedem um deploy seguro em producao: vulnerabilidades de autenticacao, race conditions financeiras, 12 indices ausentes no banco de dados, cobertura de testes concentrada em apenas 3 areas de 22, e infraestrutura Docker com Caddy nao inicializado e certificados expostos.')
        self.add_body('O roadmap proposto de 5 fases (8-10 dias com paralelizacao) aborda todos os 47 findings de forma priorizada. A Fase 1 e o unico bloqueio absoluto e deve ser completada antes de qualquer deploy publico. As fases subsequentes podem ser executadas em paralelo para minimizar o tempo ate o Go-Live. Apos a conclusao das 5 fases e verificacao dos 15 criterios do checklist, a plataforma estara pronta para lancamento com nivel de qualidade de producao.')


if __name__ == '__main__':
    report = AuditReport('/tmp/audit_roadmap.pdf')
    output = '/home/z/my-project/download/AI_Store_Auditoria_Roadmap_GoLive_v0.7.0-alpha.pdf'
    os.makedirs('/home/z/my-project/download', exist_ok=True)
    report.run(output)
