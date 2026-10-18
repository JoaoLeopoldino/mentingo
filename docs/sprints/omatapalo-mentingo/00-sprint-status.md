# Sprint de validação técnica — Utu Lab / Omatapalo

Estado actual: **22/32 critérios = 68,75%; CONDITIONAL GO para validação, sem GO para produção**. Evolução empresarial: [16](16-enterprise-competencies.md); [paridade delimitada](17-competency-totara-parity.md). Relatório anterior: [14](14-next-execution.md); [QA anterior](15-next-visual-qa.md). Os checkpoints abaixo preservam a evolução histórica.

Base: `7a23e967d88947238386c588663140c21a284294` (v4.23.0). Branch actual: `feat/omatapalo-enterprise-competencies-20261018`, a partir de `4e187000`. Worktree persistente: `/Users/joaoleopoldino/Development/CaniveteLab/mentingo/.local/worktrees/omatapalo-20261017`. Checkout original recuperado e verificado; implementação mantida no worktree separado.

Início: **2026-10-17 14:56:11 UTC**. Os intervalos incluem downloads, espera por permissões e limitações de disco; actividades sobrepostas não têm tempos exclusivos inventados.

| Etapa                  | Estado comprovado                                                                                                      | Próxima acção                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 0 — ambiente           | Node 22.15, pnpm 10.22, quatro serviços isolados, migrações, API e frontend activos, dados exclusivamente fictícios       | baseline de carga/concorrência ainda por executar                                  |
| 1 — pt-AO              | 6.202/6.202 chaves estruturais; zero omissões; 57 invariantes; nove emails essenciais e 19 assuntos traduzidos         | localização dos canais restantes e Android real                                    |
| 2 — SCORM/certificados | ciclos e histórico preservados; **41 testes certificados + 9 SCORM/S3 + 4 relatórios passaram**; 1 caso SCORM excluído | Chrome SCORM sintético passou; pacote independente/Android e revogação por validar |
| 3 — conteúdos offline  | texto/PDF privado; reabertura sem rede e remoção confirmadas em Chrome, commit `7054413a`                              | Android físico e quotas em dispositivos modestos                                   |
| 4 — avaliações offline | API com 9 testes RLS; fila durável e recovery; 6+6 checkpoints finais Chrome de recuperação                            | Android físico; recuperação assistida 401/409 já demonstrada                       |
| 5 — competências       | Frameworks, versões, planos, decisões separadas e funções simultâneas; 21 domínio + 12 API de competências + 7 checkpoints Chrome             | governação do piloto, ciclo administrativo completo e validação de produção                                              |
| 6 — integrações/vídeo  | Auto HLS corrigido; quatro regressões passaram, banda não medida; conectores pendentes                                 | adapter Primavera explicitamente sintético, exportação analítica e Auto HLS        |
| 7 — decisão            | gates críticos ainda não demonstrados                                                                                  | benchmark e decisão após execução                                                  |

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

Checkpoint de fecho desta retoma: **18-10-2026 00:35:13 UTC**. Desde o primeiro relógio registado nesta retoma (23:52:44), decorreram **42 min 29 s**, com execução, builds, testes e esperas incluídos. Último commit funcional/validação: `ba3290a3`, após `276827c8` e `38683c60`. Working tree do sprint confirmado limpo antes deste registo; checkout original continua em `main`, com as mesmas 5.191 eliminações staged preservadas. Verificação HTTP final: frontend `/auth/login` **200**; API `/api/auth/current-user` sem autenticação **401**, conforme esperado. Espaço disponível observado: cerca de **5,3 GB**. Não houve push ou deployment.

## Recuperação e QA visual — 18-10-2026

O checkout original foi recuperado: **zero eliminações staged e zero alterações tracked**, com sete relatórios da auditoria preservados. Foram repostos 3.194 ficheiros ausentes e reparados 21 snapshots vazios. [Relatório de recuperação](10-checkout-recovery.md). O estado de 5.191 eliminações referido nos checkpoints anteriores é histórico e já foi resolvido.

Progresso verificável: **16/32 critérios = 50%**, conforme [checklist completo](11-sprint-progress.md); não significa 50% de prontidão para produção. Localização: 34,01% das chaves. Novos ensaios Chrome: **18 checkpoints passaram** (7 navegação/idioma, 6 conteúdos offline, 5 avaliações offline), mais verificação interactiva pelo Chrome DevTools MCP. [QA visual e galeria](12-visual-qa.md).

A aplicação está acessível neste computador em http://localhost:5173. Competências e integrações continuam por implementar. Decisão: CONDITIONAL GO para continuar a validação, sem GO para produção.

## Competências e recuperação offline — execução seguinte

**21/32 critérios demonstrados = 65,625%**, sem alteração do denominador. MVP de competências local funcional: API `ca797c72`, UI `067407d1`, cálculo de lacunas `848677e0`. Passaram seis testes API/RLS, oito de domínio e quatro checkpoints de interface em Chrome com Luanda, Huíla e Benguela.

A recuperação offline demonstrou 401, repetição explícita, 409, exportação/arquivo, bloqueio da cópia antiga, nova descarga e tentativa separada. As respostas novas conservam também os textos originais para revisão. **Android físico permanece pendente**; consultar [guião de execução](13-android-physical-validation.md).

O catálogo UI está estruturalmente completo: 6.099/6.099, com 6.042 valores diferentes do inglês e 57 invariantes identificados. A revisão humana e todos os canais complementares permanecem abertos. Os números de cobertura dos checkpoints anteriores são históricos; utilizar o resultado mais recente de `node scripts/localization/validate-pt-AO.mjs`. A aplicação mantém-se em http://localhost:5173 e a página de competências em http://localhost:5173/competencies. Decisão mantém-se CONDITIONAL GO para validação, sem GO para produção.

## Checkpoint de código — execução seguinte

Catálogo pt-AO completo estruturalmente `b414f7ba`; SCORM real no Chrome e encaminhamento `906c9398`; Auto HLS `30ff88f2`. Total actual: **22/32 = 68,75%**, mantendo os 32 critérios. Não se fecham Android, canais linguísticos integrais, pacote SCORM independente, revogação pública ou operação apenas por este total. Passaram 28 checkpoints Chrome, 35 testes web, 10 de validação de catálogo, 8 de domínio, 6 API/RLS de competências, 9 API/RLS offline e 254 de renderização de emails. Não se somam repetições de testes para aumentar a pontuação.

Checkpoint medido desta execução: **18-10-2026 10:23:10 UTC**; desde 03:46:27 UTC decorreram **6 h 36 min 43 s**, incluindo esperas, aprovações, builds, testes e documentação. API reiniciada para carregar os emails actualizados; competências repetidas com 5/5 checkpoints. Frontend 200 e API sem sessão 401. Checkout original em `main` sem alterações tracked/staged, mantendo `docs/audits/` não versionado. Não se trata de horas exclusivas por funcionalidade.

## Competências empresariais — checkpoint de 18/10/2026

Separação de evidência/avaliação/revogação; frameworks, escalas e requisitos versionados; planos individuais com aprovação e histórico; duas funções activas e paginação/filtros da equipa. 21 testes de domínio, 11 API/RLS e sete checkpoints Chrome para administrador, gestor e colaborador. Ensaio HTTP sequencial com 500 colaboradores: média 84,29 ms/página de 100; não é carga concorrente. Catálogo pt-AO: 6.201 chaves estruturais antes das verificações finais, 57 invariantes, sem revisão linguística humana integral. Ver resultado actual do validador e relatório 16.

O total mantém-se **22/32 = 68,75%**, pois os critérios originais de competências já estavam contados. Competências têm agora evidência reforçada; ERP, Android físico e produção continuam abertos. Nenhum push, merge ou deployment.

## Verificação final desta evolução

Três suites API: 20 passaram (12 de competências), 180 casos fora do filtro; 21 de domínio; 31 web offline/idioma/HLS; cinco testes do validador de traduções. Catálogo final: 6.202 chaves, 57 invariantes, sem erros estruturais/placeholder. A retenção de recursos ligados a planos/histórico devolve 409 e preserva o lote inteiro. Ver relatório 16 para tempos observados, comandos, falhas e limites. Os commits desta evolução são locais; não houve push/merge/deployment.

Aceitação final dos builds: 18/10/2026 15:43:08 UTC; Chrome 7/7 em 24,626 s. Benchmark HTTP final: média 87,89 ms em cinco páginas de 100 colaboradores (500 pessoas, uma competência; sequencial). Tempo de calendário desde o início desta evolução: 4 h 31 min 51 s, incluindo esperas e intervalos sem medição exclusiva de actividade; detalhes no relatório 16. Estimativa provisória para preparação governada do piloto: 24/48/96 horas de trabalho futuro, sem extrapolação automática de produtividade de IA.
