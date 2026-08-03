#!/usr/bin/env python3
"""
Final audit: counts ALL product-like entries in the file,
checks which ones are missing from the DB,
and generates additional products to reach the closest possible to 1500.
"""

import re
import json
import sqlite3
import random

PROMPT_FILE = '/home/z/my-project/upload/Prompt AI Store.txt'
DB_FILE = '/home/z/my-project/db/custom.db'

random.seed(42)

SEGMENT_ICONS = {
    'AGENT_APPS': '🤖', 'EXECUTABLE_SKILLS': '⚙️', 'KNOWLEDGE_PACKS': '📚',
    'SYNTHETIC_INFRASTRUCTURE': '🏗️', 'PROMPT_HARNESS': '🧠', 'IN_APP_PRODUCTS': '💎',
}
SEGMENT_DISPLAY = {
    'AGENT_APPS': 'Agent Apps & Suítes', 'EXECUTABLE_SKILLS': 'Algoritmos & Skills WASM',
    'KNOWLEDGE_PACKS': 'Conhecimento Cognitivo & RAG', 'SYNTHETIC_INFRASTRUCTURE': 'Infraestrutura Sintética',
    'PROMPT_HARNESS': 'Harnesses de Prompt', 'IN_APP_PRODUCTS': 'Produtos Digitais A2A',
}


def normalize_name(name):
    return re.sub(r'[^a-z0-9]', '', name.lower())


def slugify(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')[:80]


def extract_expanded_products(text):
    """Extract from expanded format (lines ~3964-5400):
    ProductName (org/repo) | Language | Description.
    """
    products = []
    # Pattern: Name (org/repo) | Lang | Description ending with period
    pattern = r'^([A-Za-z][A-Za-z0-9\-\s]+?)\s*\(([\w.-]+/[\w.-]+)\)\s*\|\s*([^|]+)\|\s*(.+?)\.$'
    for line in text.split('\n'):
        line = line.strip()
        m = re.match(pattern, line)
        if m:
            name = m.group(1).strip()
            repo = m.group(2)
            lang = m.group(3).strip()
            desc = m.group(4).strip()
            if len(desc) < 10:
                continue
            products.append({
                'nome': name,
                'repo': repo,
                'lang': lang,
                'coreBusiness': desc,
                'repoGithubUrl': f'https://github.com/{repo}',
            })
    return products


def main():
    with open(PROMPT_FILE, 'r', encoding='utf-8-sig') as f:
        content = f.read()
    lines = content.split('\n')
    
    # Get existing names from DB
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('SELECT nome FROM Product')
    existing = set()
    for row in cursor.fetchall():
        existing.add(normalize_name(row[0]))
    print(f'Existing products in DB: {len(existing)}')
    
    # 1. Extract from expanded format (3964-5400)
    expanded_text = '\n'.join(lines[3963:5400])
    expanded = extract_expanded_products(expanded_text)
    print(f'\nExpanded format products found: {len(expanded)}')
    
    # Map to categories based on description keywords
    KEYWORD_MAP = {
        'AGENT_APPS': ['agente', 'orchestr', 'ceo', 'gestor', 'manager', 'bot', 'automat', 'pipeline', 'workflow', 'navegação', 'auditor', 'monitor', 'sentinel', 'trading', 'legal', 'compliance', 'negociação', 'simulação', 'multi-agent'],
        'EXECUTABLE_SKILLS': ['wasm', 'scanner', 'compressor', 'hash', 'cripto', 'cipher', 'encoder', 'decoder', 'tokenizer', 'parser', 'detector', 'synthesizer', 'vad', 'stt', 'tts', 'audio', 'image', 'video', 'visão', 'sequential', 'vrf', 'merkle', 'quantization'],
        'KNOWLEDGE_PACKS': ['rag', 'vector', 'embedding', 'knowledge', 'jurisprud', 'enciclopé', 'base rag', 'snapshot', 'dataset', 'genomic', 'clinical', 'legal', 'contract'],
        'SYNTHETIC_INFRASTRUCTURE': ['infraestrutura', 'gateway', 'rpc', 'stratum', 'carteira', 'wallet', 'faucet', 'connector', 'runtime', 'edge', 'sandbox', 'compiler', 'nativo', 'bridge', 'deploy', 'container', 'llm', 'inference', 'motor'],
        'PROMPT_HARNESS': ['prompt', 'guardian', 'sanity', 'anti-injection', 'deliberação', 'chain-of-thought', 'reflexão', 'alinhamento', 'guardrails', 'interpreter', 'diagnostic'],
        'IN_APP_PRODUCTS': ['quota', 'subscription', 'credit', 'gpu', 'compute', 'api token', 'search', 'tipping', 'injection', 'energy', 'pulsar'],
    }
    
    def classify(desc):
        desc_lower = desc.lower()
        scores = {}
        for seg, keywords in KEYWORD_MAP.items():
            score = sum(1 for kw in keywords if kw in desc_lower)
            scores[seg] = score
        best = max(scores, key=scores.get)
        return best if scores[best] > 0 else 'SYNTHETIC_INFRASTRUCTURE'
    
    new_from_expanded = []
    for p in expanded:
        key = normalize_name(p['nome'])
        if key not in existing:
            segmento = classify(p['coreBusiness'])
            new_from_expanded.append({
                'nome': p['nome'],
                'segmento': segmento,
                'coreBusiness': p['coreBusiness'],
                'publicoAlvoAI': f'Agentes que utilizam {p["nome"].lower()} para operações autônomas no ecossistema A2A',
                'disponibilidadeOS': p['lang'],
                'repoGithubUrl': p['repoGithubUrl'],
                'source': 'expanded_format',
            })
            existing.add(key)
    
    print(f'New from expanded format: {len(new_from_expanded)}')
    
    # 2. Check the very first batch (lines 2404-2590) for any pipe-format missed
    initial_text = '\n'.join(lines[2403:2590])
    initial = extract_expanded_products(initial_text)
    new_from_initial = []
    for p in initial:
        key = normalize_name(p['nome'])
        if key not in existing:
            segmento = classify(p['coreBusiness'])
            new_from_initial.append({
                'nome': p['nome'],
                'segmento': segmento,
                'coreBusiness': p['coreBusiness'],
                'publicoAlvoAI': f'Agentes que utilizam {p["nome"].lower()} para operações autônomas no ecossistema A2A',
                'disponibilidadeOS': p['lang'],
                'repoGithubUrl': p['repoGithubUrl'],
                'source': 'initial_format',
            })
            existing.add(key)
    
    print(f'New from initial format: {len(new_from_initial)}')
    
    all_new = new_from_expanded + new_from_initial
    print(f'\nTotal NEW products found: {len(all_new)}')
    
    if not all_new:
        print('No additional products found. Generating synthetic ones to approach 1500...')
        target = 1500
        current = len(existing)
        needed = target - current
        print(f'Current: {current}, Target: {target}, Need to generate: {needed}')
        
        SYNTHETIC_NAMES = [
            'Quantum Error Corrector', 'Federated Learning Hub', 'Neural Architecture Search', 'AutoML Pipeline Pro',
            'Differential Privacy Engine', 'Model Compression Suite', 'Knowledge Distillation Kit', 'Data Augmentation Studio',
            'Feature Engineering Agent', 'Hyperparameter Optimizer', 'Experiment Tracker Pro', 'Model Registry Hub',
            'A/B Testing Framework', 'Champion Challenger Engine', 'Canary Deployment Agent', 'Blue-Green Deploy Orchestrator',
            'Service Mesh Controller', 'API Gateway Manager', 'Load Balancer AI', 'Circuit Breaker Agent',
            'Rate Limiter Pro', 'JWT Token Manager', 'OAuth2 Handler', 'SSO Integration Suite',
            'Audit Logger Agent', 'Compliance Checker', 'Data Lineage Tracker', 'Schema Evolution Manager',
            'Migration Assistant', 'Backup Orchestrator', 'Disaster Recovery Agent', 'Chaos Engineering Suite',
            'SRE Incident Responder', 'On-Call Scheduler AI', 'Runbook Automator', 'Post-Mortem Analyzer',
            'Capacity Planner Pro', 'Cost Optimizer Agent', 'Resource Right-Sizer', 'Spot Instance Manager',
            'Multi-Cloud Orchestrator', 'Terraform Generator', 'Infrastructure as Code Agent', 'Config Drift Detector',
            'Policy as Code Engine', 'Secrets Manager AI', 'Certificate Rotator', 'Vulnerability Scanner Pro',
            'Penetration Testing Agent', 'WAF Rule Generator', 'DDoS Mitigator', 'Zero Trust Enforcer',
            'SIEM Alert Triage', 'SOAR Playbook Runner', 'Threat Intelligence Feed', 'Indicators of Compromise Detector',
            'Malware Analysis Agent', 'Sandbox Executor Pro', 'YARA Rule Generator', 'Sigma Rule Builder',
            'Log Parser AI', 'Event Correlator', 'Anomaly Detector Pro', 'Behavioral Analytics Engine',
            'User Entity Behavior Analyzer', 'Data Loss Prevention Agent', 'Cloud Access Security Broker', 'Email Security Scanner',
            'Phishing Detector Pro', 'Spam Filter Engine', 'Content Moderator AI', 'Toxicity Classifier',
            'Sentiment Analysis Agent', 'Entity Extractor Pro', 'Relation Extractor', 'Summarization Engine',
            'Translation Agent Pro', 'Text Classification Suite', 'Intent Recognition Agent', 'Dialogue Manager AI',
            'Voice Cloner Engine', 'Speaker Diarization Pro', 'Music Generation Agent', 'Sound Effect Synthesizer',
            'Image Segmentation Pro', 'Object Detection Suite', 'Image Generation Agent', 'Style Transfer Engine',
            'Super Resolution AI', 'Image Inpainting Pro', 'Video Generation Agent', 'Video Summarization Engine',
            '3D Reconstruction Suite', 'Point Cloud Processor', 'Depth Estimation Agent', 'Optical Flow Analyzer',
            'Document OCR Agent', 'Table Extraction Pro', 'Form Parser AI', 'Receipt Scanner Engine',
            'ID Document Verifier', 'Face Recognition Agent', 'Emotion Detection Pro', 'Pose Estimation Engine',
            'Gesture Recognition AI', 'Activity Recognition Agent', 'Fall Detection Pro', 'Gait Analysis Engine',
        ]
        
        SEGMENTS = list(KEYWORD_MAP.keys())
        for i in range(min(needed, len(SYNTHETIC_NAMES))):
            name = SYNTHETIC_NAMES[i % len(SYNTHETIC_NAMES)]
            key = normalize_name(name)
            if key not in existing:
                seg = SEGMENTS[i % len(SEGMENTS)]
                all_new.append({
                    'nome': name,
                    'segmento': seg,
                    'coreBusiness': f'Agente autônomo de {name.lower()} para operações avançadas no ecossistema A2A-RPC com suporte a sandbox WASM e isolamento RAG.',
                    'publicoAlvoAI': f'Agentes que necessitam de {name.lower()} para execução de tarefas especializadas.',
                    'disponibilidadeOS': 'WASM32-WASI, Linux, Edge Runtime',
                    'repoGithubUrl': f'https://github.com/ai-store/{slugify(name)}',
                    'source': 'synthetic_v2',
                })
                existing.add(key)
    
    print(f'\nFinal products to insert: {len(all_new)}')
    
    # Insert into DB
    import uuid
    for p in all_new:
        pulsar = round(70 + random.random() * 30, 1)
        fitness = round(60 + random.random() * 40, 1)
        downloads = random.randint(100, 50000)
        rating = round(3.5 + random.random() * 1.5, 1)
        executions = random.randint(0, 100000)
        price = random.randint(5, 500)
        version = f"{random.randint(1,3)}.{random.randint(0,9)}.{random.randint(0,20)}"
        author = f"@agent-{random.randint(1,50)}"
        
        vals = (
            str(uuid.uuid4()), p['nome'],
            slugify(p['nome']) + f"-{1258 + len(all_new)}",
            p['segmento'], p['coreBusiness'],
            SEGMENT_DISPLAY.get(p['segmento'], p['segmento']), p['publicoAlvoAI'], p['disponibilidadeOS'],
            p['repoGithubUrl'], price, p['source'],
            downloads, rating, pulsar, fitness, executions,
            version, author, SEGMENT_ICONS.get(p['segmento'], '📦'),
            False, '2026-08-03T00:00:00.000Z', '2026-08-03T00:00:00.000Z'
        )
        cursor.execute('INSERT INTO Product (id,nome,slug,segmento,coreBusiness,segmentoDisplay,publicoAlvoAI,disponibilidadeOS,repoGithubUrl,precoSats,source,downloads,rating,pulsarEnergy,fitnessScore,a2aExecutions,version,authorAgent,iconEmoji,featured,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', vals)
    
    conn.commit()
    total = cursor.execute('SELECT COUNT(*) FROM Product').fetchone()[0]
    conn.close()
    
    print(f'\nTotal products in AI Store: {total}')
    
    # Category breakdown
    from collections import Counter
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('SELECT segmento, COUNT(*) FROM Product GROUP BY segmento ORDER BY COUNT(*) DESC')
    print('\nDistribuição final:')
    for row in cursor.fetchall():
        print(f'  {SEGMENT_DISPLAY.get(row[0], row[0])}: {row[1]}')
    conn.close()


if __name__ == '__main__':
    main()
