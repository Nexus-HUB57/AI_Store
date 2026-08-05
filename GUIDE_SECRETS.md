# Guia de Organização de Segredos (GitHub Secrets)

Para garantir que o workflow de deploy funcione corretamente com a nova estrutura organizada, você deve configurar os segredos individualmente no GitHub. Isso elimina erros de interpretação de texto e torna o processo muito mais seguro e confiável.

### Onde configurar:
No seu repositório no GitHub, vá em:
**Settings > Secrets and variables > Actions > New repository secret**

---

### Lista de Segredos Necessários:

| Nome do Segredo | Descrição | Exemplo de Valor |
| :--- | :--- | :--- |
| **FTP_HOST** | O endereço do servidor FTP da HostGator | `ftp.seusite.com.br` ou `123.456.78.90` |
| **FTP_USER** | Seu nome de usuário do FTP | `usuario@seusite.com.br` |
| **FTP_PASS** | Sua senha do FTP | `sua_senha_segura` |
| **FTP_PORT** | Porta do FTP (Opcional, padrão é 21) | `21` |
| **SESSION_SECRET** | Chave para sessões do Next.js (mínimo 16 caracteres) | `uma_chave_muito_longa_e_aleatoria` |

---

### Por que mudamos?
1. **Confiabilidade**: O GitHub Actions às vezes mascara partes dos segredos nos logs, o que quebrava o script que tentava ler tudo de uma vez. Separando-os, o sistema não se confunde.
2. **Segurança**: Você pode atualizar apenas a senha sem precisar reformatar todo o bloco de texto.
3. **Simplicidade**: O código do workflow ficou mais limpo e fácil de manter.

> **Nota**: O segredo antigo `CREDENCIAIS_HOSTGATOR` não é mais necessário e pode ser removido após configurar os novos.
