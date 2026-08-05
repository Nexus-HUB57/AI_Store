# 🔐 Guia de Configuração de Segredos (GitHub Secrets)

Este guia detalha os segredos necessários para o funcionamento correto do pipeline de CI/CD e da aplicação **AI Store Nexus**. A transição para segredos individuais visa aumentar a confiabilidade, facilitar a manutenção e evitar erros de parsing durante o deploy.

---

## 📋 Lista de Segredos Necessários

### 🚀 Deploy (HostGator FTP)
Estes segredos são utilizados pelo GitHub Actions para enviar os arquivos compilados para o servidor.

| Nome do Segredo | Descrição | Exemplo de Valor |
| :--- | :--- | :--- |
| `FTP_HOST` | Endereço do servidor FTP | `ftp.seusite.com.br` ou IP |
| `FTP_USER` | Usuário da conta FTP | `deploy@seusite.com.br` |
| `FTP_PASS` | Senha da conta FTP | `p4ssw0rd_segura` |
| `FTP_PORT` | Porta do serviço FTP | `21` (padrão) |

### 💻 Aplicação (Runtime)
Estes segredos são injetados no ambiente de execução da aplicação no servidor.

| Nome do Segredo | Descrição | Requisito |
| :--- | :--- | :--- |
| `SESSION_SECRET` | Chave de criptografia para sessões Next.js | Mínimo 16 caracteres aleatórios |

---

## 🛠️ Como Configurar

Para adicionar ou atualizar um segredo, siga os passos abaixo:

1. Acesse o repositório no GitHub.
2. Vá em **Settings** (Configurações) na barra superior.
3. No menu lateral esquerdo, clique em **Secrets and variables** > **Actions**.
4. Clique no botão verde **New repository secret**.
5. Insira o **Name** (ex: `FTP_HOST`) e o **Value** correspondente.
6. Clique em **Add secret**.

---

## 🔄 O que mudou?

Anteriormente, utilizávamos um segredo único chamado `CREDENCIAIS_HOSTGATOR` que continha todas as informações em um bloco de texto. Mudamos para segredos individuais pelos seguintes motivos:

*   **Confiabilidade:** Evita falhas no script de parsing quando o GitHub mascara partes do texto nos logs.
*   **Granularidade:** Permite atualizar apenas a senha sem risco de corromper o formato dos outros dados.
*   **Segurança:** Segredos individuais são melhor gerenciados e auditados pelo GitHub.

> [!IMPORTANT]
> O segredo antigo `CREDENCIAIS_HOSTGATOR` deve ser removido após a configuração dos novos segredos para manter o repositório limpo.

---

## 🔐 Segurança

*   **Nunca** compartilhe seus segredos em mensagens ou arquivos de texto simples.
*   As senhas de FTP devem ter permissão restrita apenas às pastas necessárias (ex: `public_html/aistore`).
*   Recomenda-se rotacionar (trocar) as senhas periodicamente.

---
*Nexus-AI-OS - Automação e Inteligência*

---

## 🚀 Atualização do Workflow (`deploy.yml`)

Para que o GitHub Actions utilize os novos segredos individuais, o arquivo `.github/workflows/deploy.yml` deve ser atualizado. Como este arquivo gerencia permissões sensíveis, recomendamos a seguinte alteração manual na etapa de configuração de credenciais:

```yaml
      - name: Configure FTP Credentials
        run: |
          {
            echo "HOST=${{ secrets.FTP_HOST }}"
            echo "USER=${{ secrets.FTP_USER }}"
            echo "PASS=${{ secrets.FTP_PASS }}"
            echo "PORT=${{ secrets.FTP_PORT || '21' }}"
          } >> "$GITHUB_ENV"
          
          if [ -z "${{ secrets.FTP_HOST }}" ] || [ -z "${{ secrets.FTP_USER }}" ] || [ -z "${{ secrets.FTP_PASS }}" ]; then
            echo "::error::Missing FTP secrets (FTP_HOST, FTP_USER, or FTP_PASS)"
            exit 1
          fi
```

Esta alteração substitui o script Python de parsing antigo por uma solução mais simples e direta.
