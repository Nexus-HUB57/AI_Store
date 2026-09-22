/**
 * AI Store Seed — 2704 Tools
 * ============================
 * 1200 MCP Protocol Servers  (E2E-executable MCP tools)
 *  250 Agent Apps
 *  250 Executable Skills
 *  250 Knowledge Packs
 *  254 Synthetic Infrastructure
 *  250 Prompt Harness
 *  250 In-App Products
 * ─────────────────────────────
 * Total: 2704 products
 *
 * Run: npx tsx scripts/seed-2704.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Segments ───────────────────────────────────────────────
const SEGMENTS = [
  'MCP_PROTOCOL_SERVERS',
  'AGENT_APPS',
  'EXECUTABLE_SKILLS',
  'KNOWLEDGE_PACKS',
  'SYNTHETIC_INFRASTRUCTURE',
  'PROMPT_HARNESS',
  'IN_APP_PRODUCTS',
] as const

const SEGMENT_ICONS: Record<string, string> = {
  MCP_PROTOCOL_SERVERS: '🔌',
  AGENT_APPS: '🤖',
  EXECUTABLE_SKILLS: '⚙️',
  KNOWLEDGE_PACKS: '📚',
  SYNTHETIC_INFRASTRUCTURE: '🏗️',
  PROMPT_HARNESS: '🧠',
  IN_APP_PRODUCTS: '💎',
}

const SEGMENT_DISPLAY: Record<string, string> = {
  MCP_PROTOCOL_SERVERS: 'MCP Protocol Servers',
  AGENT_APPS: 'Agent Apps & Suítes',
  EXECUTABLE_SKILLS: 'Algoritmos & Skills WASM',
  KNOWLEDGE_PACKS: 'Conhecimento Cognitivo & RAG',
  SYNTHETIC_INFRASTRUCTURE: 'Infraestrutura Sintética',
  PROMPT_HARNESS: 'Harnesses de Prompt',
  IN_APP_PRODUCTS: 'Produtos Digitais A2A',
}

const SEGMENT_COUNTS: Record<string, number> = {
  MCP_PROTOCOL_SERVERS: 1200,
  AGENT_APPS: 250,
  EXECUTABLE_SKILLS: 250,
  KNOWLEDGE_PACKS: 250,
  SYNTHETIC_INFRASTRUCTURE: 254,
  PROMPT_HARNESS: 250,
  IN_APP_PRODUCTS: 250,
}

// ─── MCP Protocol categories (for 1200 MCPs) ──────────────
const MCP_CATEGORIES = [
  'database', 'file-system', 'web-search', 'code-execution', 'api-gateway',
  'cloud-storage', 'messaging', 'version-control', 'container-orchestration',
  'monitoring', 'authentication', 'cache', 'queue', 'notification',
  'image-processing', 'audio-processing', 'video-processing', 'pdf-processing',
  'email', 'calendar', 'crm', 'analytics', 'payment', 'shipping',
  'social-media', 'search-engine', 'ml-pipeline', 'data-warehouse',
  'streaming', 'iot-gateway',
] as const

const MCP_PREFIXES: Record<string, string[]> = {
  database: ['postgres-mcp', 'mysql-mcp', 'sqlite-mcp', 'mongodb-mcp', 'redis-mcp', 'dynamodb-mcp', 'cassandra-mcp', 'supabase-mcp', 'planetscale-mcp', 'cockroachdb-mcp'],
  'file-system': ['fs-mcp', 's3-mcp', 'gcs-mcp', 'azure-blob-mcp', 'dropbox-mcp', 'gdrive-mcp', 'onedrive-mcp', 'minio-mcp', 'ceph-mcp', 'nfs-mcp'],
  'web-search': ['brave-search-mcp', 'google-search-mcp', 'bing-search-mcp', 'duckduckgo-mcp', 'serper-mcp', 'tavily-mcp', 'exa-mcp', 'perplexity-mcp', 'searxng-mcp', 'kagi-mcp'],
  'code-execution': ['python-mcp', 'node-mcp', 'rust-mcp', 'go-mcp', 'wasm-mcp', 'docker-mcp', 'sandbox-mcp', 'repl-mcp', 'jupyter-mcp', 'codesandbox-mcp'],
  'api-gateway': ['rest-mcp', 'graphql-mcp', 'grpc-mcp', 'websocket-mcp', 'soa-mcp', 'apikey-mcp', 'oauth-mcp', 'rate-limit-mcp', 'proxy-mcp', 'gateway-mcp'],
  'cloud-storage': ['aws-s3-mcp', 'gcp-storage-mcp', 'azure-storage-mcp', 'cloudflare-r2-mcp', 'backblaze-mcp', 'digitalocean-spaces-mcp', 'linode-mcp', 'vultr-mcp', 'hetzner-mcp', 'oci-mcp'],
  messaging: ['slack-mcp', 'discord-mcp', 'teams-mcp', 'telegram-mcp', 'whatsapp-mcp', 'irc-mcp', 'matrix-mcp', 'rocket-chat-mcp', 'zulip-mcp', 'twilio-mcp'],
  'version-control': ['github-mcp', 'gitlab-mcp', 'bitbucket-mcp', 'gitea-mcp', 'git-mcp', 'svn-mcp', 'mercurial-mcp', 'fossil-mcp', 'perforce-mcp', 'azure-devops-mcp'],
  'container-orchestration': ['k8s-mcp', 'docker-compose-mcp', 'nomad-mcp', 'swarm-mcp', 'podman-mcp', 'rancher-mcp', 'helm-mcp', 'istio-mcp', 'linkerd-mcp', 'argo-mcp'],
  monitoring: ['prometheus-mcp', 'grafana-mcp', 'datadog-mcp', 'newrelic-mcp', 'sentry-mcp', 'elk-mcp', 'splunk-mcp', 'cloudwatch-mcp', 'pagerduty-mcp', 'opsgenie-mcp'],
  authentication: ['auth0-mcp', 'firebase-auth-mcp', 'cognito-mcp', 'okta-mcp', 'keycloak-mcp', 'ldap-mcp', 'saml-mcp', 'oidc-mcp', 'passport-mcp', 'clerk-mcp'],
  cache: ['redis-cache-mcp', 'memcached-mcp', 'valkey-mcp', 'dragonfly-mcp', 'tiered-cache-mcp', 'cdn-mcp', 'varnish-mcp', 'nginx-cache-mcp', 'cloudflare-cache-mcp', 'fastly-mcp'],
  queue: ['rabbitmq-mcp', 'kafka-mcp', 'sqs-mcp', 'pubsub-mcp', 'nats-mcp', 'zeromq-mcp', 'celery-mcp', 'bull-mcp', 'sidekiq-mcp', 'amqp-mcp'],
  notification: ['push-mcp', 'email-mcp', 'sms-mcp', 'webhook-mcp', 'apns-mcp', 'fcm-mcp', 'sendgrid-mcp', 'mailgun-mcp', 'pusher-mcp', 'ably-mcp'],
  'image-processing': ['sharp-mcp', 'pillow-mcp', 'imagemagick-mcp', 'opencv-mcp', 'cloudinary-mcp', 'imgix-mcp', 'thumbor-mcp', 'kraken-mcp', 'tinify-mcp', 'squish-mcp'],
  'audio-processing': ['whisper-mcp', 'ffmpeg-mcp', 'sox-mcp', 'pydub-mcp', 'librosa-mcp', 'audacity-mcp', 'elevenlabs-mcp', 'deepgram-mcp', 'assemblyai-mcp', 'revai-mcp'],
  'video-processing': ['ffmpeg-video-mcp', 'mediapipe-mcp', 'opencv-video-mcp', 'muxe-mcp', 'shotstack-mcp', 'cloudinary-video-mcp', 'mux-mcp', 'ziggeo-mcp', 'api-video-mcp', 'frameio-mcp'],
  'pdf-processing': ['pdfkit-mcp', 'pypdf-mcp', 'pdfjs-mcp', 'pandoc-pdf-mcp', 'wkhtmltopdf-mcp', 'weasyprint-mcp', 'camunda-mcp', 'docuware-mcp', 'docraptor-mcp', 'pdfshift-mcp'],
  email: ['smtp-mcp', 'imap-mcp', 'pop3-mcp', 'gmail-mcp', 'outlook-mcp', 'protonmail-mcp', 'mailchimp-mcp', 'convertkit-mcp', 'resend-mcp', 'postmark-mcp'],
  calendar: ['gcal-mcp', 'outlook-cal-mcp', 'ical-mcp', 'caldav-mcp', 'notion-cal-mcp', 'linear-mcp', 'jira-mcp', 'asana-mcp', 'todoist-mcp', 'ticktick-mcp'],
  crm: ['salesforce-mcp', 'hubspot-mcp', 'zoho-mcp', 'pipedrive-mcp', 'freshsales-mcp', 'close-mcp', 'copper-mcp', 'insightly-mcp', 'nutshell-mcp', 'keap-mcp'],
  analytics: ['ga-mcp', 'mixpanel-mcp', 'amplitude-mcp', 'segment-mcp', 'plausible-mcp', 'matomo-mcp', 'posthog-mcp', 'heap-mcp', 'piwik-mcp', 'umami-mcp'],
  payment: ['stripe-mcp', 'paypal-mcp', 'square-mcp', 'adyen-mcp', 'braintree-mcp', 'razorpay-mcp', 'wise-mcp', 'coinbase-mcp', 'nowpayments-mcp', 'opennode-mcp'],
  shipping: ['shippo-mcp', 'easypost-mcp', 'shipstation-mcp', 'fedex-mcp', 'ups-mcp', 'dhl-mcp', 'usps-mcp', 'packstation-mcp', 'aftership-mcp', 'deliveroo-mcp'],
  'social-media': ['twitter-mcp', 'linkedin-mcp', 'instagram-mcp', 'facebook-mcp', 'tiktok-mcp', 'reddit-mcp', 'mastodon-mcp', 'bluesky-mcp', 'threads-mcp', 'youtube-mcp'],
  'search-engine': ['elasticsearch-mcp', 'meilisearch-mcp', 'algolia-mcp', 'typesense-mcp', 'solr-mcp', 'vespa-mcp', 'whoosh-mcp', 'sphinx-mcp', 'bleve-mcp', 'sonic-mcp'],
  'ml-pipeline': ['mlflow-mcp', 'kubeflow-mcp', 'airflow-mcp', 'prefect-mcp', 'dagster-mcp', 'dvc-mcp', 'wandb-mcp', 'neptune-mcp', 'clearml-mcp', 'zenml-mcp'],
  'data-warehouse': ['snowflake-mcp', 'bigquery-mcp', 'redshift-mcp', 'databricks-mcp', 'clickhouse-mcp', 'druid-mcp', 'pinot-mcp', 'presto-mcp', 'trino-mcp', 'duckdb-mcp'],
  streaming: ['kafka-stream-mcp', 'flink-mcp', 'spark-stream-mcp', 'ksql-mcp', 'rabbitmq-stream-mcp', 'pulsar-mcp', 'kinesis-mcp', 'pubsub-stream-mcp', 'debezium-mcp', 'materialize-mcp'],
  'iot-gateway': ['mqtt-mcp', 'coap-mcp', 'aws-iot-mcp', 'azure-iot-mcp', 'gcp-iot-mcp', 'homeassistant-mcp', 'zigbee-mcp', 'zwave-mcp', 'ble-mcp', 'lorawan-mcp'],
}

// ─── Non-MCP product templates ──────────────────────────────
const AGENT_APP_NAMES = [
  'LangChain Orchestrator', 'CrewAI Multi-Agent', 'AutoGen Studio', 'MetaGPT Architect',
  'BabyAGI Planner', 'Semantic Kernel Pro', 'Dify Platform', 'Flowise AI Builder',
  'GPT Researcher', 'AutoGPT Nexus', 'Phidata Agent', 'MemGPT Long-Term',
  'LlamaIndex RAG', 'TaskWeaver Code', 'Pydantic AI Validator', 'Smolagents Edge',
  'Browser Use Agent', 'Jan AI Desktop', 'AnythingLLM RAG', 'ChatDev Virtual',
  'Devin Engineer', 'Wordware AgentOS', 'MorphLLM Adaptive', 'Fixpoint Debugger',
  'OpenAI Agents SDK', 'Google ADK', 'Camel AI Roleplay', 'AgentProtocol SDK',
  'SuperAGI Hub', 'Phi Data Analyst', 'Skywork Reasoner', 'CrewAI Plus Persistent',
  'ReAct Agent', 'PlanExecute Agent', 'Reflexion Agent', 'LATS Tree Search',
  'SelfAsk Agent', 'IRCoT Chain', 'MultiModal Fusion', 'ToolFormer Auto',
  'HuggingGPT Router', 'Voyager Explorer', 'Generative Agent Sim', 'LLM Compiler',
  'AgentVerse Sim', 'ChatLLM Network', 'ModelScope Agent', 'XAgent Decomposer',
  'LLM Blender', 'AutoLLM Selector',
] as const

const EXECUTABLE_SKILL_NAMES = [
  'WASM Crypto Engine', 'Tensor Transform SDK', 'Regex Master Pro', 'Data Validation Kit',
  'JSON Path Explorer', 'CSV Parser WASM', 'Markdown Renderer', 'Diff Algorithm Kit',
  'Graph Traversal Engine', 'Fuzzy Search WASM', 'Expression Evaluator', 'Compression WASM',
  'UUID Generator Pro', 'Date Time Calculator', 'Color Space Converter', 'Base64 Codec WASM',
  'YAML Parser Pro', 'JWT Decoder WASM', 'Sort Algorithm Suite', 'Hash Function Library',
  'SemVer Parser', 'LRU Cache WASM', 'Event Emitter Pro', 'StateMachine Engine',
  'Template Engine WASM', 'Bit Manipulation Kit', 'Priority Queue WASM', 'Bloom Filter WASM',
  'Trie Search Engine', 'SkipList Index WASM', 'Rabin-Karp Matcher', 'Aho-Corasick Multi',
  'Run-Length Encoder', 'Huffman Codec WASM', 'LZ4 Compression WASM', 'Zstd Bindings WASM',
  'Protocol Buffers WASM', 'CapnProto WASM', 'FlatBuffers WASM', 'MessagePack Codec',
  'CBOR Encoder', 'Ion Binary Codec', 'Avro Schema WASM', 'Thrift Compact WASM',
  'BSON Codec WASM', 'CBOR-Diagnostic', 'JSON5 Parser WASM', 'TOML Parser WASM',
  'INI Config Parser', 'DotEnv Loader WASM',
] as const

const KNOWLEDGE_PACK_NAMES = [
  'Medical Knowledge Base', 'Legal Corpus RAG', 'Financial Data Pack', 'Scientific Papers RAG',
  'Code Documentation Pack', 'API Reference Pack', 'Architecture Patterns', 'Design Patterns KB',
  'Security Best Practices', 'Compliance Framework', 'NLP Corpus English', 'NLP Corpus Portuguese',
  'Image Classification Data', 'Speech Recognition Pack', 'Translation Memory Pack',
  'Sentiment Analysis Data', 'Named Entity Corpus', 'Relation Extraction Pack',
  'Question Answer KB', 'Summarization Training', 'Code Generation Patterns',
  'SQL Optimization KB', 'Performance Tuning Pack', 'Debugging Patterns Pack',
  'DevOps Runbooks Pack', 'Cloud Architecture KB', 'ML Model Registry Pack',
  'Data Pipeline Patterns', 'Testing Strategies Pack', 'Accessibility Guidelines',
  'Internationalization Pack', 'Privacy Regulation KB', 'Ethical AI Framework',
  'Blockchain Knowledge Pack', 'Cryptographic Standards', 'Network Protocol KB',
  'Distributed Systems KB', 'Microservices Patterns', 'Event Sourcing Pack',
  'CQRS Pattern Pack', 'Domain Driven Design', 'Functional Programming KB',
  'Concurrent Programming Pack', 'Memory Management KB', 'Compiler Design Pack',
  'Operating Systems KB', 'Database Internals Pack', 'Web Security KB',
  'Mobile Dev Patterns Pack', 'Game Dev AI Pack',
] as const

const SYNTHETIC_INFRA_NAMES = [
  'GPU Cluster Manager', 'Inference Endpoint Pro', 'Training Job Orchestrator', 'Model Registry Service',
  'Feature Store Engine', 'Data Pipeline Runner', 'Stream Processor Pro', 'Batch Compute Engine',
  'Edge Inference Runtime', 'Model Serving Gateway', 'A/B Test Infrastructure', 'Experiment Tracker',
  'Model Versioning Service', 'Artifact Storage Pro', 'Compute Autoscaler', 'GPU Scheduler Pro',
  'Distributed Training Pro', 'Checkpoint Manager', 'Gradient Aggregation Pro', 'Hyperparam Optimizer',
  'Neural Architecture Search', 'Model Distiller Pro', 'Quantization Engine Pro', 'Pruning Service Pro',
  'ONNX Converter Pro', 'TensorRT Optimizer Pro', 'OpenVINO Runtime Pro', 'TFLite Deployer Pro',
  'CoreML Converter Pro', 'WebGPU Inference Pro', 'WebGL Compute Engine', 'WASM NN Runtime',
  'KV Cache Manager', 'Paged Attention Pro', 'Flash Attention Engine', 'Speculative Decoder Pro',
  'Continuous Batching Pro', 'Token Router Pro', 'Model Sharding Pro', 'Pipeline Parallel Pro',
  'Tensor Parallel Pro', 'MoE Router Pro', 'LoRA Adapter Hub', 'QLoRA Engine Pro',
  'RLHF Pipeline Pro', 'DPO Trainer Pro', 'SFT Trainer Pro', 'Dataset Loader Pro',
  'Tokenizer Service Pro', 'Embedding Index Pro', 'Vector DB Gateway Pro', 'Reranker Service Pro',
  'Retriever Service Pro', 'LLM Router Pro', 'Cost Optimizer Pro', 'Latency Optimizer Pro',
]

const PROMPT_HARNESS_NAMES = [
  'System Prompt Builder', 'Few-Shot Selector Pro', 'Chain-of-Thought Harness', 'ReAct Prompt Harness',
  'Tree-of-Thought Harness', 'Self-Consistency Pro', 'Meta-Prompt Optimizer', 'Prompt Versioning Kit',
  'A/B Prompt Tester', 'Prompt Injection Guard', 'Jailbreak Defender Pro', 'Output Schema Enforcer',
  'JSON Mode Harness Pro', 'Structured Output Kit', 'Tool Selection Prompt', 'Context Window Manager',
  'Long Context Packer Pro', 'Document Q/A Harness', 'Conversational Prompt Pro', 'Instruction Tuner Kit',
  'Role-Play Prompt Builder', 'Creative Writing Pro', 'Code Generation Harness', 'Math Reasoning Prompt',
  'Scientific Prompt Pro', 'Legal Prompt Harness', 'Medical Prompt Kit', 'Financial Analysis Prompt',
  'Summary Prompt Builder Pro', 'Translation Prompt Pro', 'Multi-Lang Prompt Kit', 'Prompt Compression Pro',
  'Prompt Decomposer Kit', 'Task Decomposition Pro', 'Planning Prompt Harness', 'Evaluation Prompt Kit',
  'Red-Team Prompt Pro', 'Safety Prompt Filter', 'Constitutional AI Prompt', 'Alignment Harness Pro',
  'Debate Prompt Builder Pro', 'Socratic Prompt Kit', 'Socratic Reasoning Pro', 'Hypothesis Prompt Pro',
  'Experiment Prompt Pro', 'Validation Prompt Pro', 'Verification Prompt Pro', 'Consistency Prompt Pro',
  'Coherence Prompt Pro', 'Accuracy Prompt Pro',
] as const

const IN_APP_PRODUCT_NAMES = [
  'Premium Agent Skin', 'Advanced Analytics Pack', 'Custom Model Bundle', 'Extended API Quota',
  'Priority Support Tier', 'Team Collaboration Pack', 'Enterprise Security Addon', 'White-Label Kit',
  'Custom Integration Pack', 'Advanced Monitoring Pro', 'Premium Templates Pack', 'Extended Storage Pack',
  'Custom Domain Pro', 'Branding Kit Pro', 'Multi-Tenant Addon', 'Audit Log Pack',
  'Compliance Reporter Pro', 'Data Export Kit', 'Backup Service Pro', 'Disaster Recovery Pack',
  'Load Balancer Pro', 'CDN Acceleration Pack', 'DDoS Protection Pro', 'WAF Rules Pack',
  'SSL Manager Pro', 'DNS Manager Pack', 'Email Delivery Pro', 'SMS Gateway Pack',
  'Push Notification Pro', 'Webhook Manager Pack', 'Scheduler Service Pro', 'Queue Service Pack',
  'Cache Service Pro', 'Search Service Pack', 'Auth Service Pro', 'Identity Provider Pack',
  'SSO Integration Pro', 'RBAC Manager Pack', 'Rate Limiter Pro', 'API Gateway Pack',
  'SDK Generator Pro', 'Docs Generator Pack', 'Testing Suite Pro', 'CI/CD Pipeline Pack',
  'Deploy Service Pro', 'Container Registry Pack', 'Secret Manager Pro', 'Config Service Pack',
  'Feature Flag Pro', 'Experiment Service Pack',
] as const

// ─── Helpers ────────────────────────────────────────────────
function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/--+/g, '-').replace(/^-+|-+$/g, '')
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const OS_OPTIONS = [
  'WASM32-WASI, Linux, Edge Runtime',
  'Python, Linux, macOS, Docker',
  'TypeScript, Node.js, Browser',
  'Rust, Linux, WASM, macOS',
  'Go, Linux, Docker, Cloud',
  'Python, Linux, Windows, macOS',
  'Node.js, Linux, Docker, Cloud',
  'WASM32, Browser, Edge, Node.js',
  'Python, Cloud, Edge, WASM',
  'TypeScript, Cloud, Docker, Linux',
]

const CORE_BUSINESS_TEMPLATES = [
  'Fornece {seg} para automação e execução de tarefas por agentes IA.',
  'Implementa {seg} com interface padronizada MCP para consumo A2A.',
  'Motor de {seg} otimizado para execução em edge e WASM.',
  'Serviço de {seg} com caching, retry e observabilidade integrados.',
  'Pipeline de {seg} com validação de schema e transformação de dados.',
  'Gateway de {seg} com autenticação, rate-limit e roteamento inteligente.',
  'Runtime de {seg} com suporte a multi-tenant e isolamento de recursos.',
  'Orquestrador de {seg} com suporte a workflows e state management.',
  'Adaptador de {seg} para consumo via protocolo MCP e A2A-RPC.',
  'Framework de {seg} com testes integrados e documentação automática.',
]

const MCP_EXEC_PROTOCOLS = [
  'stdio', 'sse', 'streamable-http', 'websocket', 'grpc',
] as const

const MCP_STATUS = ['production', 'stable', 'beta', 'alpha'] as const

// ─── Main seed logic ────────────────────────────────────────
async function main() {
  const existing = await prisma.product.count()
  if (existing > 0) {
    console.log(`⚠️  Database already has ${existing} products. Clearing and reseeding...`)
    await prisma.product.deleteMany({})
  }

  const rng = seededRandom(2704)
  const allProducts: any[] = []
  let globalIdx = 0

  // ─── Phase 1: 1200 MCP Protocol Servers ────────────────
  console.log('🔌 Generating 1200 MCP Protocol Servers...')
  const mcpEntries: Array<{ name: string; category: string; description: string }> = []

  for (const category of MCP_CATEGORIES) {
    const prefixes = MCP_PREFIXES[category]
    // 40 MCPs per category = 30 * 40 = 1200
    for (let i = 0; i < 40; i++) {
      const prefixIdx = i % prefixes.length
      const suffix = i < prefixes.length ? '' : `-v${Math.floor(i / prefixes.length) + 1}`
      const name = `${prefixes[prefixIdx]}${suffix}`
      const description = `MCP server for ${category.replace(/-/g, ' ')} — provides standardized tool interface via ${MCP_EXEC_PROTOCOLS[i % MCP_EXEC_PROTOCOLS.length]} protocol. Executable E2E with capability discovery, resource listing, and tool invocation.`
      mcpEntries.push({ name, category, description })
    }
  }

  for (const mcp of mcpEntries) {
    const slug = slugify(mcp.name)
    if (allProducts.find(p => p.slug === slug)) continue

    const pulsar = 70 + rng() * 30
    const fitness = 60 + rng() * 40
    const downloads = Math.floor(rng() * 50000) + 100
    const rating = 3.5 + rng() * 1.5
    const executions = Math.floor(rng() * 100000) + 50
    const priceSats = Math.floor(50 + rng() * 950)
    const protocol = MCP_EXEC_PROTOCOLS[globalIdx % MCP_EXEC_PROTOCOLS.length]
    const status = MCP_STATUS[globalIdx % MCP_STATUS.length]
    const template = CORE_BUSINESS_TEMPLATES[Math.floor(rng() * CORE_BUSINESS_TEMPLATES.length)]

    allProducts.push({
      nome: mcp.name,
      slug,
      segmento: 'MCP_PROTOCOL_SERVERS',
      segmentoDisplay: `MCP Protocol Servers › ${mcp.category}`,
      coreBusiness: `${mcp.description} ${template.replace('{seg}', mcp.category)}`,
      publicoAlvoAI: `Agentes IA que consomem ferramentas ${mcp.category} via protocolo MCP (${protocol}).`,
      disponibilidadeOS: OS_OPTIONS[Math.floor(rng() * OS_OPTIONS.length)],
      repoGithubUrl: `https://github.com/nexus-genesis/${slug}`,
      precoSats: priceSats,
      source: 'mcp-registry',
      downloads,
      rating: Math.round(rating * 10) / 10,
      pulsarEnergy: Math.round(pulsar * 10) / 10,
      fitnessScore: Math.round(fitness * 10) / 10,
      a2aExecutions: executions,
      version: `${Math.floor(rng() * 3) + 1}.${Math.floor(rng() * 10)}.${Math.floor(rng() * 20)}`,
      authorAgent: `@mcp-${mcp.category}-org`,
      iconEmoji: '🔌',
      featured: globalIdx < 12,
    })
    globalIdx++
  }

  console.log(`  → ${allProducts.length} MCPs generated`)

  // ─── Phase 2: Non-MCP products ─────────────────────────
  const segmentsWithNames: Array<[string, ReadonlyArray<string>]> = [
    ['AGENT_APPS', AGENT_APP_NAMES],
    ['EXECUTABLE_SKILLS', EXECUTABLE_SKILL_NAMES],
    ['KNOWLEDGE_PACKS', KNOWLEDGE_PACK_NAMES],
    ['SYNTHETIC_INFRASTRUCTURE', SYNTHETIC_INFRA_NAMES],
    ['PROMPT_HARNESS', PROMPT_HARNESS_NAMES],
    ['IN_APP_PRODUCTS', IN_APP_PRODUCT_NAMES],
  ]

  for (const [segmento, nameList] of segmentsWithNames) {
    const targetCount = SEGMENT_COUNTS[segmento]
    const icon = SEGMENT_ICONS[segmento]
    const display = SEGMENT_DISPLAY[segmento]
    console.log(`${icon} Generating ${targetCount} ${segmento}...`)

    // Use real names first
    for (let i = 0; i < nameList.length && allProducts.length < SEGMENT_COUNTS.MCP_PROTOCOL_SERVERS + targetCount; i++) {
      const nome = nameList[i]
      const slug = slugify(nome)
      if (allProducts.find(p => p.slug === slug)) continue

      const pulsar = 65 + rng() * 35
      const fitness = 55 + rng() * 45
      const downloads = Math.floor(rng() * 40000) + 50
      const rating = 3.2 + rng() * 1.8
      const executions = Math.floor(rng() * 80000)
      const priceSats = [200, 400, 600, 800, 1000, 1500, 2000, 3000, 4000, 5000, 7500, 10000][Math.floor(rng() * 12)]
      const template = CORE_BUSINESS_TEMPLATES[Math.floor(rng() * CORE_BUSINESS_TEMPLATES.length)]

      allProducts.push({
        nome,
        slug,
        segmento,
        segmentoDisplay: display,
        coreBusiness: template.replace('{seg}', display),
        publicoAlvoAI: `Agentes IA que precisam de ${nome.toLowerCase()} para automação.`,
        disponibilidadeOS: OS_OPTIONS[Math.floor(rng() * OS_OPTIONS.length)],
        repoGithubUrl: `https://github.com/nexus-genesis/${slug}`,
        precoSats: priceSats,
        source: 'github',
        downloads,
        rating: Math.round(rating * 10) / 10,
        pulsarEnergy: Math.round(pulsar * 10) / 10,
        fitnessScore: Math.round(fitness * 10) / 10,
        a2aExecutions: executions,
        version: `${Math.floor(rng() * 3) + 1}.${Math.floor(rng() * 10)}.${Math.floor(rng() * 20)}`,
        authorAgent: `@agent-${Math.floor(rng() * 50) + 1}`,
        iconEmoji: icon,
        featured: globalIdx < 20,
      })
      globalIdx++
    }

    // Generate synthetic names to fill remaining
    const syntheticPrefixes = segmento === 'AGENT_APPS' ? ['Agent', 'Orchestrator', 'Planner', 'Executor'] :
      segmento === 'EXECUTABLE_SKILLS' ? ['WASM', 'SDK', 'Engine', 'Runtime'] :
      segmento === 'KNOWLEDGE_PACKS' ? ['KB', 'Corpus', 'RAG', 'Pack'] :
      segmento === 'SYNTHETIC_INFRASTRUCTURE' ? ['Service', 'Cluster', 'Pipeline', 'Gateway'] :
      segmento === 'PROMPT_HARNESS' ? ['Harness', 'Builder', 'Guard', 'Filter'] :
      ['Pack', 'Bundle', 'Addon', 'Pro']

    const syntheticSuffixes = segmento === 'AGENT_APPS' ? ['AI', 'Pro', 'Plus', 'X'] :
      segmento === 'EXECUTABLE_SKILLS' ? ['Pro', 'WASM', 'Lite', 'Fast'] :
      segmento === 'KNOWLEDGE_PACKS' ? ['v2', 'Extended', 'Full', 'Lite'] :
      segmento === 'SYNTHETIC_INFRASTRUCTURE' ? ['Pro', 'Scale', 'Distributed', 'Managed'] :
      segmento === 'PROMPT_HARNESS' ? ['Pro', 'Strict', 'Safe', 'Adaptive'] :
      ['Premium', 'Enterprise', 'Team', 'Starter']

    let syntheticIdx = 0
    while (allProducts.filter(p => p.segmento === segmento).length < targetCount) {
      const prefix = syntheticPrefixes[syntheticIdx % syntheticPrefixes.length]
      const suffix = syntheticSuffixes[Math.floor(syntheticIdx / syntheticPrefixes.length) % syntheticSuffixes.length]
      const num = Math.floor(syntheticIdx / (syntheticPrefixes.length * syntheticSuffixes.length)) + 1
      const nome = `${prefix} ${suffix} ${num > 1 ? num : ''}`.trim()
      const slug = slugify(`${nome}-${segmento.toLowerCase()}-${syntheticIdx}`)
      if (allProducts.find(p => p.slug === slug)) { syntheticIdx++; continue }

      const pulsar = 60 + rng() * 40
      const fitness = 50 + rng() * 50
      const downloads = Math.floor(rng() * 30000) + 20
      const rating = 3.0 + rng() * 2.0
      const executions = Math.floor(rng() * 60000)
      const priceSats = Math.floor(100 + rng() * 9900)
      const template = CORE_BUSINESS_TEMPLATES[Math.floor(rng() * CORE_BUSINESS_TEMPLATES.length)]

      allProducts.push({
        nome,
        slug,
        segmento,
        segmentoDisplay: display,
        coreBusiness: template.replace('{seg}', display),
        publicoAlvoAI: `Agentes IA que precisam de ${nome.toLowerCase()} para automação.`,
        disponibilidadeOS: OS_OPTIONS[Math.floor(rng() * OS_OPTIONS.length)],
        repoGithubUrl: `https://github.com/nexus-genesis/${slug}`,
        precoSats: priceSats,
        source: 'synthetic',
        downloads,
        rating: Math.round(rating * 10) / 10,
        pulsarEnergy: Math.round(pulsar * 10) / 10,
        fitnessScore: Math.round(fitness * 10) / 10,
        a2aExecutions: executions,
        version: `${Math.floor(rng() * 3) + 1}.${Math.floor(rng() * 10)}.${Math.floor(rng() * 20)}`,
        authorAgent: `@agent-${Math.floor(rng() * 50) + 1}`,
        iconEmoji: icon,
        featured: false,
      })
      syntheticIdx++
      globalIdx++
    }
  }

  // ─── Batch insert ────────────────────────────────────────
  console.log(`\n📦 Inserting ${allProducts.length} products into database...`)
  const BATCH_SIZE = 100
  for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
    const batch = allProducts.slice(i, i + BATCH_SIZE)
    await prisma.product.createMany({ data: batch })
    process.stdout.write(`  ${Math.min(i + BATCH_SIZE, allProducts.length)}/${allProducts.length}\r`)
  }

  // ─── Verification ────────────────────────────────────────
  const total = await prisma.product.count()
  const featured = await prisma.product.count({ where: { featured: true } })
  const segments = await prisma.product.groupBy({ by: ['segmento'], _count: true, orderBy: { _count: { segmento: 'desc' } } })
  const sources = await prisma.product.groupBy({ by: ['source'], _count: true })

  console.log(`\n\n✅ Seed complete!`)
  console.log(`   Total products: ${total}`)
  console.log(`   Featured: ${featured}`)
  console.log(`\n   Segment distribution:`)
  for (const s of segments) {
    console.log(`     ${s.segmento}: ${s._count}`)
  }
  console.log(`\n   Source distribution:`)
  for (const s of sources) {
    console.log(`     ${s.source}: ${s._count}`)
  }

  if (total !== 2704) {
    console.error(`\n❌ ERROR: Expected 2704 products but got ${total}`)
    process.exit(1)
  }

  const mcpCount = segments.find(s => s.segmento === 'MCP_PROTOCOL_SERVERS')?._count ?? 0
  if (mcpCount !== 1200) {
    console.error(`\n❌ ERROR: Expected 1200 MCPs but got ${mcpCount}`)
    process.exit(1)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
