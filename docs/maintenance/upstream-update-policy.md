# Política de actualização upstream

O workflow `utu-upstream-review.yml` consulta semanalmente e por execução manual, com token apenas de leitura. Publica changelog, diff e áreas sensíveis como artefacto. Não faz checkout de código upstream para execução, não altera branches, não abre automaticamente PRs, não tem segredos de alojamento e nunca faz merge/deploy.

Procedimento para PR de integração: partir de `utu/integration` aceite, obter SHA upstream, rever alterações e dependências/licenças, fazer merge num branch `integration/upstream-<data>`, executar os testes da checklist e abrir PR em draft. A automatização de criação de PR fica deliberadamente dependente da criação/aceitação dessa linha e das permissões GitHub; nesta execução não há credencial GitHub nem push autorizado efectuado. A geração de resumos já está implementada; os jobs de regressão de integração precisam de serviços isolados e ainda não estão ligados a este workflow.

Triagem proposta: suspeita de fuga entre tenants/autenticação/ficheiros — no próprio dia útil; restantes actualizações de segurança — avaliação em 2 dias úteis; funcionalidades — janela quinzenal. São metas internas propostas, não um SLA contratado.

Antes de aprovar: testes API/RLS negativos, integridade histórica e concorrência de certificados, SCORM import/player, fila offline/recovery, competências e pt-AO; build de ambas as imagens; SBOM e vulnerabilidades; QA Chrome e ensaio restrito do SHA. Nunca usar os segredos da demo em PRs vindos de forks. Separar publicação do código, construção das imagens e autorização de release.
