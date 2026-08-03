#!/usr/bin/env python3
"""
Extrai produtos do SEGUNDO formato (tab-separated) do Prompt AI Store.txt,
deduplica contra os 1000 existentes no banco, e gera um SQL de insert.
"""

import re
import json
import sqlite3

PROMPT_FILE = '/home/z/my-project/upload/Prompt AI Store.txt'
DB_FILE = '/home/z/my-project/db/custom.db'
OUTPUT_FILE = '/home/z/my-project/output/additional_products.json'

SEGMENT_MAP = {
    'Modelos de IA': 'KNOWLEDGE_PACKS',
    'Motor de LLM local': 'SYNTHETIC_INFRASTRUCTURE',
    'Servidor de inferência de LLM': 'SYNTHETIC_INFRASTRUCTURE',
    'Modelos de linguagem': 'KNOWLEDGE_PACKS',
    'Plataforma de chat LLM': 'AGENT_APPS',
    'Speech‑to‑Text': 'EXECUTABLE_SKILLS',
    'Síntese de Voz': 'EXECUTABLE_SKILLS',
    'Visão Computacional': 'EXECUTABLE_SKILLS',
    'Visão Computacional (YOLO)': 'EXECUTABLE_SKILLS',
    'Orquestração de Agentes': 'AGENT_APPS',
    'Multi‑agente': 'AGENT_APPS',
    'RAG e Indexação de Dados': 'KNOWLEDGE_PACKS',
    'Agente Autônomo Geral': 'AGENT_APPS',
    'Executor de Código com LLM': 'AGENT_APPS',
    'Inferência no Navegador': 'EXECUTABLE_SKILLS',
    'Interface de LLM auto‑hospedada': 'SYNTHETIC_INFRASTRUCTURE',
    'Plataforma RAG': 'KNOWLEDGE_PACKS',
    'LLM local leve': 'SYNTHETIC_INFRASTRUCTURE',
    'Compilação universal de LLM': 'SYNTHETIC_INFRASTRUCTURE',
    'Framework de Deep Learning Leve': 'SYNTHETIC_INFRASTRUCTURE',
    'Aplicação RAG multi‑LLM': 'KNOWLEDGE_PACKS',
    'Geração de Imagens': 'EXECUTABLE_SKILLS',
    'Modelo de difusão': 'KNOWLEDGE_PACKS',
    'Node‑based para difusão': 'AGENT_APPS',
    'Manipulação de vídeo': 'EXECUTABLE_SKILLS',
    'Banco de dados vetorial': 'SYNTHETIC_INFRASTRUCTURE',
    'Integração de dados (ETL)': 'SYNTHETIC_INFRASTRUCTURE',
    'Fluxo de dados': 'SYNTHETIC_INFRASTRUCTURE',
    'Pipeline de dados': 'SYNTHETIC_INFRASTRUCTURE',
    'Orquestração de workflow': 'AGENT_APPS',
    'MLOps': 'SYNTHETIC_INFRASTRUCTURE',
    'Versionamento de dados e modelos': 'SYNTHETIC_INFRASTRUCTURE',
    'Plataforma LLMOps': 'AGENT_APPS',
    'Low‑code para LLM': 'AGENT_APPS',
    'Automação de workflow': 'AGENT_APPS',
    'Automação open‑source': 'AGENT_APPS',
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
    'Agente Multi‑modelo': 'AGENT_APPS',
    'Modelo de Linguagem': 'KNOWLEDGE_PACKS',
    'Infraestrutura / Ambientes de Execução': 'SYNTHETIC_INFRASTRUCTURE',
    'Fine‑tuning & Deploy': 'SYNTHETIC_INFRASTRUCTURE',
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
    'Front‑end para Agentes': 'SYNTHETIC_INFRASTRUCTURE',
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
    'Backend como Serviço Open‑Source': 'SYNTHETIC_INFRASTRUCTURE',
    'Backend para Aplicações': 'SYNTHETIC_INFRASTRUCTURE',
    'Pipelines de ML em Kubernetes': 'SYNTHETIC_INFRASTRUCTURE',
    'Orquestração de Workflows de Dados e ML': 'AGENT_APPS',
}

SEGMENT_ICONS = {
    'AGENT_APPS': '🤖',
    'EXECUTABLE_SKILLS': '⚙️',
    'KNOWLEDGE_PACKS': '📚',
    'SYNTHETIC_INFRASTRUCTURE': '🏗️',
    'PROMPT_HARNESS': '🧠',
    'IN_APP_PRODUCTS': '💎',
}

SEGMENT_DISPLAY = {
    'AGENT_APPS': 'Agent Apps & Suítes',
    'EXECUTABLE_SKILLS': 'Algoritmos & Skills WASM',
    'KNOWLEDGE_PACKS': 'Conhecimento Cognitivo & RAG',
    'SYNTHETIC_INFRASTRUCTURE': 'Infraestrutura Sintética',
    'PROMPT_HARNESS': 'Harnesses de Prompt',
    'IN_APP_PRODUCTS': 'Produtos Digitais A2A',
}


def normalize_name(name: str) -> str:
    return re.sub(r'[^a-z0-9]', '', name.lower())


def parse_tab_products(text: str, start_line: int = 0):
    """Parse products in tab-separated format: repo\tsegment\tcore_business\tpublico\tavailability"""
    products = []
    lines = text.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Skip header lines and commentary
        if line.startswith('Nome') or line.startswith('Total:') or line.startswith('–'):
            continue
        if 'já mencionado' in line.lower():
            continue
        if '(já é' in line:
            continue
        
        # Must contain at least one tab
        parts = line.split('\t')
        if len(parts) < 4:
            continue
        
        # First part must look like a repo (org/repo or single word with /)
        repo = parts[0].strip()
        if '/' not in repo and ' ' in repo:
            continue
        
        # Skip lines that are just commentary
        if repo.startswith('(') or repo.startswith('We ') or repo.startswith('I '):
            continue
        if len(repo) < 3:
            continue
        
        segment_raw = parts[1].strip() if len(parts) > 1 else ''
        core_business = parts[2].strip() if len(parts) > 2 else ''
        publico = parts[3].strip() if len(parts) > 3 else ''
        availability = parts[4].strip() if len(parts) > 4 else ''
        
        if not core_business or not publico:
            continue
        if len(core_business) < 10:
            continue
        
        segmento = SEGMENT_MAP.get(segment_raw, 'SYNTHETIC_INFRASTRUCTURE')
        
        # Build name from repo
        name = repo.split('/')[-1] if '/' in repo else repo
        name = name.replace('-', ' ').replace('_', ' ')
        name = re.sub(r'\s+', ' ', name).strip()
        if not name:
            continue
        
        github_url = f"https://github.com/{repo}" if '/' in repo else f"https://github.com/{repo}"
        
        products.append({
            'nome': name.title(),
            'segmento': segmento,
            'coreBusiness': core_business,
            'publicoAlvoAI': publico,
            'disponibilidadeOS': availability,
            'repoGithubUrl': github_url,
            'source': 'tab_format',
        })
    
    return products


def main():
    with open(PROMPT_FILE, 'r', encoding='utf-8-sig') as f:
        lines = f.readlines()
    
    print(f'Total lines in file: {len(lines)}')
    
    # Find all tab-separated product sections (line 9892+)
    tab_sections = []
    in_tab_section = False
    current_section = []
    
    for i, line in enumerate(lines):
        # Detect start of tab-separated product list
        if i >= 9891 and ('huggingface/transformers' in line or re.match(r'^[a-zA-Z][\w.-]+/[\w.-]+\t', line)):
            in_tab_section = True
            current_section.append(line)
        elif in_tab_section:
            if line.strip() and '\t' in line:
                current_section.append(line)
            elif line.strip() == '' and current_section:
                # Empty line might end a product block, but continue collecting
                current_section.append(line)
            elif line.strip() and '\t' not in line and not line.startswith('Nome') and not line.startswith('Total'):
                # Non-tab line, could be commentary or end of section
                # Check if it looks like a new product section header
                if 'próximos 50' in line.lower() or 'aqui estão' in line.lower():
                    tab_sections.append(''.join(current_section))
                    current_section = []
                    in_tab_section = False
                elif 'Search is unavailable' in line or 'Precisamos entender' in line or line.startswith('"'):
                    # Commentary/chain-of-thought, skip
                    continue
                elif re.match(r'^[a-zA-Z][\w.-]+/[\w.-]+\t', line.strip()):
                    current_section.append(line)
                    in_tab_section = True
                else:
                    # End of tab section
                    if current_section:
                        tab_sections.append(''.join(current_section))
                        current_section = []
                    in_tab_section = False
    
    if current_section:
        tab_sections.append(''.join(current_section))
    
    print(f'Found {len(tab_sections)} tab-separated product sections')
    
    # Parse all products from tab sections
    all_tab_products = []
    for section in tab_sections:
        products = parse_tab_products(section)
        all_tab_products.extend(products)
    
    print(f'Parsed {len(all_tab_products)} products from tab format')
    
    # Deduplicate among themselves
    seen = set()
    unique_tab = []
    for p in all_tab_products:
        key = normalize_name(p['nome'])
        if key not in seen:
            seen.add(key)
            unique_tab.append(p)
    
    print(f'Unique tab products (self-deduped): {len(unique_tab)}')
    
    # Now deduplicate against existing DB products
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('SELECT nome FROM Product')
    existing_names = set()
    for row in cursor.fetchall():
        existing_names.add(normalize_name(row[0]))
    
    print(f'Existing products in DB: {len(existing_names)}')
    
    new_products = []
    for p in unique_tab:
        key = normalize_name(p['nome'])
        if key not in existing_names:
            new_products.append(p)
            existing_names.add(key)  # prevent dupes within new batch too
    
    print(f'\nNew unique products to add: {len(new_products)}')
    
    # Save to JSON
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(new_products, f, ensure_ascii=False, indent=2)
    
    # Print summary
    from collections import Counter
    seg_counts = Counter(p['segmento'] for p in new_products)
    for seg, count in seg_counts.most_common():
        print(f'  {SEGMENT_DISPLAY.get(seg, seg)}: {count}')
    
    # Print first 10 as sample
    print('\nPrimeiros 10 novos produtos:')
    for p in new_products[:10]:
        print(f'  - {p["nome"]} ({p["segmento"]})')
    
    conn.close()


if __name__ == '__main__':
    main()
