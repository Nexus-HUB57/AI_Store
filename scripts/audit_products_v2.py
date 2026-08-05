#!/usr/bin/env python3
"""Audit completo dos produtos no SQLite DB — AI Store v0.8.0"""

import sqlite3
import json
import sys

DB_PATH = "db/custom.db"
VALID_SEGMENTS = [
    "AGENT_APPS", "EXECUTABLE_SKILLS", "KNOWLEDGE_PACKS",
    "SYNTHETIC_INFRASTRUCTURE", "PROMPT_HARNESS", "IN_APP_PRODUCTS"
]
ISSUES = []

def add_issue(severity, field, pid, msg):
    ISSUES.append({"severity": severity, "field": field, "product_id": pid, "message": msg})

def main():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Total count
    c.execute("SELECT COUNT(*) FROM Product")
    total = c.fetchone()[0]
    print(f"Total de produtos no DB: {total}")
    print()
    
    # Fetch all products
    c.execute("SELECT * FROM Product")
    cols = [d[0] for d in c.description]
    products = [dict(zip(cols, row)) for row in c.fetchall()]
    
    # ---- VALIDATIONS ----
    
    # 1. Required fields
    print("=== CAMPOS OBRIGATÓRIOS ===")
    required = ["id", "nome", "slug", "segmento", "coreBusiness", "publicoAlvoAI", 
                "disponibilidadeOS", "repoGithubUrl", "precoSats", "authorAgent"]
    for f in required:
        empty = [p for p in products if not p.get(f)]
        if empty:
            print(f"  ❌ {f}: {len(empty)} vazios")
            for p in empty[:3]:
                add_issue("CRITICAL", f, p["id"], f"Campo obrigatório vazio: {f}")
        else:
            print(f"  ✅ {f}: todos preenchidos")
    
    # 2. Slug uniqueness
    print()
    print("=== UNICIDADE DE SLUGS ===")
    slugs = {}
    for p in products:
        s = p["slug"]
        if s in slugs:
            add_issue("CRITICAL", "slug", p["id"], f"Slug duplicado: {s}")
        slugs.setdefault(s, []).append(p["id"])
    dupes = {k: v for k, v in slugs.items() if len(v) > 1}
    if dupes:
        print(f"  ❌ {len(dupes)} slugs duplicados")
        for slug, ids in list(dupes.items())[:5]:
            print(f"    - {slug}: {len(ids)}x")
    else:
        print(f"  ✅ Todos os {total} slugs são únicos")
    
    # 3. Price range
    print()
    print("=== VALIDAÇÃO DE PREÇOS (2000-10000 sats) ===")
    bad_price = [p for p in products if p["precoSats"] < 2000 or p["precoSats"] > 10000]
    if bad_price:
        print(f"  ❌ {len(bad_price)} preços fora do range")
        for p in bad_price[:5]:
            add_issue("HIGH", "precoSats", p["id"], f"Preço {p['precoSats']} fora do range 2000-10000")
    else:
        print(f"  ✅ Todos preços no range")
    prices = [p["precoSats"] for p in products]
    print(f"  Min: {min(prices)} ({min(prices)/100} BAIT) | Max: {max(prices)} ({max(prices)/100} BAIT) | Média: {sum(prices)/len(prices):.0f} ({sum(prices)/len(prices)/100:.1f} BAIT)")
    
    # 4. Segments
    print()
    print("=== SEGMENTOS ===")
    invalid_segs = [p for p in products if p["segmento"] not in VALID_SEGMENTS]
    if invalid_segs:
        print(f"  ❌ {len(invalid_segs)} com segmento inválido")
        for p in invalid_segs[:5]:
            add_issue("CRITICAL", "segmento", p["id"], f"Segmento inválido: {p['segmento']}")
    else:
        print(f"  ✅ Todos segmentos válidos")
    for seg in VALID_SEGMENTS:
        cnt = len([p for p in products if p["segmento"] == seg])
        print(f"    {seg}: {cnt}")
    
    # 5. Ratings
    print()
    print("=== RATINGS (0-5) ===")
    bad_rating = [p for p in products if p["rating"] < 0 or p["rating"] > 5]
    if bad_rating:
        print(f"  ❌ {len(bad_rating)} ratings fora do range")
        for p in bad_rating[:3]:
            add_issue("MEDIUM", "rating", p["id"], f"Rating {p['rating']} fora do range 0-5")
    else:
        print(f"  ✅ Todos ratings no range 0-5")
    ratings = [p["rating"] for p in products]
    print(f"  Min: {min(ratings)} | Max: {max(ratings)} | Média: {sum(ratings)/len(ratings):.2f}")
    
    # 6. GitHub URLs
    print()
    print("=== URLs GITHUB ===")
    bad_url = [p for p in products if not p["repoGithubUrl"].startswith("http")]
    if bad_url:
        print(f"  ❌ {len(bad_url)} URLs sem http")
        for p in bad_url[:3]:
            add_issue("HIGH", "repoGithubUrl", p["id"], f"URL sem http: {p['repoGithubUrl'][:80]}")
    placeholder = [p for p in products if "placeholder" in p["repoGithubUrl"].lower() 
                   or "example" in p["repoGithubUrl"].lower()
                   or p["repoGithubUrl"] == "https://github.com/"]
    if placeholder:
        print(f"  ⚠️  {len(placeholder)} URLs placeholder/genéricas")
        for p in placeholder[:3]:
            add_issue("MEDIUM", "repoGithubUrl", p["id"], f"URL placeholder: {p['repoGithubUrl'][:80]}")
    if not bad_url and not placeholder:
        print(f"  ✅ Todas URLs parecem válidas")
    
    # 7. Descriptions (coreBusiness)
    print()
    print("=== DESCRIÇÕES (coreBusiness) ===")
    short_desc = [p for p in products if len(p["coreBusiness"]) < 20]
    if short_desc:
        print(f"  ⚠️  {len(short_desc)} descrições com < 20 chars")
        for p in short_desc[:5]:
            add_issue("LOW", "coreBusiness", p["id"], f"Descrição curta ({len(p['coreBusiness'])} chars): {p['coreBusiness'][:60]}")
    else:
        print(f"  ✅ Todas descrições têm 20+ chars")
    
    # 8. Source distribution
    print()
    print("=== SOURCES ===")
    sources = {}
    for p in products:
        s = p.get("source", "unknown") or "unknown"
        sources[s] = sources.get(s, 0) + 1
    for src, cnt in sorted(sources.items(), key=lambda x: -x[1]):
        print(f"  {src}: {cnt}")
    
    # 9. Featured
    print()
    print("=== FEATURED ===")
    featured = [p for p in products if p["featured"]]
    print(f"  Featured: {len(featured)}")
    
    # 10. Versions
    print()
    print("=== VERSÕES ===")
    no_ver = [p for p in products if not p.get("version")]
    print(f"  Sem versão: {len(no_ver)}")
    versions = {}
    for p in products:
        v = p.get("version", "") or ""
        versions[v] = versions.get(v, 0) + 1
    top_v = sorted(versions.items(), key=lambda x: -x[1])[:10]
    print(f"  Top versões: {top_v}")
    
    # 11. pulsarEnergy & fitnessScore ranges
    print()
    print("=== PULSAR ENERGY (0-100) ===")
    bad_pulsar = [p for p in products if p["pulsarEnergy"] < 0 or p["pulsarEnergy"] > 100]
    print(f"  Fora do range: {len(bad_pulsar)}")
    pe = [p["pulsarEnergy"] for p in products]
    print(f"  Min: {min(pe)} | Max: {max(pe)} | Média: {sum(pe)/len(pe):.1f}")
    
    print()
    print("=== FITNESS SCORE (0-100) ===")
    bad_fit = [p for p in products if p["fitnessScore"] < 0 or p["fitnessScore"] > 100]
    print(f"  Fora do range: {len(bad_fit)}")
    fs = [p["fitnessScore"] for p in products]
    print(f"  Min: {min(fs)} | Max: {max(fs)} | Média: {sum(fs)/len(fs):.1f}")
    
    # ---- SUMMARY ----
    print()
    print("=" * 60)
    print("RESUMO DA AUDITORIA")
    print("=" * 60)
    critical = len([i for i in ISSUES if i["severity"] == "CRITICAL"])
    high = len([i for i in ISSUES if i["severity"] == "HIGH"])
    medium = len([i for i in ISSUES if i["severity"] == "MEDIUM"])
    low = len([i for i in ISSUES if i["severity"] == "LOW"])
    
    print(f"  Total de produtos: {total}")
    print(f"  ❌ CRITICAL: {critical}")
    print(f"  ⚠️  HIGH: {high}")
    print(f"  📊 MEDIUM: {medium}")
    print(f"  💡 LOW: {low}")
    print(f"  Total de issues: {len(ISSUES)}")
    
    if critical == 0 and high == 0:
        print()
        print("  ✅ PRODUTOS 100% VALIDADOS — PRONTOS PARA DEPLOY")
    else:
        print()
        print(f"  ⚠️  Existem {critical + high} issues que precisam de correção antes do deploy")
    
    conn.close()
    
    # Save issues to JSON
    with open("scripts/audit_report.json", "w") as f:
        json.dump({"total_products": total, "issues": ISSUES, 
                    "summary": {"CRITICAL": critical, "HIGH": high, "MEDIUM": medium, "LOW": low}},
                   f, indent=2, ensure_ascii=False)
    print(f"\n  Relatório salvo: scripts/audit_report.json")

if __name__ == "__main__":
    main()
