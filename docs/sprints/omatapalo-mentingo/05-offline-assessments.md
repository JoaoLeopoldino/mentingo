# Etapa 4 — Avaliações e sincronização offline

Estado: **implementação funcional em validação; não pronta para produção**. Base `7054413a`, branch `sprint/omatapalo-resume-20261017`. As alterações desta etapa ainda aguardam consolidação; consultar o commit no relatório de estado.

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
| Typecheck web | Passou após corrigir o contrato Swagger; repetir se houver novas alterações |
| Build API | Passou; migration aplicada apenas às duas bases locais do sprint |
| Navegador com rede desligada | Script criado; ainda sem resultado de execução nesta etapa |

A execução inicial bloqueou porque o harness legado substituía a ligação tenant-aware por uma ligação directa: o bloqueio exterior e a avaliação nativa usavam ligações distintas. A suite específica utiliza `createE2ETest({ useDbProxy: true })`, com papel PostgreSQL sem bypass RLS. O teste de rollback força apenas a falha de persistência do recibo; os cenários de sucesso usam o motor e a base reais. A suite antiga mantém o seu harness e partilha a fixture nativa extraída para `test/helpers/native-quiz-fixture.ts`.

O Swagger nomeava componentes pelo método `sync`, colidindo com o calendário Microsoft. As novas operações têm nomes específicos; o cliente é regenerado pelo comando existente, sem edição manual.

## Reprodução segura

No worktree persistente, com os serviços locais activos:

```sh
source scripts/sprints/omatapalo/environment.sh
bash scripts/sprints/omatapalo/test-api-e2e.sh src/lesson/__tests__/offline-assessment.e2e-spec.ts
sprint_pnpm --filter web test app/modules/Offline
sprint_pnpm --filter web exec tsc --noEmit
NODE_OPTIONS=--max-old-space-size=8192 sprint_pnpm --filter web build
node scripts/sprints/omatapalo/verify-offline-build.mjs
# Após o build terminar com código zero, com API :3000 e preview :5173:
sprint_pnpm --filter web exec tsx ../../scripts/sprints/omatapalo/browser-offline-assessment.mts
```

Logs e capturas ficam em `.local/sprint/`, ignorada. Nenhum dado de cliente ou serviço de produção é usado. O script de E2E recusa bases, Redis e storage fora do ambiente local conhecido.

## Limitações e trabalho restante

Uma submissão por lição/ciclo neste MVP. Não existe editor para corrigir/reabrir uma tentativa recusada: conserva-se para revisão; novas tentativas e recuperação assistida precisam de UX e política próprias. Não há coordenação entre dispositivos, sincronização com a aplicação fechada, relógio de dispositivo confiável, questionários multimédia, SCORM/xAPI offline ou validação num Android físico. A assinatura expirada exige nova descarga; uma avaliação editada exige reconciliação, sem atribuição automática de conclusão.

O armazenamento é privado ao perfil/origem e ao utilizador, mas não é um cofre cifrado contra alguém com acesso ao perfil do navegador. A limpeza de cache não remove evidências já aceites pelo servidor. A versão histórica completa de perguntas continua fora do modelo; o snapshot detecta diferenças, não arquiva semanticamente toda a autoria. Um UUID reutilizado simultaneamente em cursos diferentes ainda precisa de teste específico de colisão do índice. Não extrapolar os testes para capacidade de 500 sessões concorrentes.

Tempo: desenvolvimento iniciado no checkpoint de **17-10-2026 23:03 UTC**, com interrupção de contexto. Nesta retoma, o primeiro relógio registado é **23:52:44 UTC**. Medir o próximo checkpoint final; não atribuir a totalidade deste intervalo a programação exclusiva. As esperas por disco/Docker, builds e correcções do harness são custo real desta experiência, sem multiplicador de produtividade de IA.

Checkpoint de API: a suite separada terminou com código zero. O build web inicial falhou por heap Node de cerca de 2 GB; repete-se com limite de 8 GB apenas no comando local. Lint dos ficheiros API e web passou. O typecheck web passou antes das últimas alterações de invalidação/formatação; a prova Chrome ainda não correu.
