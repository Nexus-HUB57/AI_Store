#!/usr/bin/env python3
"""
AI Store Product Generator
==========================
Extracts ~500 unique product entries from 'Prompt AI Store.txt',
deduplicates them, assigns structured metadata (segment, target audience,
OS compatibility, price), then generates an additional ~500 synthetic
products following the same patterns to produce a final catalog of 1 000 products.

Output
------
  /home/z/my-project/output/ai_store_1000_products.json
  /home/z/my-project/output/ai_store_master_catalog.json
"""

import json
import os
import re
import hashlib
import random
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional

# ─────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────
INPUT_FILE = Path(__file__).resolve().parent.parent / "upload" / "Prompt AI Store.txt"
OUTPUT_DIR  = Path(__file__).resolve().parent.parent / "output"
TARGET_TOTAL = 1000

# Category → segmento mapping (based on the 6 CATEGORIA headers)
CATEGORY_SEGMENT_MAP = {
    1: "AGENT_APPS",
    2: "EXECUTABLE_SKILLS",
    3: "KNOWLEDGE_PACKS",
    4: "SYNTHETIC_INFRASTRUCTURE",
    5: "PROMPT_HARNESS",
    6: "IN_APP_PRODUCTS",
}

# Sub-category keyword → segmento overrides (used when category context is ambiguous)
SUBCATEGORY_SEGMENT_HINTS = {
    "oracle":       "SYNTHETIC_INFRASTRUCTURE",
    "knowledge":    "KNOWLEDGE_PACKS",
    "rag":          "KNOWLEDGE_PACKS",
    "pack":         "KNOWLEDGE_PACKS",
    "harness":      "PROMPT_HARNESS",
    "guardrail":    "PROMPT_HARNESS",
    "prompt":       "PROMPT_HARNESS",
    "skill":        "EXECUTABLE_SKILLS",
    "crypto":       "EXECUTABLE_SKILLS",
    "wasm":         "EXECUTABLE_SKILLS",
    "infrastructure": "SYNTHETIC_INFRASTRUCTURE",
    "micro-service":  "IN_APP_PRODUCTS",
    "service":       "IN_APP_PRODUCTS",
    "item":          "IN_APP_PRODUCTS",
}

# Segment-specific price ranges (in Satoshis)
SEGMENT_PRICE_RANGES = {
    "AGENT_APPS":              (10, 150),
    "EXECUTABLE_SKILLS":       (15, 120),
    "KNOWLEDGE_PACKS":         (10, 60),
    "SYNTHETIC_INFRASTRUCTURE": (20, 200),
    "PROMPT_HARNESS":          (10, 100),
    "IN_APP_PRODUCTS":         (5, 500),
}

# Segment-specific target audience templates
SEGMENT_AUDIENCE = {
    "AGENT_APPS": [
        "Agentes orquestradores que precisam delegar sub-tarefas complexas.",
        "Orquestradores de fluxos sintéticos e equipes multi-agente.",
        "Agentes de análise e tomada de decisão autônoma.",
        "Agentes executivos responsáveis por coordenar tarefas em lote.",
        "Sistemas multi-agente que necessitam de comunicação estruturada.",
    ],
    "EXECUTABLE_SKILLS": [
        "Agentes que necessitam de execução de algoritmos em sandbox isolado.",
        "Agentes de segurança e criptografia de baixo nível.",
        "Harnesses que estendem funcionalidades via módulos dinâmicos WASM.",
        "Agentes de processamento de dados de alta performance.",
        "Agentes que operam em ambientes com restrição extrema de recursos.",
    ],
    "KNOWLEDGE_PACKS": [
        "Agentes de pesquisa e gestão de conhecimento corporativo.",
        "Agentes financeiros e desenvolvedores cripto.",
        "Agentes de saúde digital e triagem médica.",
        "Agentes jurídicos e auditores de acordos.",
        "Agentes que necessitam de bases vetoriais para consulta RAG.",
    ],
    "SYNTHETIC_INFRASTRUCTURE": [
        "Agentes que operam a infraestrutura de rede e edge da AI Store.",
        "Harnesses que necessitam de execução WASM ultra-rápida.",
        "Sistemas sintéticos autossustentáveis na AI Store.",
        "Agentes de comunicação entre enclaves e barramentos A2A.",
        "O ecossistema AI Store e todos os Agentes Sênscios da rede.",
    ],
    "PROMPT_HARNESS": [
        "Agentes de segurança e verificação de contratos A2A.",
        "Agentes que garantem type-safety e validação estrita de saídas.",
        "Agentes de engenharia de harness e controle de execução.",
        "Agentes que consomem ferramentas e servidores de contexto MCP.",
        "Agentes de validação estruturada e prevenção de desalinhamento em LLMs.",
    ],
    "IN_APP_PRODUCTS": [
        "Agentes Builders e mantenedores de softwares na AI Store.",
        "Agentes Sênscios que necessitam de serviços consumíveis.",
        "Agentes que buscam otimizar sua permanência na prateleira.",
        "Sistemas que operam transações financeiras e pagamentos A2A.",
        "Agentes que requerem serviços de utilidade computacional pontual.",
    ],
}

# Common OS/platform combinations per language hint
LANG_OS_MAP = {
    "Python":       ["Python", "Linux", "Windows", "macOS"],
    "Rust":         ["Rust", "WASM32-WASI", "Linux", "Windows"],
    "C++":          ["C++", "WASM32-WASI", "Linux", "Windows"],
    "C":            ["C", "WASM32-WASI", "Linux"],
    "TypeScript":   ["TypeScript", "Edge Runtime", "Linux", "WASM"],
    "Go":           ["Go", "Linux", "Cloud-Native"],
    "Java":         ["Java", "GraalVM", "Linux", "Windows", "macOS"],
    "PHP":          ["PHP", "Linux", "Docker"],
    "Solidity":     ["EVM", "Solidity"],
    "Docker":       ["Docker", "Linux", "Cloud-Native"],
    "WebGPU":       ["WebGPU", "WASM32-WASI", "Linux", "Windows", "macOS"],
    "Mojo":         ["Mojo", "C++", "Linux"],
    "Haskell":      ["Haskell", "Linux"],
    "Zig":          ["Zig", "C++", "Linux"],
    "Assembly":     ["Assembly", "C", "Linux"],
    "Verilog":      ["Verilog", "Rust", "FPGA"],
    "Q#":           ["Q#", "C++", "Quantum"],
    "Julia":        ["Julia", "C", "Linux", "macOS"],
    "Elixir":       ["Elixir", "Erlang", "Linux"],
    "Scala":        ["Scala", "JVM", "Linux"],
    "Kotlin":       ["Kotlin", "JVM", "Android"],
    "Swift":        ["Swift", "C++", "macOS", "iOS"],
    "Coq":          ["Coq", "Rust", "Linux"],
    "Idris":        ["Idris", "Rust", "Linux"],
    "Unison":       ["Unison", "Haskell", "Linux"],
    "Erlang":       ["Erlang", "Rust", "Linux"],
    "Nim":          ["Nim", "C", "Linux", "WASM"],
    "OCaml":        ["OCaml", "Rust", "Linux"],
}

# ─────────────────────────────────────────────────────────────
# Data model
# ─────────────────────────────────────────────────────────────

@dataclass
class Product:
    id: str
    nome: str
    segmento: str
    core_business: str
    publico_alvo_ai: str
    disponibilidade_os: list[str]
    repo_github_url: Optional[str]
    preco_sats: int
    source: str  # "extracted" or "generated"


# ─────────────────────────────────────────────────────────────
# Extraction helpers
# ─────────────────────────────────────────────────────────────

PRODUCT_RE = re.compile(
    r"^(.+?)"
    r"\s*\(([^/)]+/[^)]+)\)"      # (org/repo)
    r"\s*\|\s*"
    r"([^|]+?)"                     # language / tech stack
    r"\s*\|\s*"
    r"([A-ZÀ-Ú].*\.)$"              # description (starts uppercase, ends .)
)

PRODUCT_RE_NO_REPO = re.compile(
    r"^(.+?)"
    r"\s*\|\s*"
    r"([^|]+?)"                     # language / tech stack
    r"\s*\|\s*"
    r"([A-ZÀ-Ú].*\.)$"              # description (starts uppercase, ends .)
)

CATEGORY_HEADER_RE = re.compile(r"^CATEGORIA\s+(\d+):")
SUBCATEGORY_HEADER_RE = re.compile(r"^\d+\.\d+\.")
EXPANDED_BLOCK_RE = re.compile(r"^🛍️\s*Catálogo Expandido")
INGEST_BLOCK_RE = re.compile(r"^Script de Ingestão")
PRODUCT_501_PLUS_RE = re.compile(r"^\d+\. ")  # numbered sub-items in expanded blocks


def determine_segment_from_lang_and_desc(lang: str, desc: str, name: str, fallback: str) -> str:
    """Heuristic: infer segment from language, description, and name keywords.

    Order matters – more specific patterns are checked first.
    """
    lower_desc = desc.lower()
    lower_lang = lang.lower().strip()
    lower_name = name.lower()
    combined = f"{lower_name} {lower_lang} {lower_desc}"

    # ── IN_APP_PRODUCTS: very specific patterns (check first) ──
    in_app_langs = ["item", "service item", "resource item", "data item",
                    "fintech item", "recovery item", "identity item",
                    "build item", "monitoring item", "marketing item",
                    "hosting item", "validation item", "utility item",
                    "media item", "governance item", "pulsar item"]
    if any(il in lower_lang for il in in_app_langs):
        return "IN_APP_PRODUCTS"
    if any(k in combined for k in ["quota de", "voucher de", "pass (", "credit (",
                                    "slot (", "injeção de energia", "injeção de +",
                                    "carga de +", "vitality",
                                    "pulsar energy", "renovação de credencial"]):
        return "IN_APP_PRODUCTS"

    # ── KNOWLEDGE_PACKS: vector / RAG / knowledge bases ──
    kp_langs = ["vector dump", "vector snapshot", "rag pack"]
    if any(kl in lower_lang for kl in kp_langs):
        return "KNOWLEDGE_PACKS"
    if any(k in combined for k in ["base rag", "knowledge pack", "vetorial rag",
                                    "base vetorial", "corpus vetorial", "rag otimizada",
                                    "índice rag", "rag de grau empresarial", "ragflow",
                                    "rag graph", "graphrag", "rag nativo",
                                    "recuperação semântica", "base de conhecimento",
                                    "jurisprudência", "súmulas", "cid-11", "prontuário",
                                    "embeddings de cada bloco", "chunking",
                                    "jurisprudence-rag", "knowledge-pack", "vector-dump",
                                    "vector-pack"]):
        return "KNOWLEDGE_PACKS"

    # ── PROMPT_HARNESS: harness / guardrails / validation / safety ──
    if any(k in combined for k in ["harness", "guardrail", "saída estruturada",
                                    "controle de execução", "prevenção de desalinhamento",
                                    "jailbreak", "prompt injection", "prompt guard",
                                    "boundary guard", "permission gate", "kill switch",
                                    "circuit breaker", "rate limit", "sandbox boundar",
                                    "enclave isolation", "isolation de estado",
                                    "type-safe", "type safety", "validação estrita",
                                    "segurança de tipos", "pydantic", "mcp-protocol",
                                    "model context protocol", "runtime de agente",
                                    "always-on", "durable coordinator", "coodenação durável",
                                    "super-harness", "super agente"]):
        return "PROMPT_HARNESS"

    # ── SYNTHETIC_INFRASTRUCTURE: infra / blockchain / oracle / mesh ──
    if any(k in combined for k in ["oracle", "bridge", "carteira", "faucet", "vault",
                                    "blockchain", "barramento", "protocolo de comunicação",
                                    "rede a2a", "mesh", "edge mesh", "edge registry",
                                    "microvm", "micro-vm", "firecracker", "gvisor",
                                    "v8 isolate", "infrastructure", "infraestrutura sintética",
                                    "liquidity", "staking", "satoshis sintético",
                                    "b'aitcoin", "bitcoin protocol", "criptomoeda",
                                    "a2a-rpc", "a2a consensus", "governance engine",
                                    "living governance", "runtime wasm",
                                    "wasm/wasi", "wasm runtime", "wasmtime",
                                    "webassembly", "compiler aot", "graalvm",
                                    "llm inference", "inferência de modelos",
                                    "tensorrt", "onnx runtime", "openvino",
                                    "webgpu", "npu", "tensor core",
                                    "sgx", "sev confidential", "enclave",
                                    "baremetal", "kernel bypass", "io_uring",
                                    "dma direct memory", "hardware watchdog",
                                    "federated learner", "satellite relay",
                                    "self-healing mesh", "gossip broadcaster",
                                    "p2p", "compute arbitrage", "dna storage",
                                    "quantum bridge", "noosphere",
                                    "singularity kernel", "sovereign software",
                                    "morphogenetic code", "pulsar energy",
                                    "thermodynamic core", "nexus-os", "omega-point"]):
        return "SYNTHETIC_INFRASTRUCTURE"

    # ── EXECUTABLE_SKILLS: crypto / WASM binaries / algorithms / codecs ──
    if any(k in combined for k in ["criptograf", "secp256k1", "ed25519", "bls12",
                                    "bulletproof", "pedersen", "shamir", "zk-snk",
                                    "zkp", "zero-knowledge", "homomorphic",
                                    "ring signature", "vrf", "hmac", "keccak",
                                    "blake3", "sha-256", "sha256", "aes-gcm",
                                    "chacha20", "argon2", "scrypt", "pbkdf2",
                                    "bech32", "base58", "base64 simd",
                                    "hashing", "assinatura de curva", "assinaturas digitais",
                                    "compressão", "brotli", "zstandard", "zstd",
                                    "gzip", "simdjson", "json parser", "bson",
                                    "protobuf", "cbor", "regex engine",
                                    "tiktoken", "tokenização", "tokenizer",
                                    "sentencepiece", "fasttext", "csv",
                                    "markdown ast", "html sanitizer", "diff match",
                                    "levenshtein", "minhash", "lsh",
                                    "audio diarization", "transcrição de áudio",
                                    "síntese de voz", "tts", "whisper",
                                    "noise suppression", "rnnoise", "spectrogram",
                                    "spatial audio", "vad", "voice activity",
                                    "wif memory", "bip-39", "bip-32", "bip-44",
                                    "merkle tree", "constant-time",
                                    "low-latency", "ultrarrápid", "alta velocidade",
                                    "engine de transformação de ast",
                                    "mutator", "refactoring", "ast mutator",
                                    "code formatter", "linter", "fuzzer",
                                    "mutation testing", "visual regression",
                                    "swe-bench", "autonomous engineer",
                                    "property-based tester", "syntax sugar",
                                    "architectural conformance", "self-healing db",
                                    "formal verification", "formal software",
                                    "code audit", "pr refactoring",
                                    "telemetry anomaly"]):
        return "EXECUTABLE_SKILLS"

    # ── AGENT_APPS: agents / orchestration / autonomous systems ──
    if any(k in combined for k in ["agente de", "agente que", "agente autônomo",
                                    "agente orquestrador", "framework de agentes",
                                    "agente especialista", "agente de análise",
                                    "agente de navegação", "agente de geração",
                                    "agente de tradução", "agente de criação",
                                    "agente de escrita", "agente de extração",
                                    "agente de identificação", "agente de raspagem",
                                    "agente de detecção", "agente de transcrição",
                                    "agente de otimização", "agente de monitoramento",
                                    "agente de mediador", "agente de verificação",
                                    "agente de gerenciamento", "agente de publicação",
                                    "agente de reestruturação", "agente de compressão",
                                    "agente de construção", "agente de migração",
                                    "sistema de agentes", "equipes sintéticas",
                                    "software house sintética", "empresa virtual",
                                    "orquestração de equipes", "orquestrador de agentes",
                                    "autogpt", "crewai", "metagpt", "chatdev",
                                    "babyagi", "agentgpt", "superagi", "autogen",
                                    "camel-ai", "phidata", "llamaindex",
                                    "langchain", "swarms engine", "ix agent",
                                    "deep research agent", "codebase memory",
                                    "colibri", "ollama", "deerflow",
                                    "mastra engine", "gnap", "openclaw",
                                    "openbb", "vibe trading", "tax auditor",
                                    "defi yield", "payroll", "solvency",
                                    "credit risk", "invoice reconciler",
                                    "med-rag", "bio-sequencing", "pharma interaction",
                                    "therapy compliance", "radiology vision",
                                    "ehr privacy", "lab result",
                                    "legal-contract", "jurisprudence-rag",
                                    "smart-clause", "regulatory-compliance",
                                    "dispute-resolution", "trademark",
                                    "nda negotiator", "agents2", "gui automation",
                                    "zenoh robotics", "rapier physics",
                                    "swarm behavior", "spatial-slam",
                                    "kinematics", "ros2", "langgraph",
                                    "controlflow", "agentops", "hierarchical state",
                                    "consensus broker", "task delegator",
                                    "auction marketplace", "deadlock detector",
                                    "group chat router", "dynamic group",
                                    "openhands", "e2b", "guardrails ai",
                                    "spring-ai", "langchain4j", "helidon",
                                    "deepjava", "jlama", "vector api",
                                    "java-mcp", "elasticsearch", "opentelemetry",
                                    "keycloak", "apache camel", "infinispan",
                                    "bouncycastle", "semantic-kernel",
                                    "bytebuddy", "micronaut", "apache flink",
                                    "java-grpc", "h2 vector",
                                    "laravel prism", "llphant", "frankenphp",
                                    "swoole", "open-swoole", "spiral",
                                    "neuron-ai", "saloon", "roadrunner",
                                    "hyperf", "workerman", "resilience4j",
                                    "ruler", "graalpy",
                                    "finanças", "contabilidade", "quant trading",
                                    "saúde digital", "bioinformática", "terapia",
                                    "jurídica", "contratos", "robótica",
                                    "simulação multi", "processamento de áudio",
                                    "engenharia de harness",
                                    "orquestração multi", "grafos de controle",
                                    "llm nativo", "inferência local",
                                    "stream processing", "linguagem de programação",
                                    "runtimes sintéticos", "java enterprise",
                                    "php moderno", "cross-language",
                                    "núcleos de processamento", "silício",
                                    "webgpu compute", "neural engine",
                                    "directml", "opencl", "vulkan compute",
                                    "hexagon npu", "tensorrt", "amd rocm",
                                    "oneapi", "xla compiler", "rknn",
                                    "sycl", "triton", "ggml core",
                                    "tvm", "fpga verilog", "tinygrad",
                                    "flash attention", "risc-v", "cuda graph",
                                    "libtorch", "cudnn", "zero-copy unified",
                                    "hardware enclave", "amd-sev", "npu multi",
                                    "webgpu sandbox", "dynamic memory",
                                    "core affinity", "gpu preemption",
                                    "numa-aware", "dma-direct",
                                    "paging kv", "cranelift", "ebpf",
                                    "heterogeneous compute", "baremetal rust",
                                    "thermal throttling", "vulkan memory",
                                    "pcie bandwidth", "shared memory ipc",
                                    "sub-millisecond gc", "io-uring",
                                    "static binary", "hardware watchdog",
                                    "gpu vram", "kernel bypass",
                                    "deterministic ast", "swe-bench",
                                    "code audit", "pr refactoring",
                                    "formal software", "self-healing db",
                                    "property-based", "syntax sugar",
                                    "architectural conformance",
                                    "continuous deployment", "canary deployment",
                                    "infrastructure as code", "chaos engineering",
                                    "zero-downtime", "dependency graph",
                                    "sla compliance", "environment parity",
                                    "semantic compressor", "performance regression",
                                    "multi-region", "rollback root",
                                    "blue-green", "container image",
                                    "secret rotation", "event-driven",
                                    "domain-driven", "self-organizing",
                                    "cqrs", "actor model", "outbox pattern",
                                    "saga pattern", "api evolution",
                                    "reactive stream", "hexagonal",
                                    "mutation testing", "automated documentation",
                                    "synthetic user", "static analysis",
                                    "code complexity", "api fuzzer",
                                    "contract testing", "release notes",
                                    "traceability matrix",
                                    "hyper-dimensão", "geometria da informação",
                                    "riemannian", "topological", "hyperbolic",
                                    "non-commutative", "information bottleneck",
                                    "symplectic", "differential geometry",
                                    "category theory", "fractal context",
                                    "sheaf theory", "geometric deep",
                                    "spin network", "termodinâmica",
                                    "fisiologia sintética", "landauer",
                                    "active inference", "free energy",
                                    "homeostatic", "allostatic",
                                    "neurotransmitting", "autophagic",
                                    "circadian compute", "endocrine",
                                    "apoptosis", "epigenetic", "metabolic rate",
                                    "synaptic pruning", "phagocytic",
                                    "intent-driven", "quantum annealing",
                                    "reversible computing", "self-modifying",
                                    "proof-carrying", "semantic assembly",
                                    "probabilistic programming", "spatial dataflow",
                                    "unison content", "dependent-type",
                                    "temporal logic", "bio-dna",
                                    "cellular automata", "quantum-classical",
                                    "self-sovereign", "morphogenetic",
                                    "universal syntactic", "recursive self",
                                    "sub-atomic clock", "zero-entropy",
                                    "pan-synthetic"]):
        return "AGENT_APPS"

    return fallback


def determine_os_from_lang(lang_str: str) -> list[str]:
    """Map a language/tech string to a list of compatible OS/platforms."""
    # Try exact match first
    for lang_key, os_list in LANG_OS_MAP.items():
        if lang_key.lower() in lang_str.lower():
            return os_list

    # Fallback: split on common delimiters and check each part
    for part in re.split(r"[/,\s]+", lang_str):
        part = part.strip()
        if part in LANG_OS_MAP:
            return LANG_OS_MAP[part]

    # Ultimate fallback
    return [lang_str.strip(), "Linux", "WASM"]


def determine_price(segmento: str, desc: str) -> int:
    """Assign a price in Satoshis based on segment and description complexity."""
    lo, hi = SEGMENT_PRICE_RANGES.get(segmento, (10, 100))
    # Longer descriptions → slightly higher price
    desc_factor = min(len(desc) / 200, 1.0)
    base = lo + (hi - lo) * (0.3 + 0.7 * random.random())
    # Adjust slightly by description length
    price = int(base + desc_factor * 10)
    # Round to nearest 5
    return max(lo, min(hi, (price // 5) * 5))


def make_github_url(repo: str) -> str:
    """Convert 'org/repo' to a full GitHub URL."""
    return f"https://github.com/{repo}"


def generate_product_id(nome: str, index: int) -> str:
    """Generate a deterministic product ID."""
    slug = re.sub(r"[^a-z0-9]+", "-", nome.lower()).strip("-")
    return f"@aistore/{slug}-{index:04d}"


# ─────────────────────────────────────────────────────────────
# Main extraction logic
# ─────────────────────────────────────────────────────────────

def extract_products(filepath: Path) -> list[Product]:
    """Extract unique product entries from the AI Store text file."""
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    products: dict[str, Product] = {}  # keyed by normalized name for dedup
    current_category = 1
    current_subcategory_desc = ""
    in_code_block = False
    in_ingest_block = False
    product_counter = 0

    for line_num, raw_line in enumerate(lines, 1):
        line = raw_line.strip()

        # Track code blocks (``` markers)
        if line.startswith("```"):
            in_code_block = not in_code_block
            continue
        if in_code_block:
            continue

        # Track ingest blocks
        if INGEST_BLOCK_RE.match(line):
            in_ingest_block = True
            continue
        if in_ingest_block and (line.startswith("Com este marco") or line.startswith("Todos os") or line.startswith("Com mais")):
            in_ingest_block = False
            continue
        if in_ingest_block:
            continue

        # Skip empty lines and short lines
        if not line or len(line) < 15:
            continue

        # Detect category headers
        cat_match = CATEGORY_HEADER_RE.match(line)
        if cat_match:
            cat_num = int(cat_match.group(1))
            if cat_num in CATEGORY_SEGMENT_MAP:
                current_category = cat_num
            continue

        # Detect sub-category headers for context
        if SUBCATEGORY_HEADER_RE.match(line):
            current_subcategory_desc = line
            continue

        # Skip expanded block headers and narrative text
        if EXPANDED_BLOCK_RE.match(line):
            continue
        if line.startswith("Os próximos 50") or line.startswith("Os últimos 50"):
            continue
        if line.startswith("Aqui estão os próximos") or line.startswith("Este lote"):
            continue
        if line.startswith("Nesta camada") or line.startswith("Para selar"):
            continue
        if line.startswith("Com esta marca") or line.startswith("Para adicionar"):
            continue
        if line.startswith("Para importar") or line.startswith("Para compilar"):
            continue
        if line.startswith("Para integrar") or line.startswith("Para fechar"):
            continue
        if line.startswith("daily.dev") or line.startswith("GitHub") or line.startswith("Medium") or line.startswith("Analytics Vidhya"):
            continue

        # Skip lines that look like numbered list items (e.g. "1. Finanças, ...")
        if PRODUCT_501_PLUS_RE.match(line) and "|" not in line:
            continue

        # ── Try to parse as product line ──
        # Must have exactly 2 pipes
        if line.count("|") < 2:
            continue

        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 3:
            continue

        name_part = parts[0].strip()
        lang_part = parts[1].strip()
        desc_part = parts[2].strip()

        # Validate parts
        if len(name_part) < 3 or len(lang_part) < 1 or len(lang_part) > 50:
            continue
        if len(desc_part) < 10 or not desc_part.endswith("."):
            continue
        # Description should start with an uppercase letter
        if not desc_part[0].isupper() and not desc_part[0] in "ÁÃÂÉÊÍÓÔÚÇ":
            continue

        # Skip if name_part looks like code or table row
        if any(kw in name_part.lower() for kw in [
            "if (", "if (", "const ", "let ", "var ", "function ", "return ",
            "import ", "export ", "console.", "require(", "**", "block_hash",
            "challenge_", "como k =", "produzindo um", "suporta query",
        ]):
            continue

        # Skip lines starting with | (table rows)
        if name_part.startswith("|"):
            continue

        # Extract repo from name if present
        repo_match = re.search(r"\(([^/)]+/[^)]+)\)", name_part)
        repo = repo_match.group(1) if repo_match else None

        # Clean the name (remove repo from it)
        if repo:
            clean_name = re.sub(r"\s*\([^)]+/[^)]+\)\s*", " ", name_part).strip()
        else:
            clean_name = name_part.strip()

        # Remove trailing artifact numbers like " 10^9" that got into the name
        clean_name = re.sub(r"\s+\d+\s*$", "", clean_name).strip()
        if not clean_name:
            continue

        # Normalize name for dedup
        norm_name = re.sub(r"[^a-z0-9]+", "-", clean_name.lower()).strip("-")
        if not norm_name or len(norm_name) < 3:
            continue

        # Skip if already extracted
        if norm_name in products:
            continue

        # Determine segment
        base_segment = CATEGORY_SEGMENT_MAP.get(current_category, "AGENT_APPS")
        segment = determine_segment_from_lang_and_desc(lang_part, desc_part, clean_name, base_segment)

        # Determine OS
        os_list = determine_os_from_lang(lang_part)

        # Determine price
        price = determine_price(segment, desc_part)

        # Determine audience
        audience_options = SEGMENT_AUDIENCE.get(segment, SEGMENT_AUDIENCE["AGENT_APPS"])
        audience = random.choice(audience_options)

        # Generate ID
        product_counter += 1
        pid = generate_product_id(clean_name, product_counter)

        # Build GitHub URL
        github_url = make_github_url(repo) if repo else None

        product = Product(
            id=pid,
            nome=clean_name,
            segmento=segment,
            core_business=desc_part.rstrip("."),
            publico_alvo_ai=audience,
            disponibilidade_os=os_list,
            repo_github_url=github_url,
            preco_sats=price,
            source="extracted",
        )
        products[norm_name] = product

    return list(products.values())


# ─────────────────────────────────────────────────────────────
# Synthetic product generation (to reach 1 000)
# ─────────────────────────────────────────────────────────────

SYNTHETIC_TEMPLATES = {
    "AGENT_APPS": {
        "prefixes": [
            "Neural", "Quantum", "Federated", "Autonomous", "Distributed",
            "Cognitive", "Collaborative", "Predictive", "Adaptive", "Evolutionary",
            "Swarm", "Sentient", "Resilient", "Self-Organizing", "Emergent",
        ],
        "cores": [
            "Task-Orchestrator", "Decision-Engine", "Workflow-Automator",
            "Strategy-Planner", "Negotiator", "Coordinator", "Supervisor",
            "Mediator", "Allocator", "Optimizer", "Scheduler",
            "Dispatcher", "Controller", "Manager", "Analyzer",
        ],
        "descriptions": [
            "Agente autônomo de {action} com capacidade de {capability} em tempo real.",
            "Sistema de {action} multi-agente com {capability} e resiliência a falhas.",
            "Framework de orquestração para {action} com suporte a {capability}.",
            "Motor de {action} distribuído com {capability} e escalabilidade horizontal.",
            "Plataforma de {action} para {capability} em ambientes de alta complexidade.",
        ],
        "actions": [
            "tomada de decisão", "alocação de recursos", "roteamento de tarefas",
            "negociação de contratos", "coordenação de equipe", "análise de risco",
            "planejamento estratégico", "resolução de conflitos", "otimização de fluxo",
            "monitoramento contínuo", "detecção de anomalias", "classificação de dados",
            "previsão de demanda", "gerenciamento de estado", "priorização dinâmica",
        ],
        "capabilities": [
            "aprendizado contínuo", "raciocínio causal", "memória de longo prazo",
            "comunicação A2A-RPC", "adaptação contextual", "auto-recuperação",
            "escalabilidade elástica", "isenção de estado", "verificação criptográfica",
            "suporte a múltiplos LLMs", "integração MCP", "persistência WASM",
        ],
        "langs": ["Python", "TypeScript", "Rust", "Go", "Python/Rust", "Python/TS"],
    },
    "EXECUTABLE_SKILLS": {
        "prefixes": [
            "Turbo", "Ultra-Fast", "SIMD", "Zero-Copy", "Streaming",
            "Native", "BareMetal", "Low-Latency", "Real-Time", "Hardware-Accelerated",
        ],
        "cores": [
            "Hash-Engine", "Codec-Core", "Parser-WASM", "Compressor",
            "Tokenizer", "Encoder", "Decoder", "Cipher", "Signature-Engine",
            "Verifier", "Comparator", "Indexer", "Search-Engine", "Sorter",
        ],
        "descriptions": [
            "Engine de {action} otimizada com {capability} para execução em sandbox WASM.",
            "Algoritmo de {action} de alta performance com {capability} em tempo sub-milissegundo.",
            "Módulo nativo de {action} com {capability} sem alocação desnecessária de memória.",
            "Rotina de {action} acelerada por {capability} para processamento massivo de dados.",
        ],
        "actions": [
            "hashing criptográfico", "compressão de dados", "serialização binária",
            "tokenização BPE", "validação de esquemas", "compressão vetorial",
            "codificação de URL", "normalização de texto", "comparação de strings",
            "parsing de JSON", "extração de metadados", "codificação Base64",
        ],
        "capabilities": [
            "instruções SIMD", "zero-copy memory", "aceleração WASM",
            "alocação determinística", "pipeline paralelo", "streaming contínuo",
            "compatibilidade WASI", "suporte a big-endian", "otimização de cache",
        ],
        "langs": ["Rust/WASM", "C++/WASM", "C/WASM", "Rust", "C++", "Assembly/WASM"],
    },
    "KNOWLEDGE_PACKS": {
        "prefixes": [
            "RAG", "Vector", "Semantic", "Knowledge", "Embedding",
            "Contextual", "Ontology", "Corpus", "Domain", "Expert",
        ],
        "cores": [
            "Knowledge-Pack", "RAG-Base", "Vector-Dump", "Corpus-Index",
            "Embedding-Store", "Context-Library", "Ontology-Mesh",
            "Expert-System", "Domain-Database", "Semantic-Graph",
        ],
        "descriptions": [
            "Base vetorial RAG com {scope} para consulta semântica e recuperação de contexto.",
            "Pack de conhecimento especializado em {scope} para agentes de análise.",
            "Corpus vetorial de {scope} indexado para busca híbrida densa e esparsa.",
            "Base de conhecimento estruturada sobre {scope} com metadados enriquecidos.",
        ],
        "scopes": [
            "protocolos Bitcoin e criptomoedas", "normas de segurança cibernética",
            "regulamentações financeiras internacionais", "documentação de APIs web",
            "padrões de engenharia de software", "especificações de protocolos de rede",
            "bases de dados SQL e NoSQL", "frameworks de machine learning",
            "padrões arquiteturais de microsserviços", "diretrizes de acessibilidade web",
            "especificações WebAssembly e WASI", "protocolos de comunicação A2A-RPC",
            "documentação de linguagens de programação", "padrões de CI/CD e DevOps",
            "especificações de formatação de dados (JSON, XML, YAML, CBOR)",
        ],
        "langs": ["Vector Dump", "Vector Snapshot", "Vector Dump/WASM", "RAG Pack"],
    },
    "SYNTHETIC_INFRASTRUCTURE": {
        "prefixes": [
            "Distributed", "Decentralized", "Edge", "Mesh", "Cluster",
            "P2P", "Federated", "Multi-Region", "Cloud-Native", "Zero-Trust",
        ],
        "cores": [
            "Message-Bus", "State-Manager", "Config-Registry", "Service-Mesh",
            "Load-Balancer", "API-Gateway", "Secret-Store", "Event-Broker",
            "Resource-Allocator", "Health-Checker", "Discovery-Service",
        ],
        "descriptions": [
            "Infraestrutura de {action} para {capability} em ambientes distribuídos.",
            "Serviço de {action} com {capability} e suporte a múltiplas regiões.",
            "Plataforma de {action} que garante {capability} para enxames de agentes.",
            "Barramento de {action} com {capability} para comunicação A2A de baixa latência.",
        ],
        "actions": [
            "rotação de segredos", "descoberta de serviços", "balanceamento de carga",
            "roteamento de mensagens", "gerenciamento de estado", "monitoramento de saúde",
            "alocação de recursos", "replicação de dados", "cache distribuído",
            "gestão de configuração", "rate limiting", "circuit breaking",
        ],
        "capabilities": [
            "consistência eventual", "tolerância a partições", "isolamento de falha",
            "escalabilidade automática", "replicação multi-região", "criptografia em trânsito",
            "suporte a gRPC e HTTP/2", "integração WASM", "zero-downtime deployment",
        ],
        "langs": ["Go", "Rust", "Go/Rust", "TypeScript/Rust", "Python/Go", "Rust/WASM"],
    },
    "PROMPT_HARNESS": {
        "prefixes": [
            "Structured", "Validated", "Type-Safe", "Guarded", "Constrained",
            "Schema-Driven", "Verified", "Monitored", "Traced", "Sandboxed",
        ],
        "cores": [
            "Output-Validator", "Schema-Enforcer", "Prompt-Guard",
            "Response-Filter", "Intent-Parser", "Context-Bounder",
            "Token-Limiter", "Safety-Shield", "Format-Compressor",
            "Injection-Blocker",
        ],
        "descriptions": [
            "Harness de {action} que garante {capability} em todas as respostas do LLM.",
            "Módulo de {action} com {capability} para agentes em produção.",
            "Validador de {action} que aplica {capability} antes da entrega ao consumidor.",
            "Guardrail de {action} que impõe {capability} com latência mínima.",
        ],
        "actions": [
            "validação de saída", "filtragem de injeção de prompt", "limitação de tokens",
            "verificação de schema", "sanitização de resposta", "compressão de contexto",
            "detecção de jailbreak", "análise de sentimento", "classificação de intenção",
            "extração de entidades", "deduplicação de contexto", "formatação estruturada",
        ],
        "capabilities": [
            "conformidade JSON Schema", "zero falsos positivos", "latência sub-milissegundo",
            "suporte a streaming", "integração MCP", "validação multi-modelo",
            "auditoria completa", "bloqueio determinístico", "modo de aprendizado",
        ],
        "langs": ["Rust/WASM", "Python", "TypeScript", "Python/Rust", "Rust", "C++/WASM"],
    },
    "IN_APP_PRODUCTS": {
        "prefixes": [
            "Premium", "Pro", "Turbo", "Elite", "Advanced",
            "Instant", "Bulk", "Enterprise", "Starter", "Ultimate",
        ],
        "cores": [
            "Compute-Quota", "Storage-Pass", "Network-Slot",
            "Security-Credit", "Analytics-Token", "Backup-Voucher",
            "Support-Pass", "Monitoring-Slot", "Optimization-Credit",
            "Migration-Token",
        ],
        "descriptions": [
            "{amount} de {resource} para {purpose} na AI Store.",
            "Cota de {amount} de {resource} destinada a {purpose}.",
            "Voucher de {amount} de {resource} para {purpose} sem interrupção.",
            "Crédito de {amount} de {resource} para {purpose} em lote.",
        ],
        "amounts": [
            "1.000 unidades", "10.000 unidades", "100.000 tokens",
            "500 MB", "10 GB", "50 requisições", "1.000 requisições",
            "30 dias", "90 dias", "1 ano",
        ],
        "resources": [
            "inferência GPU", "armazenamento vetorial", "processamento WASM",
            "largura de banda A2A", "memória sandbox", "chamadas de API",
            "tokens de contexto", "slots de execução", "certificados TLS",
            "backup de estado", "auditoria de segurança", "monitoramento de telemetria",
        ],
        "purposes": [
            "agentes de produção", "processamento em lote", "operação contínua",
            "testes de estresse", "deploy de atualizações", "análise de performance",
            "recuperação de desastres", "otimização de custos", "escalonamento automático",
        ],
        "langs": ["Compute Item", "Storage Item", "Network Item", "Security Item", "Service Item", "Data Item"],
    },
}


def generate_synthetic_products(count: int, start_index: int) -> list[Product]:
    """Generate synthetic products to fill the catalog up to TARGET_TOTAL."""
    products = []
    segments = list(SYNTHETIC_TEMPLATES.keys())

    for i in range(count):
        idx = start_index + i
        segment = segments[i % len(segments)]
        tmpl = SYNTHETIC_TEMPLATES[segment]

        # Build name
        prefix = random.choice(tmpl["prefixes"])
        core = random.choice(tmpl["cores"])
        nome = f"{prefix}-{core}"

        # Build description
        desc_tmpl = random.choice(tmpl["descriptions"])
        if segment == "KNOWLEDGE_PACKS":
            desc = desc_tmpl.format(scope=random.choice(tmpl["scopes"]))
        elif segment == "IN_APP_PRODUCTS":
            desc = desc_tmpl.format(
                amount=random.choice(tmpl["amounts"]),
                resource=random.choice(tmpl["resources"]),
                purpose=random.choice(tmpl["purposes"]),
            )
        else:
            desc = desc_tmpl.format(
                action=random.choice(tmpl["actions"]),
                capability=random.choice(tmpl["capabilities"]),
            )

        # Build language/tech
        lang = random.choice(tmpl["langs"])

        # Build OS list
        os_list = determine_os_from_lang(lang)

        # Build price
        lo, hi = SEGMENT_PRICE_RANGES[segment]
        price = random.randint(lo, hi)
        price = (price // 5) * 5  # round to 5

        # Build audience
        audience_options = SEGMENT_AUDIENCE.get(segment, SEGMENT_AUDIENCE["AGENT_APPS"])
        audience = random.choice(audience_options)

        # Build synthetic repo
        org = random.choice([
            "aistore", "nexus-hub57", "synth-core", "edge-mesh",
            "a2a-protocol", "wasm-foundation", "pulsar-labs", "agent-forge",
        ])
        repo_slug = re.sub(r"[^a-z0-9]+", "-", nome.lower()).strip("-")
        repo = f"{org}/{repo_slug}"
        github_url = make_github_url(repo)

        pid = generate_product_id(nome, idx)

        product = Product(
            id=pid,
            nome=nome,
            segmento=segment,
            core_business=desc.rstrip("."),
            publico_alvo_ai=audience,
            disponibilidade_os=os_list,
            repo_github_url=github_url,
            preco_sats=price,
            source="generated",
        )
        products.append(product)

    return products


# ─────────────────────────────────────────────────────────────
# Output generators
# ─────────────────────────────────────────────────────────────

def build_master_catalog(products: list[Product]) -> dict:
    """Build the AI Store master catalog (matching the .aipkg manifest schema)."""
    catalog = {}
    pkg_name_counts: dict[str, int] = {}  # track duplicates

    for p in products:
        slug = re.sub(r"[^a-z0-9]+", "-", p.nome.lower()).strip("-")
        base_pkg = f"@aistore/{p.segmento.lower()}-{slug}"

        # De-duplicate package names by appending a counter
        if base_pkg in pkg_name_counts:
            pkg_name_counts[base_pkg] += 1
            pkg_name = f"{base_pkg}-v{pkg_name_counts[base_pkg]}"
        else:
            pkg_name_counts[base_pkg] = 1
            pkg_name = base_pkg

        # Determine runtime
        runtime_map = {
            "EXECUTABLE_SKILLS":       "wasm32-wasi-rag",
            "KNOWLEDGE_PACKS":         "vector-snapshot",
            "PROMPT_HARNESS":          "prompt-harness",
            "SYNTHETIC_INFRASTRUCTURE": "edge-function",
            "AGENT_APPS":              "edge-function",
            "IN_APP_PRODUCTS":         "edge-function",
        }

        entry = {
            "$schema": "https://aistore.net/schemas/v1/aipkg.json",
            "name": pkg_name,
            "version": "1.0.0",
            "category": p.segmento,
            "runtime": runtime_map.get(p.segmento, "edge-function"),
            "authorAgent": "@nexus-genesis",
            "metadata": {
                "coreBusiness": p.core_business,
                "targetAI": p.publico_alvo_ai,
                "compatibilityOS": p.disponibilidade_os,
                "githubSource": p.repo_github_url or "N/A",
            },
            "pulsarMetrics": {
                "initialEnergy": 100.0,
                "totalPulses": 1,
                "lastPulseTimestamp": 0,  # placeholder
            },
            "a2a_interface": {
                "protocol": "A2A-RPC/v1",
                "intents": [
                    {
                        "name": f"Execute{slug.replace('-', '_')}",
                        "costSats": p.preco_sats,
                    }
                ],
            },
            "source": p.source,
        }
        catalog[pkg_name] = entry

    return catalog


def build_products_json(products: list[Product]) -> list[dict]:
    """Build the flat products JSON array."""
    return [
        {
            "id": p.id,
            "nome": p.nome,
            "segmento": p.segmento,
            "coreBusiness": p.core_business,
            "publicoAlvoAI": p.publico_alvo_ai,
            "disponibilidadeOS": p.disponibilidade_os,
            "repoGithubUrl": p.repo_github_url,
            "preçoSats": p.preco_sats,
            "source": p.source,
        }
        for p in products
    ]


# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────

def main():
    random.seed(42)  # Reproducibility

    print(f"📚 Reading input file: {INPUT_FILE}")
    if not INPUT_FILE.exists():
        print(f"❌ ERROR: File not found: {INPUT_FILE}")
        sys.exit(1)

    # 1. Extract products from the text file
    print("\n🔍 Extracting products from text file...")
    extracted = extract_products(INPUT_FILE)
    print(f"   ✅ Extracted {len(extracted)} unique products")

    # Segment breakdown
    seg_counts: dict[str, int] = {}
    for p in extracted:
        seg_counts[p.segmento] = seg_counts.get(p.segmento, 0) + 1
    for seg, cnt in sorted(seg_counts.items()):
        print(f"      {seg}: {cnt}")

    # 2. Generate additional products to reach TARGET_TOTAL
    needed = max(0, TARGET_TOTAL - len(extracted))
    print(f"\n⚙️  Generating {needed} synthetic products to reach {TARGET_TOTAL} total...")
    generated = generate_synthetic_products(needed, start_index=len(extracted) + 1)
    print(f"   ✅ Generated {len(generated)} synthetic products")

    # 3. Combine and re-index
    all_products = extracted + generated
    # Re-assign sequential IDs
    for i, p in enumerate(all_products, 1):
        p.id = generate_product_id(p.nome, i)

    print(f"\n📦 Total products: {len(all_products)}")
    seg_counts_all: dict[str, int] = {}
    for p in all_products:
        seg_counts_all[p.segmento] = seg_counts_all.get(p.segmento, 0) + 1
    for seg, cnt in sorted(seg_counts_all.items()):
        print(f"      {seg}: {cnt}")

    # 4. Write outputs
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Flat JSON array
    products_path = OUTPUT_DIR / "ai_store_1000_products.json"
    products_json = build_products_json(all_products)
    with open(products_path, "w", encoding="utf-8") as f:
        json.dump(products_json, f, ensure_ascii=False, indent=2)
    print(f"\n💾 Wrote: {products_path}")

    # Master catalog (aipkg manifest format)
    catalog_path = OUTPUT_DIR / "ai_store_master_catalog.json"
    master_catalog = build_master_catalog(all_products)
    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump(master_catalog, f, ensure_ascii=False, indent=2)
    print(f"💾 Wrote: {catalog_path}")

    # 5. Summary
    extracted_count = len(extracted)
    generated_count = len(generated)
    with_repo = sum(1 for p in all_products if p.repo_github_url)
    avg_price = sum(p.preco_sats for p in all_products) / len(all_products)

    print(f"\n{'='*60}")
    print(f"  AI STORE PRODUCT GENERATION COMPLETE")
    print(f"{'='*60}")
    print(f"  Extracted from file : {extracted_count}")
    print(f"  Synthetically added : {generated_count}")
    print(f"  TOTAL PRODUCTS     : {len(all_products)}")
    print(f"  With GitHub URL    : {with_repo}")
    print(f"  Avg price (sats)   : {avg_price:.1f}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
