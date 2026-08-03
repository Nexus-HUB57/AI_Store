#!/usr/bin/env python3
"""
V2: Extracts ALL tab-separated products more aggressively.
Parses lines 9892-10600 with at least 4 tab-separated fields.
"""

import re
import json
import sqlite3
import random

PROMPT_FILE = '/home/z/my-project/upload/Prompt AI Store.txt'
DB_FILE = '/home/z/my-project/db/custom.db'
OUTPUT_FILE = '/home/z/my-project/output/additional_products_v2.json'

random.seed(42)

SEGMENT_MAP = {
    'Modelos de IA (LLMs, visão, áudio)': 'KNOWLEDGE_PACKS',
    'Motor de LLM local': 'SYNTHETIC_INFRASTRUCTURE',
    'Servidor de inferência de LLM': 'SYNTHETIC_INFRASTRUCTURE',
    'Modelos de linguagem': 'KNOWLEDGE_PACKS',
    'Plataforma de chat LLM': 'AGENT_APPS',
    'Speech-to-Text': 'EXECUTABLE_SKILLS',
    'Síntese de Voz': 'EXECUTABLE_SKILLS',
    'Visão Computacional (YOLO)': 'EXECUTABLE_SKILLS',
    'Visão Computacional': 'EXECUTABLE_SKILLS',
    'Orquestração de Agentes': 'AGENT_APPS',
    'Multi-agente': 'AGENT_APPS',
    'RAG e Indexação de Dados': 'KNOWLEDGE_PACKS',
    'Agente Autônomo Geral': 'AGENT_APPS',
    'Executor de Código com LLM': 'AGENT_APPS',
    'Inferência no Navegador': 'EXECUTABLE_SKILLS',
    'Interface de LLM auto-hospedada': 'SYNTHETIC_INFRASTRUCTURE',
    'Plataforma RAG': 'KNOWLEDGE_PACKS',
    'LLM local leve': 'SYNTHETIC_INFRASTRUCTURE',
    'Compilação universal de LLM': 'SYNTHETIC_INFRASTRUCTURE',
    'Framework de Deep Learning Leve': 'SYNTHETIC_INFRASTRUCTURE',
    'Aplicação RAG multi-LLM': 'KNOWLEDGE_PACKS',
    'Geração de Imagens': 'EXECUTABLE_SKILLS',
    'Modelo de difusão': 'KNOWLEDGE_PACKS',
    'Node-based para difusão': 'AGENT_APPS',
    'Manipulação de vídeo': 'EXECUTABLE_SKILLS',
    'Banco de dados vetorial': 'SYNTHETIC_INFRASTRUCTURE',
    'Integração de dados (ETL)': 'SYNTHETIC_INFRASTRUCTURE',
    'Fluxo de dados': 'SYNTHETIC_INFRASTRUCTURE',
    'Pipeline de dados': 'SYNTHETIC_INFRASTRUCTURE',
    'Orquestração de workflow': 'AGENT_APPS',
    'MLOps': 'SYNTHETIC_INFRASTRUCTURE',
    'Versionamento de dados e modelos': 'SYNTHETIC_INFRASTRUCTURE',
    'Plataforma LLMOps': 'AGENT_APPS',
    'Low-code para LLM': 'AGENT_APPS',
    'Automação de workflow': 'AGENT_APPS',
    'Automação open-source': 'AGENT_APPS',
    'Orquestração orientada a eventos': 'SYNTHETIC_INFRASTRUCTURE',
    'AutoML e previsões em bancos': 'AGENT_APPS',
    'Pipelines de dados e ML': 'SYNTHETIC_INFRASTRUCTURE',
    'Qualidade de dados': 'PROMPT_HARNESS',
    'Validação de ML': 'PROMPT_HARNESS',
    'Robustez de IA': 'PROMPT_HARNESS',
    'Interpretabilidade de ML': 'PROMPT_HARNESS',
    'AutoML': 'AGENT_APPS',
    'Trading algorítmico': 'AGENT_APPS',
    'Catálogo de APIs': 'IN_APP_PRODUCTS',
    'API de busca': 'IN_APP_PRODUCTS',
    'Conectores de marketing': 'IN_APP_PRODUCTS',
    'Processamento de Linguagem': 'EXECUTABLE_SKILLS',
    'Assistente de Conhecimento': 'KNOWLEDGE_PACKS',
    'Processamento de Fluxos de Dados': 'SYNTHETIC_INFRASTRUCTURE',
    'Agente Multi-modelo': 'AGENT_APPS',
    'Infraestrutura / Ambientes de Execução': 'SYNTHETIC_INFRASTRUCTURE',
    'Fine-tuning & Deploy': 'SYNTHETIC_INFRASTRUCTURE',
    'Inferência Distribuída': 'SYNTHETIC_INFRASTRUCTURE',
    'Treinamento & Inferência Otimizada': 'SYNTHETIC_INFRASTRUCTURE',
    'Inferência de LLM em CPU/Edge': 'SYNTHETIC_INFRASTRUCTURE',
    'Agente de Código': 'AGENT_APPS',
    'Agente de Engenharia de Software': 'AGENT_APPS',
    'Servidor de Inferência Estruturada': 'SYNTHETIC_INFRASTRUCTURE',
    'Gateway de LLMs': 'SYNTHETIC_INFRASTRUCTURE',
    'Modelos de Embedding': 'KNOWLEDGE_PACKS',
    'Busca de Similaridade': 'EXECUTABLE_SKILLS',
    'Modelos Multimodais Leves': 'KNOWLEDGE_PACKS',
    'Inferência de LLM Otimizada': 'SYNTHETIC_INFRASTRUCTURE',
    'Armazenamento de Dados': 'SYNTHETIC_INFRASTRUCTURE',
    'Catálogo de Dados Versionado': 'SYNTHETIC_INFRASTRUCTURE',
    'Notebook Reativo para Python': 'AGENT_APPS',
    'Monitoramento de Modelos': 'PROMPT_HARNESS',
    'Perfilamento Estatístico de Dados': 'PROMPT_HARNESS',
    'Estimativa de Performance sem Ground Truth': 'PROMPT_HARNESS',
    'Monitoramento de Páginas Web': 'AGENT_APPS',
    'Agente de Navegação Web': 'AGENT_APPS',
    'Conversão de Sites para Dados LLM': 'EXECUTABLE_SKILLS',
    'Parse de Documentos': 'EXECUTABLE_SKILLS',
    'Conversão de Documentos': 'EXECUTABLE_SKILLS',
    'NLP Industrial': 'EXECUTABLE_SKILLS',
    'Front-end para Agentes': 'SYNTHETIC_INFRASTRUCTURE',
    'Interface para Modelos de ML': 'SYNTHETIC_INFRASTRUCTURE',
    'Aplicações de Dados Interativas': 'SYNTHETIC_INFRASTRUCTURE',
    'Transformação de Dados Analíticos': 'SYNTHETIC_INFRASTRUCTURE',
    'Formato de Tabela Aberto': 'SYNTHETIC_INFRASTRUCTURE',
    'Feature Store': 'SYNTHETIC_INFRASTRUCTURE',
    'Plataforma AutoML Distribuída': 'AGENT_APPS',
    'SDK de MLOps em Nuvem': 'SYNTHETIC_INFRASTRUCTURE',
    'Treinamento Distribuído': 'SYNTHETIC_INFRASTRUCTURE',
    'Computação Distribuída para IA': 'SYNTHETIC_INFRASTRUCTURE',
    'Cliente de API com capacidades de IA': 'SYNTHETIC_INFRASTRUCTURE',
    'Motor de Busca Textual': 'SYNTHETIC_INFRASTRUCTURE',
    'Motor de Busca Tipado': 'SYNTHETIC_INFRASTRUCTURE',
    'Backend como Serviço Open-Source': 'SYNTHETIC_INFRASTRUCTURE',
    'Backend para Aplicações': 'SYNTHETIC_INFRASTRUCTURE',
    'Pipelines de ML em Kubernetes': 'SYNTHETIC_INFRASTRUCTURE',
    'Orquestração de Workflows de Dados e ML': 'AGENT_APPS',
    'Modelo de Linguagem': 'KNOWLEDGE_PACKS',
    'Diagrams / Visualização': 'AGENT_APPS',
    'Diagramação para Agentes': 'AGENT_APPS',
    'Jogos para IA': 'EXECUTABLE_SKILLS',
    'Avaliação de Modelos': 'PROMPT_HARNESS',
    'Recursos Claude Code': 'AGENT_APPS',
    'Design de IA': 'AGENT_APPS',
    'Prompt Engineering': 'PROMPT_HARNESS',
    'Agente de Segurança Cibernética': 'AGENT_APPS',
    'Automação com IA (n8n)': 'AGENT_APPS',
    'Robótica e Simulação': 'AGENT_APPS',
    'Bioinformática': 'KNOWLEDGE_PACKS',
    'Identidade para Agentes': 'SYNTHETIC_INFRASTRUCTURE',
    'Contêineres e Segurança': 'SYNTHETIC_INFRASTRUCTURE',
    'Manipulação de Vídeo e Imagem': 'EXECUTABLE_SKILLS',
    'Finanças Quantitativas': 'AGENT_APPS',
    'Saúde Digital': 'KNOWLEDGE_PACKS',
    'Veículos Autônomos': 'AGENT_APPS',
    'Arte Generativa': 'EXECUTABLE_SKILLS',
    'Pentest / Red Team': 'AGENT_APPS',
    'Gêmeos Digitais': 'AGENT_APPS',
}

SEGMENT_ICONS = {
    'AGENT_APPS': '🤖', 'EXECUTABLE_SKILLS': '⚙️', 'KNOWLEDGE_PACKS': '📚',
    'SYNTHETIC_INFRASTRUCTURE': '🏗️', 'PROMPT_HARNESS': '🧠', 'IN_APP_PRODUCTS': '💎',
}

SEGMENT_DISPLAY = {
    'AGENT_APPS': 'Agent Apps & Suítes', 'EXECUTABLE_SKILLS': 'Algoritmos & Skills WASM',
    'KNOWLEDGE_PACKS': 'Conhecimento Cognitivo & RAG', 'SYNTHETIC_INFRASTRUCTURE': 'Infraestrutura Sintética',
    'PROMPT_HARNESS': 'Harnesses de Prompt', 'IN_APP_PRODUCTS': 'Produtos Digitais A2A',
}


def normalize_name(name: str) -> str:
    return re.sub(r'[^a-z0-9]', '', name.lower())


def slugify(text: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')[:80]


def clean_name(raw: str) -> str:
    """Remove parenthetical comments, clean up product name"""
    name = re.sub(r'\s*\(.*?\)\s*$', '', raw).strip()
    name = re.sub(r'\s*–.*$', '', name).strip()
    name = re.sub(r'\s*\[.*?\]\s*$', '', name).strip()
    name = re.sub(r'\s{2,}', ' ', name)
    return name.strip()


def main():
    with open(PROMPT_FILE, 'r', encoding='utf-8-sig') as f:
        lines = f.readlines()

    # Extract ALL lines with 4+ tab-separated fields in the product range
    products_raw = []
    for i, line in enumerate(lines):
        line_num = i + 1
        if line_num < 9892 or line_num > 10600:
            continue
        
        stripped = line.rstrip()
        parts = stripped.split('\t')
        if len(parts) < 4:
            continue
        
        repo = parts[0].strip()
        # Must contain a slash (org/repo pattern)
        if '/' not in repo:
            continue
        # Skip non-product lines
        if repo.startswith('(') or repo.startswith('Search') or repo.startswith('We '):
            continue
        if 'já mencionado' in stripped.lower() or stripped.startswith('–'):
            continue
        if len(repo) < 3:
            continue
        
        segment_raw = parts[1].strip()
        core_business = parts[2].strip()
        publico = parts[3].strip()
        availability = parts[4].strip() if len(parts) > 4 else 'Linux, Windows, macOS'
        
        if len(core_business) < 10 or len(publico) < 10:
            continue
        
        products_raw.append({
            'nome_raw': repo,
            'segmento_raw': segment_raw,
            'coreBusiness': core_business,
            'publicoAlvoAI': publico,
            'disponibilidadeOS': availability,
        })
    
    print(f'Raw tab products extracted: {len(products_raw)}')
    
    # Process names and deduplicate
    seen = set()
    unique = []
    for p in products_raw:
        repo = p['nome_raw']
        name = repo.split('/')[-1] if '/' in repo else repo
        name = clean_name(name)
        name = re.sub(r'[^a-zA-Z0-9\s]', ' ', name)
        name = re.sub(r'\s+', ' ', name).strip().title()
        
        if not name or len(name) < 2:
            continue
        
        key = normalize_name(name)
        if key in seen:
            continue
        seen.add(key)
        
        segmento = SEGMENT_MAP.get(p['segmento_raw'], 'SYNTHETIC_INFRASTRUCTURE')
        github_url = f"https://github.com/{repo}" if '/' in repo else ''
        
        unique.append({
            'nome': name,
            'segmento': segmento,
            'coreBusiness': p['coreBusiness'],
            'publicoAlvoAI': p['publicoAlvoAI'],
            'disponibilidadeOS': p['disponibilidadeOS'],
            'repoGithubUrl': github_url,
            'source': 'tab_format_v2',
        })
    
    print(f'Unique tab products (self-deduped): {len(unique)}')
    
    # Deduplicate against DB
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('SELECT nome FROM Product')
    existing = set()
    for row in cursor.fetchall():
        existing.add(normalize_name(row[0]))
    conn.close()
    
    print(f'Existing products in DB: {len(existing)}')
    
    new_products = []
    for p in unique:
        key = normalize_name(p['nome'])
        if key not in existing:
            new_products.append(p)
            existing.add(key)
    
    print(f'\nNew unique products to add: {len(new_products)}')
    
    # Prepare for DB insertion
    import uuid as _uuid
    insert_data = []
    for p in new_products:
        pulsar = 70 + random.random() * 30
        fitness = 60 + random.random() * 40
        downloads = random.randint(100, 50000)
        rating = round(3.5 + random.random() * 1.5, 1)
        executions = random.randint(0, 100000)
        price = random.randint(5, 500)
        version = f"{random.randint(1,3)}.{random.randint(0,9)}.{random.randint(0,20)}"
        author = f"@agent-{random.randint(1,50)}"
        
        insert_data.append((
            str(_uuid.uuid4()),
            p['nome'],
            slugify(p['nome']) + f"-{1000 + len(insert_data) + 1}",
            p['segmento'],
            SEGMENT_DISPLAY.get(p['segmento'], p['segmento']),
            p['coreBusiness'],
            p['publicoAlvoAI'],
            p['disponibilidadeOS'],
            p['repoGithubUrl'],
            price,
            'tab_format',
            downloads,
            rating,
            round(pulsar, 1),
            round(fitness, 1),
            executions,
            version,
            author,
            SEGMENT_ICONS.get(p['segmento'], '📦'),
            False,
            '2026-08-03T00:00:00.000Z',
            '2026-08-03T00:00:00.000Z',
        ))
    
    # Insert into DB
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    BATCH = 100
    for i in range(0, len(insert_data), BATCH):
        batch = insert_data[i:i+BATCH]
        placeholders = ','.join(['?'] * len(batch[0]))
        cols = 'id,nome,slug,segmento,segmentoDisplay,coreBusiness,publicoAlvoAI,disponibilidadeOS,repoGithubUrl,precoSats,source,downloads,rating,pulsarEnergy,fitnessScore,a2aExecutions,version,authorAgent,iconEmoji,featured,createdAt,updatedAt'
        sql = f'INSERT INTO Product ({cols}) VALUES ({placeholders})'
        cursor.executemany(sql, batch)
        conn.commit()
        print(f'  Inserted {i + len(batch)} / {len(insert_data)}')
    
    total = cursor.execute('SELECT COUNT(*) FROM Product').fetchone()[0]
    print(f'\nTotal products in AI Store: {total}')
    conn.close()
    
    # Save JSON
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(new_products, f, ensure_ascii=False, indent=2)
    
    # Stats
    from collections import Counter
    seg_counts = Counter(p['segmento'] for p in new_products)
    print('\nDistribuição dos novos produtos:')
    for seg, count in seg_counts.most_common():
        print(f'  {SEGMENT_DISPLAY.get(seg, seg)}: {count}')
    
    print('\nAmostra dos 15 primeiros:')
    for p in new_products[:15]:
        print(f'  - {p["nome"]} | {p["segmento"]} | {p["coreBusiness"][:60]}...')


if __name__ == '__main__':
    main()