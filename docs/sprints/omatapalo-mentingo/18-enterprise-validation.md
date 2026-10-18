# Validação empresarial — 18/10/2026

Estado: **CONDITIONAL GO para um piloto delimitado; NO-GO para substituir já o Totara em produção**. Continuação de `656f4a9c`, branch `feat/omatapalo-enterprise-competencies-20261018`; primeiro checkpoint desta execução `9c0a6700`. Os commits seguintes podem ser consultados com `git log --oneline 656f4a9c..HEAD`. Sem push, merge, produção, dados reais ou eliminação de trabalho anterior.

## Resultado funcional

O Chrome importou um pacote SCORM 1.2 independente, navegou no leitor, retomou o marcador e concluiu a avaliação com nota 100. A renovação abriu outro ciclo e conservou a tentativa anterior. O segundo certificado foi revogado pela interface com fundamentação; a verificação pública passou imediatamente a 404 e os dois ciclos mantiveram tentativas e notas. Existe agora um ecrã de histórico acessível pelo formando e pelos responsáveis autorizados.

Outro formando fictício concluiu a formação nativa «Segurança no Trabalho», com texto sobre Luanda, Huíla e Benguela, avaliação e emissão automática de um certificado activo. Administrador, gestor de formação, gestor operacional e formando têm sessões locais de demonstração distintas. [Percursos e capturas](19-enterprise-visual-qa.md).

O código reutiliza o motor de avaliações, cursos, certificados, autenticação, RLS, armazenamento e design system. Não acrescentou dependências, outro backend ou novas funcionalidades de competências. A UI e os dados anteriores foram preservados. O checkout original permanece em `main`, apenas com `docs/audits/` não versionado; não há eliminações de ficheiros no conjunto `656f4a9c..HEAD` desta execução.

## Matriz dos requisitos a–j

Legenda: **E** execução real local; **T** teste automatizado; **S** inspecção de código; **D** documentação externa; **B** bloqueado/não executado. Uma prova local não certifica prontidão de produção.

| Requisito | Situação demonstrada | Evidência e lacuna de aceitação |
|---|---|---|
| a — Relatórios/painéis | Nativo parcial, E/T | Relatórios filtrados e exportação nativos; três testes de autorização passaram. Extracção BI paginada e carga HTTP exercitadas. Ainda sem SLA, agendamento empresarial e validação das dimensões RH do cliente. |
| b — Competências | Implementação funcional delimitada, E/T anteriores | Frameworks/escalas, requisitos versionados, funções simultâneas, evidências/decisões/planos; relatório 16 e matriz 17. Gestor voltou a abrir a sua matriz nesta execução. Aceitação de políticas RH reais pendente. |
| c — Telemóvel offline | Parcial, E/T; Android B | Texto/PDF e escolha única nativa com fila durável; cópia anterior preservada após actualização interrompida. Android, quota real e SCORM offline não demonstrados. Gate crítico aberto. |
| d — Primavera | Adapter sintético, T/E de simulação | Três colaboradores fictícios, paginação, IDs, atribuições, reconciliação, erros e retries; `applied:false`. Sem acesso ERP, escrita no LMS ou sincronização persistente. |
| e — Power BI | Dataset manual funcional, E/T | Seis CSV autorizados e relacionados; duas paginações produziram os mesmos bytes. Sem ligação ao serviço Power BI, gateway, refresh agendado, CDC ou warehouse. |
| f — Certificados | Curso funcional; matriz global parcial, E/T | Emissão, expiração, renovação, histórico, revogação fundamentada e URL pública protegida contra cache obsoleta. Percursos de aprendizagem: acesso/expiração testados; revogação/recertificação completa ainda não entregue. |
| g — Microsoft Teams | Não demonstrado, B | Não se confunde SSO Microsoft com reuniões, calendário e presenças Teams. Acesso/consentimento Graph e contrato funcional pendentes. |
| h — LinkedIn | Verificação pública funcional; LinkedIn B | URL estável de credencial activa e metadados localizados. Não foi executada partilha/Add to Profile numa conta LinkedIn nem validada identidade do emissor no serviço. |
| i — Vídeo em rede fraca | Auto corrigido, T; desempenho B | Nove testes HLS, incluindo os cinco anteriores alinhados com a nova regra Auto. Falta medir arranque, rebuffering, resolução e bytes no leitor nativo sob throttling. |
| j — Autoria/standards/blended | Parcial, E/T | Texto, avaliação nativa e SCORM 1.2 independente executados; importação/exportação ensaiadas separadamente. SCORM 2004/xAPI/LRS/H5P offline e aceitação completa de formação presencial/blended não demonstrados. |

Referências principais: `apps/api/src/certificates/certificates.service.ts:511–550` e `certificate.repository.ts:612–700`; política partilhada `apps/api/src/common/permissions/assert-can-read-learner-certificates.ts:1–32`; `apps/api/src/learning-path/services/learning-path-certificate.service.ts:125–145`; armazenamento `apps/web/app/modules/Offline/offline-storage.ts:59–108`; adapter `apps/api/src/integration/primavera/primavera-reconciliation.ts:8–128`; dataset `apps/api/src/report/analytics-dataset.ts:1–118`. Ver os testes e guiões homónimos para afirmações de execução. As linhas são referências do código desta entrega e podem deslocar-se em merges posteriores.

## Testes e medições

| Ensaio | Resultado observado | Duração/limites |
|---|---|---|
| Certificados de curso, regressão integral | 51 passaram | 278,927 s; precede o novo teste de configuração inicial |
| SCORM/S3 | 9 passaram, 1 excluído | 52,838 s; caso excluído é específico do armazenamento em memória |
| Certificados de percursos/RLS | 8 passaram | 92,505 s; leitura indevida, tenant, expiração, imagem/partilha e parâmetros |
| Autorizações/revogação seleccionadas | 17 passaram, 39 fora do filtro | 120,942 s; não somar repetições como funcionalidades |
| SCORM independente no Chrome | 4 checkpoints | 9,331 s, importação real UI/TUS, navegação, retoma e conclusão |
| Segundo ciclo/revogação Chrome | 4 checkpoints | 9,976 s, histórico e invalidade pública após revogar |
| Conteúdos offline Chrome | 7 checkpoints positivos, 1 probe bloqueado | Interrupção real, actualização preservada, PDF, reabertura offline e remoção; quota CDP não validada |
| Web offline/idioma/HLS | 40 passaram em 7 ficheiros | 10,34 s; inclui as duas suites HLS existentes |
| Contrato Primavera + dataset | 12 passaram | 18,815 s; 7 + 5, sem serviços externos |
| Validador de traduções | 5 passaram | 109,3 ms; JSON, chaves, placeholders e markup |
| Segurança de relatórios | 3 passaram, 8 fora do filtro | 19,843 s; populações/grupos/autoria |
| Carga HTTP PostgreSQL/RLS | 1 ensaio passou | 90,956 s incluindo preparação e três perfis; detalhes abaixo |
| Quatro papéis comerciais | UI real, preparação passou | 19,832 s na preparação final, preservando os dados anteriores |
| Formando até certificado activo | 3 checkpoints | 16,651 s; nota 100 e emissão única, sem respostas API simuladas |

Os resultados finais de criação de curso/localização pública e os builds estão no registo de fecho deste relatório. Os 40 casos web não representam cobertura percentual de toda a aplicação. Android físico não foi executado. As provas anteriores de avaliação offline/401/409 mantêm a data dos relatórios 05/14; esta execução reforçou armazenamento, sem as apresentar como novas execuções.

### Carga concorrente real, sem vídeo/IA

500 colaboradores fictícios, uma competência por colaborador, 100 sessões autenticadas distintas; três voltas por sessão e pausa de 100 ms. Login nativo, PostgreSQL/RLS e Redis reais. Perfil mistura administradores, gestores de grupos e formandos; usa utilizador corrente, curso, matriz de competências e relatórios autorizados. Não são 500 sessões concorrentes.

| Sessões activas | Pedidos | Erros | Janela | p95 global | p95 competências | Pedidos/s |
|---:|---:|---:|---:|---:|---:|---:|
| 20 | 192 | 0 | 5,158 s | 916,76 ms | 455,49 ms | 37,22 |
| 50 | 486 | 0 | 11,478 s | 1.712,99 ms | 1.295,66 ms | 42,34 |
| 100 | 960 | 0 | 19,976 s | 3.616,71 ms | 3.184,90 ms | 48,06 |

O p95 do atraso do event loop foi 27,7/35,8/36,3 ms; RSS do processo cerca de 300–319 MiB, sem incluir serviços/host. Ensaio Nest/Jest em modo de testes, no mesmo Mac da base de dados, sem rate limiting de produção; não é soak, latência de browser, rede provincial nem capacidade de vídeo/IA. Não há diagnóstico SQL/pool suficiente para atribuir o p95 a uma causa específica. Próximo passo: instrumentar consultas e pool, acordar SLO e repetir sustentadamente numa infra-estrutura de piloto; não alterar índices ou limites por adivinhação.

### Backup e restauro

`backup-restore.mjs` confirmou o contentor/porta da sprint, criou um dump e uma base de restauro exclusiva, sem substituir nem eliminar bases anteriores. Em 19:26:08–19:26:26 UTC: dump 674,565 ms, restauro 12.236,177 ms. Contagens e MD5 das linhas coincidiram nas oito tabelas verificadas: 24 utilizadores, 12 cursos, 17 inscrições, 2 certificados, 90 tentativas nativas, 2 SCORM, 14 avaliações profissionais e 28 entradas do histórico de planos. Estes números antecedem a conclusão comercial posterior.

Base restaurada: `guidebook_restore_57cec973b3`. É um ensaio de base de dados no mesmo cluster/host/versão. Não incluiu object storage, arranque da aplicação sobre a cópia, cópia externa, perda do host, recuperação de segredos ou compromisso RPO/RTO. Não demonstra continuidade de negócio completa.

## Falhas encontradas e tratamento

- Leitura de certificado de percurso por outro formando do mesmo tenant devolvia metadados: corrigida pela política partilhada e testes negativos com RLS real. Outro tenant devolvia 200/null, sem os seus dados; agora 404 uniforme.
- Certificados expirados continuavam publicamente visíveis: validade consultada antes de servir página/imagem, `Cache-Control: no-store` e regressões. A URL antiga deixa de validar a credencial; cópias/imagens já descarregadas por terceiros não podem ser recolhidas.
- Revogação concorrente e autorização de curso: transacção/locks no mesmo sentido da emissão, motivo, responsável e data preservados. Não apaga tentativas nem abre novo ciclo.
- Actualização offline podia perder a cópia completa: quatro regressões reproduziram a falha; substituição agora atómica. O probe CDP de quota foi marcado **BLOCKED**, não transformado em sucesso fictício.
- Testes antigos de HLS esperavam a regra HD anterior: mantidos e actualizados para verificar a regra Auto completa; ambos os conjuntos passaram.
- Criação de curso aceitava `hasCertificate:true` mas não o persistia: teste negativo reproduziu true→false. Correcção preserva false/ausente e respeita true; a demonstração usa também a configuração nativa explícita.
- QA visual detectou data sem valor no histórico, metadados/botão público em inglês e captura prematura de relatórios ainda a carregar. Corrigidos/recapturados no fecho, sem simular resultados.
- Erros de nomes de método/ESM nos guiões e configuração incompleta das fixtures foram corrigidos no próprio guião. Não são apresentados como vulnerabilidades do produto.

## Gates críticos

| Gate | Piloto | Produção |
|---|---|---|
| Offline fiável | Chrome parcial; Android/quota bloqueados | Aberto; excluir operações sem rede até aceitação física |
| Competências | Fatia acordada demonstrada; sem novas expansões | Governação RH/aceitação e retenção a acordar |
| SCORM | 1.2 independente demonstrado online | Testar pacotes reais autorizados e parque de dispositivos; 2004/xAPI excluídos |
| Integridade histórica | Curso demonstrado em dois ciclos | Fechar percursos e renovação após revogação explícita |
| Isolamento/segurança | Testes negativos dirigidos passaram | Revisão global de ficheiros, exportações, segredos, limites e segurança ainda aberta |
| pt-AO | 100% estrutural; percursos revistos por amostra | Revisão humana e canais completos pendentes |
| ERP real | Apenas simulação claramente identificada | API/versão/mapeamento/credenciais e sincronização durável pendentes |
| Operação | Perfis HTTP e restauro DB locais | Vídeo/IA, ensaio sustentado, S3/offsite, restore integral, alertas e SLA pendentes |

## Reprodução segura

Executar na raiz do worktree isolado; os guiões E2E recusam destinos diferentes de `guidebook_test`/Redis1/armazenamento local da sprint. Não adaptar para bases desconhecidas.

```sh
source scripts/sprints/omatapalo/environment.sh
sprint_pnpm --filter api exec jest --runInBand --runTestsByPath src/integration/primavera/primavera-reconciliation.spec.ts src/report/analytics-dataset.spec.ts
sprint_pnpm --filter web test app/modules/Offline/offline-storage.test.ts app/modules/Offline/offline-session.test.ts app/modules/Offline/offline-queue.test.ts app/modules/Offline/offline-text.test.ts app/utils/language-localization.test.ts app/components/VideoPlayer/hlsQuality.test.ts app/components/VideoPlayer/__tests__/hlsQuality.test.ts
node scripts/localization/validate-pt-AO.mjs
node --test scripts/localization/translation-validation.test.mjs
NODE_OPTIONS=--max-old-space-size=4096 bash scripts/sprints/omatapalo/test-api-e2e.sh --runTestsByPath src/learning-path/__tests__/learning-path-certificates-security.e2e-spec.ts
SPRINT_LOAD_TEST=true NODE_OPTIONS=--max-old-space-size=4096 bash scripts/sprints/omatapalo/test-api-e2e.sh --runTestsByPath src/competencies/__tests__/enterprise-load.e2e-spec.ts
sprint_pnpm --filter api exec tsx --tsconfig ../web/tsconfig.json ../../scripts/sprints/omatapalo/reconcile-synthetic-primavera.mts
sprint_pnpm --filter api exec tsx --tsconfig ../web/tsconfig.json ../../scripts/sprints/omatapalo/export-power-bi.mts
node scripts/sprints/omatapalo/backup-restore.mjs
```

O guião SCORM/renovação cria novas fixtures; o de histórico pressupõe ciclo 1 recém-concluído e não deve ser repetido sobre o curso já revogado. Preparar novo curso com `browser-independent-scorm.mts` antes. Os guiões comerciais conservam dados fictícios para apresentação; consultar `.local/sprint/commercial-demo.json`. Numa preparação vazia, executar primeiro `browser-enterprise-competencies.mts` para gerar `.local/sprint/enterprise-demo.json`, depois `prepare-commercial-demo.mts`, `complete-commercial-demo.mts` e `review-commercial-demo.mts`, usando a mesma invocação tsx/tsconfig indicada acima. Credenciais de demonstração apenas locais, nunca exportar cookies/HARs/segredos.

## Esforço e trabalho restante

Relógio inicial desta execução: **18/10/2026 16:02:49 UTC**. Inclui esperas por aprovação, pausa/interrupção de sessão, builds e documentação; não equivale a horas exclusivas de engenharia. A pausa até à retoma das 19:13 está incluída no intervalo de calendário. Durações por guião acima foram medidas pelo próprio processo; não há base para atribuir horas exclusivas a cada funcionalidade nem um multiplicador de produtividade da IA.

Estimativas futuras em dias-pessoa de oito horas, para um engenheiro experiente com Codex; optimista/provável/conservadora, não cotações:

| Fatia restante | O/P/C | Condição principal |
|---|---:|---|
| Piloto online delimitado, preparação/QA/governação | 5/10/20 | Reutiliza a demo; exclui migração completa e ERP real |
| Android físico, quotas e recuperação | 1/3/6 | Dispositivos disponíveis; falhas estruturais podem alterar o intervalo |
| Vídeo sob rede limitada e ajustes | 2/5/10 | Pipeline/CDN e amostras controladas |
| Primavera real e aplicação durável | 5/12/25 | Após descoberta da API, acessos autorizados e RH; espera externa separada |
| BI de produção | 2/5/10 | Snapshot, incremental, serviço/gateway e acesso aprovados |
| Certificados de percursos/renovação de revogados | 2/4/8 | Política de recertificação acordada |
| Revisão pt-AO e canais essenciais | 2/5/10 | Revisor angolano e templates aprovados |
| Migração reconciliada de âmbito acordado | 7/15/30 | Exportações do fornecedor; não promete semântica intacta de tudo |
| Segurança/continuidade/operação | 4/10/20 | Restauro completo, segurança de ficheiros, observabilidade e SLA |

As fatias sobrepõem QA/preparação: não somar a primeira linha a todas as outras. Produção de âmbito acordado: hipótese provisória **35/70/140 dias-pessoa**, dependente do fecho dos gates; não inclui suite RH completa, xAPI/LRS, Teams integral, todos os pacotes móveis ou produção massiva de cursos. Os segundos de um guião não estimam essas tarefas. [Comparação e custos](20-options-tco-and-decision.md).

## Registo de fecho técnico

Checkpoint medido: **18/10/2026 19:53:46 UTC**, decorridos **3 h 50 min 57 s** desde 16:02:49; intervalo observado após a retoma das 19:13:28: **40 min 18 s**. Inclui esperas e sobreposições; a documentação/verificação final continua após este checkpoint. Não é uma folha de horas facturável.

- Código: `9c0a6700` (SCORM/ciclos/revogação), `33753ea0` (segurança/emissão), `ba08cc78` (actualização offline), `daacf849` (simulação Primavera), `f3e4a935` (CSV BI), `6ae6be93` (pt-AO/apresentação) e `cb975404` (carga/restauro/demo).
- Builds finais API e web terminaram com código 0. Web: cliente 1 min 55 s, SSR 42,14 s, precache final 511 entradas/14.786,47 KiB. Persistem avisos de sourcemaps/Tailwind/configuração-base e Sentry sem token; não se inventaram credenciais nem se enviou release externo.
- Typechecks API/web passaram. A repetição API com heap Node por omissão (~2 GiB) abortou por memória; repetida com `NODE_OPTIONS=--max-old-space-size=4096`, terminou com código 0. O aumento é apenas no comando local, sem mudar dependências/configuração de produção.
- Lint dirigido API terminou sem erros, com um aviso de `console` no ensaio que imprime métricas agregadas. Lint web dirigido passou após ordenar um import. Lint de todo o monorepo não foi executado nesta retoma.
- O ensaio combinado final de certificados teve **16 casos aprovados e dois falhados por timeout** (276,489 s), coincidindo com o build; não foi provada causalidade exclusiva. Oito testes de percursos/RLS passaram nesse ensaio em 46,604 s. A repetição isolada dos três testes de configuração e da página pública passou **4/4 em 27,474 s**, mantendo timeout de 30 s. Não se declarou que a suite global inteira passou novamente.
- QA final dos quatro papéis, histórico com `100 %` e página pública pt-AO: **6 checkpoints em 14,367 s**, código 0. Chrome DevTools MCP confirmou o título e «Abrir a plataforma». A captura de relatórios foi refeita com os quatro indicadores efectivamente carregados.
- Verificação final HTTP: frontend `/auth/login` 200; API `/api/auth/current-user` anónima 401, comportamento esperado. API final carregada em localhost; os workers de indexação sem serviço IA configurado continuam a registar retries, fora das provas funcionais entregues.
- Checklist conferido por script: **32 critérios, 25 demonstrados**. Comparação/TCO contam como entregável documental; não transformam alternativas não executadas em provas de runtime.

O trabalho restante é explícito nos gates e estimativas acima. Os relatórios/fixtures permitem retomar sem apagar dados: Android físico, medição HLS no leitor nativo, perfis vídeo/IA, recertificação de percursos, contrato ERP real e restauro integral são os próximos ensaios, com dependências distintas. Sem push, merge ou deployment.
