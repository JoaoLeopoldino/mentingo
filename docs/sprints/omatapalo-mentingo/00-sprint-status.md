# Sprint de validação técnica — Utu Lab / Omatapalo

Estado: **em execução, com funcionalidades e testes reais; sem aprovação para produção**.

Base: `7a23e967d88947238386c588663140c21a284294` (v4.23.0). Branch: `sprint/omatapalo-validation-20261017`. Worktree: `/private/tmp/mentingo-omatapalo-sprint-20261017`. Checkout original preservado.

Início: **2026-10-17 14:56:11 UTC**. Os intervalos incluem downloads, espera por permissões e limitações de disco; actividades sobrepostas não têm tempos exclusivos inventados.

| Etapa | Estado comprovado | Próxima acção |
|---|---|---|
| 0 — ambiente | Node 22.15, pnpm 10.22, quatro serviços isolados, migrações, API e frontend activos, oito utilizadores fictícios | baseline de carga/concorrência ainda por executar |
| 1 — pt-AO | 2.002/5.984 chaves, 33,46%; 10 testes Node + 8 Vitest; persistência em dois testes de integração; selector/reload em Chrome | localização dos canais restantes e Android real |
| 2 — SCORM/certificados | falha de autorização reproduzida e corrigida nos dois endpoints; **12 testes de integração passaram**. Eliminação de tentativas no reset confirmada no código | validar autorização, executar SCORM e preservar ciclos/histórico |
| 3 — conteúdos offline | implementação ainda não iniciada | descarga autenticada de texto/PDF após estabilização da etapa 2 |
| 4 — avaliações offline | implementação ainda não iniciada | fila durável e idempotência, dependente da etapa 3 |
| 5 — competências | implementação ainda não iniciada | fatia vertical nativa com RBAC |
| 6 — integrações/vídeo | implementação ainda não iniciada | adapter Primavera explicitamente sintético, exportação analítica e Auto HLS |
| 7 — decisão | gates críticos ainda não demonstrados | benchmark e decisão após execução |

Commits: ambiente **`c6c53fc7`**; pt-AO **`6a649d65`**. A correcção de autorização segue num commit separado. Não houve push, deployment ou utilização de dados/credenciais de clientes.

Os relatórios 01–08 distinguem execução, testes, bloqueios e trabalho por iniciar. Não interpretar os ficheiros de etapas futuras como funcionalidades entregues. Logs, capturas, toolchain e segredos locais ficam em `.local/` ou ficheiros ignorados.
