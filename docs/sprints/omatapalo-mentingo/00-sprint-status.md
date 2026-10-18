# Sprint de validação técnica — Utu Lab / Omatapalo

Estado: **em execução, com funcionalidades e testes reais; sem aprovação para produção**.

Base: `7a23e967d88947238386c588663140c21a284294` (v4.23.0). Branch actual: `sprint/omatapalo-resume-20261017`. Worktree persistente: `/Users/joaoleopoldino/Development/CaniveteLab/mentingo/.local/worktrees/omatapalo-20261017`. Checkout original preservado.

Início: **2026-10-17 14:56:11 UTC**. Os intervalos incluem downloads, espera por permissões e limitações de disco; actividades sobrepostas não têm tempos exclusivos inventados.

| Etapa | Estado comprovado | Próxima acção |
|---|---|---|
| 0 — ambiente | Node 22.15, pnpm 10.22, quatro serviços isolados, migrações, API e frontend activos, oito utilizadores fictícios | baseline de carga/concorrência ainda por executar |
| 1 — pt-AO | 2.050/6.027 chaves, 34,01%; 10 testes Node + 8 Vitest; persistência em dois testes de integração; selector/reload em Chrome | localização dos canais restantes e Android real |
| 2 — SCORM/certificados | ciclos e histórico preservados; **41 testes certificados + 9 SCORM/S3 + 4 relatórios passaram**; 1 caso SCORM excluído | player SCORM no navegador e revogação por validar |
| 3 — conteúdos offline | texto/PDF privado; reabertura sem rede e remoção confirmadas em Chrome, commit `7054413a` | Android físico e quotas em dispositivos modestos |
| 4 — avaliações offline | API `38683c60`: 9 testes com RLS; fila durável; 32 testes web e 4 checkpoints Chrome com API real | Android físico, conflitos assistidos e novas tentativas |
| 5 — competências | implementação ainda não iniciada | fatia vertical nativa com RBAC |
| 6 — integrações/vídeo | implementação ainda não iniciada | adapter Primavera explicitamente sintético, exportação analítica e Auto HLS |
| 7 — decisão | gates críticos ainda não demonstrados | benchmark e decisão após execução |

Commits: ambiente **`c6c53fc7`**; pt-AO **`6a649d65`**. Autorização: **`dc15e4f2`**. Ciclos/histórico: **`52ddc41a`**; conteúdos offline: **`7054413a`**; API de avaliações offline: **`38683c60`**. Não houve push, deployment ou utilização de dados/credenciais de clientes.

Os relatórios 01–08 distinguem execução, testes, bloqueios e trabalho por iniciar. Não interpretar os ficheiros de etapas futuras como funcionalidades entregues. Logs, capturas, toolchain e segredos locais ficam em `.local/` ou ficheiros ignorados.

## Retoma após reinício

O worktree temporário desapareceu; os commits até `52ddc41a` foram recuperados no branch `sprint/omatapalo-resume-20261017`, em `.local/worktrees/omatapalo-20261017` dentro do checkout original. A implementação offline não consolidada foi reconstruída e validada novamente em `7054413a`. Os quatro serviços Docker e os dados sintéticos locais sobreviveram. A API e o frontend foram reiniciados; a API actual inclui a migration offline 0222. Consultar [checkpoint de recuperação](09-recovery-checkpoint.md).

## Checkpoint recuperado — 17-10-2026 23:03 UTC

Implementação offline consolidada em **`7054413a`**, no worktree persistente. API e preview frontend operacionais. Passaram novamente 26 testes web, 10 Node, sete de integração de lições, lint, build API, typecheck/build web e **cinco checkpoints Chrome** (PDF privado, interrupção/retry, renderização, reabertura sem rede, remoção persistente). O build confirmou os 63 recursos de arranque no precache. Captura recuperada em `.local/sprint/screenshots/05-offline-text-pdf.png`. A formação offline continua limitada a leitura; avaliações e sincronização começam na etapa 4. Cobertura pt-AO actual 2.029/6.006 (33,78%).

## Checkpoint de avaliações offline

API consolidada em `38683c60`; nove testes de integração passaram, incluindo RLS entre tenants, concorrência e rollback. Seis testes da fila IndexedDB passaram. Este checkpoint antecedeu a prova Chrome concluída abaixo. O build inicial atingiu o heap Node de 2 GB; a execução final passou com limite de 4 GB. A reprodução actual está no relatório 05.

## Prova funcional — 18-10-2026 00:26 UTC

Avaliação offline demonstrada em Chrome: descarregar, responder sem rede, fechar/reabrir, sincronizar, receber nota do servidor, repetir sem duplicar recibo e confirmar conclusão nativa. Script terminou com código zero e limpeza dos dados fictícios. Passaram 32 testes web, 10 Node, 9 API/RLS, 4 unitários de assinatura, lint, typechecks finais e build cliente/SSR. Cobertura pt-AO 34,01%. Tempo desta retoma observado: 33 min 37 s, com builds/esperas incluídos. Continua por implementar a etapa 5 (competências) e a etapa 6 (integrações/vídeo); a etapa 7 mantém decisão provisória.

## Consolidação — 18-10-2026

API de avaliações em **`38683c60`**, fila/UI e demonstração em **`276827c8`**. O build exclusivo do sprint passou com heap máximo 4 GB, sem source maps de cliente: 1m17s cliente + 22,90s SSR. Os nove checkpoints Chrome (cinco conteúdos + quatro avaliações) passaram novamente sobre esse build. Upgrade IndexedDB v1→v2 preserva conteúdos; 33 casos web distintos validados (32 do conjunto e uma nova regressão de upgrade). Os typechecks finais API/web e lint passaram. Usar os comandos reproduzíveis do relatório 05. A próxima etapa de produto continua a ser competências; as etapas 5–7 não estão concluídas.
