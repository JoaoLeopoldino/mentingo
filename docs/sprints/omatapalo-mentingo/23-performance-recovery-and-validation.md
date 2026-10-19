# Desempenho, recuperação e decisão operacional — 19/10/2026

Estado: provas locais reforçadas; **NO-GO para produção**, sem SLA declarado. Ver [matriz contratual e demo](22-integrated-demo-and-contract-matrix.md) e [checklist técnico original](11-sprint-progress.md). Branch `feat/omatapalo-enterprise-competencies-20261018`; base `c5e58a0f`. Os commits e o checkpoint de fecho identificam o código exacto.

## Carga HTTP: resultados reais por operação

500 colaboradores fictícios, 100 sessões autenticadas distintas disponíveis, três voltas e pausa de 100 ms. Nest/Jest com PostgreSQL/RLS e Redis reais; pool de aplicação de teste **10 conexões**. Não são 500 utilizadores simultâneos, nem ensaio de browser, gravações de avaliações, streaming ou IA. O POST de relatório é uma consulta; o GET de utilizador corrente emite actividade de login e pode preparar automações.

| Sessões | Pedidos | Erros | Pedidos/s | p50 ms | p95 ms | p99 ms | Janela s |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 20 | 192 | 0 | 63,61 | 196,85 | 640,04 | 673,01 | 3,02 |
| 50 | 486 | 0 | 71,37 | 553,20 | 834,04 | 863,92 | 6,81 |
| 100 | 960 | 0 | 77,18 | 1182,73 | 1562,91 | 1664,58 | 12,44 |

Os **1.638 pedidos** da repetição concluída não tiveram erros. A primeira execução passou a 20/50 mas terminou com timeout a 100 e no fecho da aplicação (674,31 s no conjunto); preservada em `22-http-load.log`. A referência final passou em **60,740 s**, incluindo preparação, no commit **`e0687c7056d3621a322550d2bb0dc8536f0dc06d`**, com `sourceDirtyPaths: []` e sem build concorrente. Uma repetição intermédia com build concorrente passou em 101,333 s e foi preservada em `22-http-load-with-build.json`. O guião agora guarda métricas por perfil antes do fecho e regista pedidos falhados, em vez de perder todo o relatório. Uma execução bem-sucedida posterior não apaga a falha anterior.

| Sessões | Operação/endpoint | Pedidos | Erros | p50 ms | p95 ms | p99 ms |
|---:|---|---:|---:|---:|---:|---:|
| 20 | `/api/auth/current-user` | 60 | 0 | 195,50 | 249,66 | 256,98 |
| 20 | `/api/course` | 60 | 0 | 200,34 | 661,85 | 688,63 |
| 20 | `/api/competencies/workspace` | 60 | 0 | 181,06 | 324,63 | 338,95 |
| 20 | `/api/report/query` | 12 | 0 | 231,41 | 295,75 | 295,75 |
| 50 | `/api/auth/current-user` | 150 | 0 | 662,43 | 768,19 | 792,42 |
| 50 | `/api/course` | 150 | 0 | 660,22 | 803,92 | 854,84 |
| 50 | `/api/competencies/workspace` | 150 | 0 | 397,49 | 854,93 | 950,14 |
| 50 | `/api/report/query` | 36 | 0 | 428,29 | 557,98 | 571,70 |
| 100 | `/api/auth/current-user` | 300 | 0 | 1306,25 | 1540,28 | 1549,71 |
| 100 | `/api/course` | 300 | 0 | 1369,38 | 1489,28 | 1613,93 |
| 100 | `/api/competencies/workspace` | 300 | 0 | 828,39 | 1594,84 | 1786,60 |
| 100 | `/api/report/query` | 60 | 0 | 647,60 | 913,16 | 945,22 |

São percentis por endpoint dentro de uma mistura concorrente, não quatro ensaios independentes com o mesmo throughput. O número reduzido de voltas não mede soak, fuga de memória, distribuição representativa de conteúdos ou SLO contratual.

### CPU, RAM, PostgreSQL e Redis

Mac Apple M1, **8 CPU lógicos / 8 GiB RAM**, Darwin 25.0.0 arm64, Node 22.15.0, pnpm 10.22.0. Memória livre observada no fim do ensaio ~121,27 MiB. Docker apresenta ~3,893 GiB na VM; os contentores não têm limite próprio configurado (`Memory=0`, `NanoCpus=0`), o que não lhes concede a RAM de um servidor dedicado. API normal e browser coexistiram neste Mac. A referência final foi executada sem build nem alterações de código concorrentes. A execução intermédia teve um build concorrente e é mantida como comparação limitada, não como prova de regressão ou ganho.

PostgreSQL **16.15**, pgvector/pg16, `max_connections=100`, `shared_buffers=128MB`, `work_mem=4MB`; Redis **7.2.16**. Imagens/digests efectivos e portas estão em `.local/sprint/22-container-versions.txt`; parâmetros não sensíveis em `22-postgres-settings.json`. RustFS usa a tag `latest` no laboratório: antes de produção deve ser fixada e validada uma versão/digest. Não se alteraram limites de produção.

| Sessões | CPU do processo, % de um core | Pico RSS amostrado MiB | p95 event loop ms | PostgreSQL RAM no fim | Redis RAM no fim |
|---:|---:|---:|---:|---|---|
| 20 | 101,20 | 549,14 | 27,46 | 436.2MiB | 21.81MiB |
| 50 | 94,95 | 507,94 | 27,39 | 475.1MiB | 20.02MiB |
| 100 | 96,81 | 486,22 | 31,03 | 482.8MiB | 19.96MiB |

CPU/RAM de Docker/Redis são snapshots **no fim**, não máximos durante carga; o RSS é do processo Jest/Nest, não de um build de produção dedicado. O Redis não apresentou conexões rejeitadas nem evicções; `INFO` é da instância inteira, incluindo clientes dos serviços locais, não apenas da base lógica de testes.

Amostras PostgreSQL a cada segundo identificaram consultas activas com idade superior a 100 ms: máximos observados **0/162/331 ms** para 20/50/100 (zero significa nenhuma amostra acima do limiar nessa janela, não uma consulta medida em zero ms). Foram vistas esperas `Lock/advisory`, consultas de relatórios e estados de cliente/IO. São idades de consultas ainda em execução, não durações completas nem percentis de statements. SQL foi reduzido a formas sem valores. `pg_stat_statements` não está carregado e `log_min_duration_statement=-1`; não se inventou um perfil completo de SQL ou de ocupação do pool.

O lock observado corresponde à serialização de lifecycle de automações. A origem é `automation-execution/utils/acquire-automation-lifecycle-lock.ts`; a actividade de login é publicada em `auth/auth.controller.ts`, e `outbox.constants.ts` usa intake directo em Jest. A configuração de produção usa outro percurso do outbox. Isto é uma hipótese fundamentada para perfilagem controlada, não demonstra que esse lock explica sozinho o p95.

O p95 anterior de **3,62 s a 100 sessões** não é uma capacidade garantida nem prova isolada de falta de índices. Na referência final foi **1,56 s**; a execução intermédia com build teve **2,36 s** a 100 e **2,61 s** a 50, e o primeiro ensaio falhou a 100. Existem variabilidade, memória partilhada, warm-up, pool e diferenças de percurso; não se atribui a redução a uma optimização de produto. Não se alteraram índices/pool por adivinhação. Falta ensaio sustentado, planos/durações completas de SQL e SLO acordado numa infra-estrutura de piloto.

### Vídeo e IA, separados de HTTP

Chrome nativo, perfil independente de **150 kbit/s / 400 ms**: **PASS**, arranque **3482,90 ms**, 144p, **505,851 bytes HTTP**, zero eventos de rebuffering na janela observada. Guião completo **49,53 s**. Conteúdo sintético de 48 s sem áudio, aplicação já carregada, service worker bloqueado e origem loopback. Os quatro perfis e a recuperação manual permanecem no relatório 21.

Não é carga de 20/50/100 streams, rede de operadora, CDN, arranque frio ou consumo real num Android. O precache final tem **511 entradas / 14.793,31 KiB** descomprimidos, excluídos da medição de media; a sua transferência efectiva requer outro ensaio. Serviços/credenciais externos de IA não foram disponibilizados: benchmark de IA **BLOCKED**, sem respostas ou custos simulados apresentados como reais.

## Backup/restauro e recuperação da aplicação

Último ensaio de PostgreSQL: **2026-10-19T06:08:56.054Z–2026-10-19T06:09:06.547Z**, dump **216,30 ms**, restauro **7861,75 ms**, numa base nova `guidebook_restore_23594e1b4b`. Contagens/fingerprints coincidiram em **12 tabelas**, incluindo certificados de percursos, inscrições em percursos e relações de ficheiros. Fonte preservada; não se substituiu nem eliminou qualquer base anterior.

| Tabela verificada | Registos no snapshot |
|---|---:|
| `users` | 31 |
| `courses` | 16 |
| `student_courses` | 21 |
| `certificates` | 8 |
| `assessment_attempts` | 97 |
| `scorm_attempts` | 2 |
| `competency_assessments` | 17 |
| `competency_plan_history` | 46 |
| `learning_path_certificates` | 4 |
| `student_learning_paths` | 2 |
| `resources` | 16 |
| `resource_entity` | 15 |

Object storage: **411 objectos / 9,655,551 bytes**, backup **682,74 ms**, restauro/verificação **7286,07 ms**. Destino novo e privado `omatapalo-restore-70f62119-222a-4187-947e-c44210d1584a`; todos os hashes SHA-256 e Content-Type coincidiram. Leitura anónima de amostras no original/destino recusada com 403. Não são versões/ACLs/lifecycle policies completos nem uma cópia externa.

A API real arrancou em **127.0.0.1:3001**, contra a base/bucket restaurados e **Redis2**, sem redireccionar a aplicação da demo. Última prova **10,24 s**: login por palavra-passe na própria API restaurada, utilizador corrente autorizado, PDF privado idêntico ao hash do backup, recusa anónima e por outro formando (404), **2 credenciais de percurso e snapshots iguais ao original, e certificado PDF activo regenerado. O certificado antigo arquivado foi recusado. Processo de ensaio encerrado no fim.

A primeira cópia PDF do guião usava `responseType` em vez de `format` no cliente gerado e corrompia bytes ao convertê-los em texto. O frontend já usa o formato binário correcto. O guião foi corrigido, comparado com hash de origem e repetido. O PDF final foi renderizado por Poppler e revisto visualmente, em pt-AO e legível. A tentativa de usar a credencial do primeiro ciclo depois de a renovar recebeu 404 correctamente; o guião passou a seleccionar a credencial activa e testar também essa recusa.

![Certificado recuperado, renderizado do PDF final](../../../.local/sprint/screenshots/22-restored-certificate-final.png)

Backups DB/objectos foram obtidos sequencialmente numa janela controlada e reconciliados; não são uma transacção atómica entre serviços. Permanecem no mesmo host/cluster, com as mesmas chaves locais. Não se demonstraram perda do host, recuperação externa de segredos, reconstrução de políticas S3 ou restauro de toda a infra-estrutura noutro fornecedor.

### Interrupção e segurança dirigidas

Pausa breve de **RustFS e Redis**, cada qual por cerca de 2,6 s: sondas falharam por timeout durante a pausa e recuperaram (`HTTP 200` e `PONG`) após `unpause`, executado em `finally`. Não houve eliminação de volumes/keys. PostgreSQL não foi pausado. Isto verifica disponibilidade/recuperação básica de serviços; não prova atomicidade de uploads em curso, rollback de transacções, fail-closed de toda a autenticação ou tolerância a falhas prolongadas.

RLS/permissões: 13 testes de competências, 18 de certificados de percursos e 10 SCORM passaram; recusas dirigidas por utilizador/tenant e por falta de inscrição. Ficheiro privado foi recuperado pela API e recusado a anónimo/outro formando. Não é pentest global de todos os recursos, URLs assinadas ou endpoints. Logs operacionais e decisões persistentes conservam IDs/motivos/datas; não foi implantado SIEM nem ensaiada retenção de todos os logs.

`.env` e `secrets.env` locais têm modo 0600; valores dos segredos locais não foram encontrados nos ficheiros alterados verificados. Não se imprimiram esses valores nem foram incluídos no Git. Credenciais fixas das fixtures são exclusivamente de laboratório. Não houve auditoria completa de dependências, vault/rotação, cópia externa de chaves ou declaração de conformidade legal.

### RPO/RTO propostos, ainda sem SLA

Situação efectiva: backups manuais locais e provas cronometradas; **nenhum RPO/RTO contratado ou demonstrado para desastre**. Os segundos de restauro no mesmo Mac não estimam perda do host. O snapshot final de referência tem código consolidado e métricas persistidas; continua a ser uma amostra curta.

| Âmbito proposto | RPO alvo | RTO alvo | Condições antes de aceitar |
|---|---|---|---|
| Piloto online delimitado | Até 24 h, DB e objectos | Até 8 h | Backups externos diários, cifrados e monitorizados; retenção e responsáveis; ensaio noutra máquina |
| Produção, a negociar | Até 1 h no conjunto DB/objectos | Até 4 h | WAL/PITR, versionamento/replicação S3, recuperação de segredos e infra, alertas/on-call e exercício cronometrado |

Se DB e objectos tiverem frequências diferentes, o RPO do conjunto é condicionado pela pior componente e pela coerência entre elas. Estes alvos podem alterar custo/arquitectura; não foram assumidos em contrato.

## pt-AO, dispositivo e prontidão

**6.235/6.235 chaves estruturais**, 6.178 valores diferentes do inglês e 57 invariantes, zero omissões/placeholders inválidos. Cinco testes do validador; 72 regressões web offline/vídeo/idioma; 30 testes de layout/interpolação de emails e 56 de pt-AO/segurança de emails passaram. Valores diferentes do inglês não são percentagem de revisão humana. As duas novas mensagens de recertificação foram traduzidas nos oito catálogos.

Amostra visual: perfis de administrador/gestor/formando, plano, quiz, relatórios, histórico e certificados. O título recomendado passou de UUID a texto autorizado. Corpo e datas do certificado recuperado foram revistos; metadados, templates personalizados, todas as mensagens operacionais/API e acessibilidade integral continuam a exigir revisão. Emails foram renderizados em teste, não novamente enviados e recebidos por SMTP. Revisão linguística humana: **não quantificada**.

Kit Android: `.local/sprint/android-validation-kit.zip`, gerado por `prepare-android-kit.mjs`, com guião, dez casos e template de evidências. **BLOCKED, sem dispositivo físico**; não se transformam Chrome/viewport ou o kit em aceitação móvel.

## Reprodução e artefactos

Executar apenas no worktree isolado, com ambiente da sprint. O wrapper de E2E recusa bases desconhecidas e recria `guidebook_test`. Não correr suites E2E simultaneamente sobre essa base. Os testes SCORM podem criar objectos fictícios: executar os backups depois, ou numa janela sem escrita.

```sh
source scripts/sprints/omatapalo/environment.sh
SPRINT_LOAD_TEST=true NODE_OPTIONS=--max-old-space-size=4096 bash scripts/sprints/omatapalo/test-api-e2e.sh --runTestsByPath src/competencies/__tests__/enterprise-load.e2e-spec.ts
node scripts/sprints/omatapalo/backup-restore-storage.mjs
node scripts/sprints/omatapalo/backup-restore.mjs
sprint_pnpm --filter api exec tsx --tsconfig ../web/tsconfig.json ../../scripts/sprints/omatapalo/validate-restored-application.mts
node scripts/sprints/omatapalo/prepare-android-kit.mjs
```

A aplicação normal mantém-se em localhost:5173/API3000; o ensaio de restauro usa API3001/Redis2 e termina automaticamente. `PORT`/`API_BIND_HOST` tornaram esse arranque isolado possível, preservando os valores por omissão. Nunca apontar a outras bases/buckets ou lançar duas APIs na mesma porta. Um arranque preliminar nesta execução recebeu EADDRINUSE antes da substituição controlada do processo antigo; não foi apresentado como arranque bem-sucedido.

Logs/JSON ignorados pelo Git: `enterprise-http-load.json`, `enterprise-http-load.partial.json`, `22-http-load*.log`, `22-http-load-with-build.json`, `22-postgres-settings.json`, `22-container-versions.txt`, `storage-backup-restore.json`, `backup-restore.json`, `restored-application.json`, `service-interruption.json`, `22-lifecycle-18-tests.log`, `22-scorm-regression.log`, `22-web-regressions.log`, `22-email-*.log`, `22-web-final-build.log`. Backups/manifestos com dados fictícios mantêm permissões locais; não publicar cookies ou dumps brutos.

## Tempo observado e decisão

Checkpoints de relógio: **18/10 21:11:25 UTC** (início), **21:18:49**, **19/10 02:35:19**, **02:42:38**, **05:44:37**, **06:13:22**, **06:26:48** e fecho registado abaixo. Há longas lacunas/esperas/interrupções entre checkpoints. O intervalo de calendário não é uma folha de horas exclusivas de engenharia. Tempos dos guiões acima são medidos; não se inferem dias-pessoa nem produtividade de IA dos segundos de execução.

A demonstração integrada é funcional; o piloto continua condicionado ao âmbito e autorização de utilizadores. Produção continua **NO-GO**, sobretudo por Android/quotas, conectores reais e migração, continuidade externa e segurança/revisão operacional global. Os resultados de laboratório não fecham esses gates. O [relatório 22](22-integrated-demo-and-contract-matrix.md) separa requisitos a–j e estimativas da [matriz técnica de 32 critérios](11-sprint-progress.md).

A referência final recolheu [0, 6, 12] amostras de consultas activas acima de 100 ms, respectivamente; ausência de uma amostra não prova ausência de consultas lentas entre sondas. O log `22-http-load-stable.log` terminou com código zero.

## Checkpoint medido de fecho

**19/10/2026 06:36:29 UTC**, desde 18/10/2026 21:11:25: **9 h 25 min 04 s de calendário**, com as longas lacunas explicitadas acima. Janela observada desde 05:44:37: **51 min 52 s**; também inclui ferramentas, espera, builds e documentação, sem cronometrar horas exclusivas. Os commits/documentação finais posteriores não entram neste checkpoint.

Checklist conferido por script: **32 critérios / 27 demonstrados**; os dois relatórios novos têm links locais existentes. Último código consolidado `e0687c70`, fonte limpa no benchmark. Builds API/web, typecheck web e validações dirigidas terminaram com código zero; lint sem erros e um aviso de console no benchmark. Swagger/cliente regenerados pelo comando nativo. Verificação de segredos conhecidos nos ficheiros alterados: zero correspondências. Nenhum push, merge ou deployment.

Verificação final posterior ao checkpoint: frontend **200**, API anónima **401**, credencial pública activa **200**, anterior revogada **404**; API temporária 3001 encerrada. PostgreSQL, Redis, RustFS e Mailhog estão em execução e não pausados. Checkout original continua em `main`/`7a23e967`, apenas `docs/audits/` não versionado. Sem ficheiros eliminados no diff desta entrega.
