# AI Store — Work Log

---

Task ID: 2
Agent: Super Z (main)
Task: Prosseguir desenvolvimento end-to-end, deploy, validar produtos

Work Log:

- Commit v0.8.1 com audit de 1504 produtos (0 issues)
- Push triggerou deploy workflow (secret recém-adicionada)
- Descoberto 500 em TODO o site (root .htaccess corrompido)
- Identificado bug: deploy workflow tinha step de .htaccess que era no-op
- Reescrito workflow 4x para corrigir .htaccess via lftp
- Descoberto que mudanças no deploy.yml NÃO triggeravam o workflow (ausente do paths filter)
- Adicionado `.github/workflows/**` ao paths filter
- Adicionado parsing robusto de credenciais (JSON + colon format)
- Adicionado step de debug FTP que lista arquivos no servidor
- Ainda 500: deploy workflow provavelmente falhando (credenciais ou FTP)
- Raiz / funciona (200, 82KB), mas /aistore/ e /api/ retornam 500

Stage Summary:

- Causa raiz do 500: .htaccess antigo com 'Options +ExecCGI' no /aistore/ (deploy nunca executou com sucesso)
- O deploy workflow NUNCA executou com sucesso anteriormente (secret inexistente)
- Workflow agora tem debug, parsing robusto, e trigger correto
- PRÓXIMO PASSO: Verificar output do workflow em GitHub Actions ou via SSH
- Verificar formato da secret CREDENCIAIS_HOSTGATOR (deve ser JSON: {"host":"...","user":"...","password":"...","port":21})
- URLs do workflow: https://github.com/Nexus-HUB57/AI_Store/actions
