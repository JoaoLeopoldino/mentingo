# Etapa 4 — Avaliações e sincronização offline

Estado: **implementação funcional demonstrada no ambiente local; não pronta para produção**. API consolidada em `38683c60`; base `7054413a`, branch `sprint/omatapalo-resume-20261017`. Consultar os commits de UI e evidências no relatório de estado.

## Alterações efectuadas

O formando descarrega previamente um questionário nativo compatível e guarda uma submissão no dispositivo. A nota só é atribuída pelo servidor, através do motor de avaliação existente. A primeira fatia aceita escolha única com correcção automática, sem fotografias, limites de tentativas ou cooldown. Não executa SCORM offline.

- O servidor fornece perguntas e opções sem soluções, acompanhadas de um snapshot assinado para utilizador, tenant, idioma, curso e ciclo. A assinatura expira em sete dias; um HMAC separado detecta alterações à definição sem publicar a chave de respostas.
- A fila IndexedDB tem UUID imutável, payload persistente, estados pending/synced/failed, retry com espera crescente e lease de 30 segundos. O prazo HTTP é 15 segundos. Fechar a aplicação preserva a fila; a sincronização corre quando a aplicação está aberta, com ligação e sessão do mesmo utilizador.
- A avaliação reutiliza `LessonService.evaluationQuiz`, incluindo validação nativa, progresso, conclusão e outbox. O recibo fica na mesma tentativa, em quatro campos opcionais adicionados pela migration Drizzle `0222_offline_assessment_receipts.sql`. Não existe outro motor LMS.
- O bloqueio da inscrição serializa avaliação/renovação e retries. Um índice único por tenant, formando e UUID impede duplicação. Repetir UUID e payload devolve o recibo original; alterar o payload devolve conflito. Datas do dispositivo são informativas e ficam separadas da data de submissão do servidor.
- Conteúdo ou ciclo alterado, sessão diferente, expiração e respostas inválidas são recusados. Logout limpa conteúdos e operações privadas. Uma resposta tardia não recria dados apagados.
- A página de descargas apresenta avaliação, estado e nota do servidor. O progresso normal é invalidado após sincronização. A consulta de conteúdos deixou de reler os bytes PDF a cada cinco segundos; usa invalidação e temporizador de expiração.

## Evidências e testes

| Verificação | Resultado actual |
|---|---|
| Assinatura: roundtrip, adulteração, expiração/rotação e formato/chave | 4 testes unitários passaram na implementação inicial |
| API com PostgreSQL e proxy real de tenant | Primeira execução: **8 passaram em 75,080 s**, incluindo rollback, concorrência e acesso de outro formando |
| Repetição alargada | 13 passaram e 3 falharam; timeout da limpeza causou corrida entre fixtures e a segunda conta de tenant não tinha settings. Não contar como sucesso |
| Suite offline separada com RLS | **9 passaram em 312,853 s**, incluindo recusa de outro tenant com papel RLS e rollback; fixtures com settings explícitos por tenant |
| IndexedDB real da biblioteca com fake-indexeddb | **6 passaram**, incluindo reabertura, confirmação perdida, lease interrompido, conflito, logout e recibo incorrecto |
| Catálogos/Intl/fallback | **10 passaram**, 900,623 ms; pt-AO 2.050/6.027 chaves, 34,01%, 3.977 em fallback inglês |
| Typecheck web | **Passou na versão final**, incluindo o contrato gerado e as alterações de UI |
| Build API | Passou; migration aplicada apenas às duas bases locais do sprint |
| Navegador com rede desligada | **4 checkpoints Chrome passaram, código zero**: descarga real, respostas/reabertura sem rede, reconexão/correcção e progresso nativo |

A execução inicial bloqueou porque o harness legado substituía a ligação tenant-aware por uma ligação directa: o bloqueio exterior e a avaliação nativa usavam ligações distintas. A suite específica utiliza `createE2ETest({ useDbProxy: true })`, com papel PostgreSQL sem bypass RLS. O teste de rollback força apenas a falha de persistência do recibo; os cenários de sucesso usam o motor e a base reais. A suite antiga mantém o seu harness e partilha a fixture nativa extraída para `test/helpers/native-quiz-fixture.ts`.

O Swagger nomeava componentes pelo método `sync`, colidindo com o calendário Microsoft. As novas operações têm nomes específicos; o cliente é regenerado pelo comando existente, sem edição manual.

## Reprodução segura

No worktree persistente, com os serviços locais activos:

```sh
source scripts/sprints/omatapalo/environment.sh
bash scripts/sprints/omatapalo/test-api-e2e.sh src/lesson/__tests__/offline-assessment.e2e-spec.ts
sprint_pnpm --filter web test app/modules/Offline
sprint_pnpm --filter web exec tsc --noEmit
NODE_OPTIONS=--max-old-space-size=4096 sprint_pnpm --filter web exec remix vite:build --config ../../scripts/sprints/omatapalo/vite-low-memory.config.mts
node scripts/sprints/omatapalo/verify-offline-build.mjs
# Após o build terminar com código zero, com API :3000 e preview :5173:
sprint_pnpm --filter api exec tsx --tsconfig ../web/tsconfig.json ../../scripts/sprints/omatapalo/browser-offline-assessment.mts
```

Logs e capturas ficam em `.local/sprint/`, ignorada. Nenhum dado de cliente ou serviço de produção é usado. O script de E2E recusa bases, Redis e storage fora do ambiente local conhecido.

## Limitações e trabalho restante

Uma submissão por lição/ciclo neste MVP. Não existe editor para corrigir/reabrir uma tentativa recusada: conserva-se para revisão; novas tentativas e recuperação assistida precisam de UX e política próprias. Não há coordenação entre dispositivos, sincronização com a aplicação fechada, relógio de dispositivo confiável, questionários multimédia, SCORM/xAPI offline ou validação num Android físico. A assinatura expirada exige nova descarga; uma avaliação editada exige reconciliação, sem atribuição automática de conclusão.

O armazenamento é privado ao perfil/origem e ao utilizador, mas não é um cofre cifrado contra alguém com acesso ao perfil do navegador. A limpeza de cache não remove evidências já aceites pelo servidor. A versão histórica completa de perguntas continua fora do modelo; o snapshot detecta diferenças, não arquiva semanticamente toda a autoria. Um UUID reutilizado simultaneamente em cursos diferentes ainda precisa de teste específico de colisão do índice. Não extrapolar os testes para capacidade de 500 sessões concorrentes.

Tempo: desenvolvimento iniciado no checkpoint de **17-10-2026 23:03 UTC**, com interrupção de contexto. Nesta retoma, o primeiro relógio registado é **23:52:44 UTC**. Medir o próximo checkpoint final; não atribuir a totalidade deste intervalo a programação exclusiva. As esperas por disco/Docker, builds e correcções do harness são custo real desta experiência, sem multiplicador de produtividade de IA.

Checkpoint de API: a suite separada terminou com código zero. O build web inicial falhou por heap Node de cerca de 2 GB; repete-se com limite de 8 GB apenas no comando local. Lint dos ficheiros API e web passou. O typecheck web passou antes das últimas alterações de invalidação/formatação; a prova Chrome ainda não correu.

## Checkpoint funcional — 18-10-2026 00:26 UTC

Passaram **32 testes web em 65,79 s**, os **10 testes Node**, **9 testes API em 312,853 s**, lint dos ficheiros alterados e typecheck final API/web. Os quatro testes de assinatura passaram em 6,082 s. Os tempos maiores incluem pressão de RAM/swap e I/O; não medem latência da aplicação.

O build cliente + SSR terminou com código zero, com **511 entradas de precache (14.448,84 KiB)**. O verificador confirmou **65 recursos de arranque**, documento SPA revisionado, worker PDF local e ausência de respostas API no precache. A tentativa de desactivar source maps via CLI interpretou `false` como texto e manteve 455 mapas; estes flags não devem ser usados como prova de desactivação. A configuração separada `scripts/sprints/omatapalo/vite-low-memory.config.mts` reutiliza integralmente a configuração da aplicação e fixa booleans falsos para mapas/cálculo de gzip; resolução Vite confirmada, build específico validado no checkpoint final abaixo.

O Chrome descarregou uma avaliação real em pt-AO, respondeu sem Internet, fechou e reabriu o mesmo perfil ainda desligado, recuperou a tentativa pendente, restabeleceu a ligação e recebeu nota 100% do servidor. Reenviar exactamente o mesmo payload devolveu o mesmo `attemptId` e `receivedAt`; a consulta nativa da lição confirmou `lessonCompleted=true`. Captura revista visualmente: `.local/sprint/screenshots/06-offline-assessment-synced.png`. Logs: `browser-offline-assessment-final.log` e `browser-offline-assessment.json`.

A primeira execução funcional passou os quatro checkpoints, mas terminou com erro no cleanup (`remove` em vez de `delete` na factory). Foi corrigida e repetida até código zero; o curso/categoria fictícios pendentes da primeira execução também foram removidos, após conferir identificadores no respectivo perfil e nomes fictícios na API. Nenhum sucesso HTTP foi simulado.

Tempo decorrido observado nesta retoma: **23:52:44–00:26:21 UTC, cerca de 33 min 37 s**, incluindo builds, esperas e correcções. A etapa começou antes, às 23:03; o intervalo total inclui interrupção de contexto e não representa tempo exclusivo de programação. O computador tem 8 GB de RAM: executar build, typechecks e E2E pesados em paralelo elevou swap a 8,5 GB e reduziu temporariamente o disco a cerca de 400 MB. A estratégia revista é executar verificações pesadas em sequência e limitar o heap do build a 4 GB. Não houve limpeza de dados/caches existentes.

Esta prova demonstra uma fatia vertical de avaliação nativa offline. Não certifica o produto para produção, Android físico, recertificação offline ou SCORM offline.

## Checkpoint final — build reproduzível

Commits funcionais: API **`38683c60`** e fila/UI **`276827c8`**. O build com `vite-low-memory.config.mts` terminou com código zero: cliente **1m17s**, SSR **22,90s**, **zero source maps no cliente**, **511 entradas / 14.426,34 KiB** no precache final. O verificador confirmou novamente os 65 recursos de arranque. Estes tempos são do processo observado, não uma previsão para outra máquina.

Sobre este build passaram novamente os **cinco checkpoints Chrome de texto/PDF** e os **quatro checkpoints de avaliações**, ambos com código zero, incluindo limpeza dos dados fictícios. Logs finais: `browser-offline-sprint-build.log`, `browser-assessment-sprint-build.log`, `build-offline-sprint-config.log` e `verify-offline-sprint-build.log`. Os scripts usam o tsx instalado na API e a configuração TypeScript web, conforme os comandos acima.

O teste de actualização IndexedDB v1 → v2 preservou os conteúdos previamente descarregados e criou a fila vazia. O ficheiro de storage passou **6 testes em 4,83 s**; trata-se de uma regressão nova além dos 32 testes web do conjunto anterior, totalizando **33 casos web distintos** validados nesta retoma. Não somar novamente os cinco casos de storage já incluídos nos 32. O tempo de estudo offline e a presença não são medidos por esta fila.

Referências de implementação: `apps/api/src/lesson/offline/offline-assessment.service.ts:49–128` (elegibilidade/snapshot), `:130–248` (validação/correcção/recibo); `offline-assessment.repository.ts:22–125` (transacção, contexto e persistência); `apps/web/app/modules/Offline/offline-queue.ts:11–105` (fila, lease e envio); `offline-storage.ts:18–38` (upgrade e limpeza); `apps/api/src/lesson/__tests__/offline-assessment.e2e-spec.ts:108–275` (critérios HTTP). Não inferir comportamento de produção para além destas provas locais.
