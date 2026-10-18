# Etapa 2 — SCORM e certificados

Estado: **implementação funcional de ciclos e histórico, com testes de integração; player SCORM no navegador ainda por validar**.

Base: `7a23e967`; autorização: `dc15e4f2`; branch `sprint/omatapalo-validation-20261017`. As alterações desta etapa seguem num commit próprio, identificável pelo título `fix(lms): preserve assessment evidence across renewal cycles`.

## Alterações efectuadas

Dois testes negativos reproduziram a exposição de metadados de outro formando nos endpoints de certificados. O serviço passou a verificar actor, tenant e âmbito de gestão. A matriz foi alargada ao novo endpoint de histórico: próprio, administrador do mesmo tenant e gestor do grupo gerido; restantes acessos recusados com 404.

A renovação deixou de eliminar avaliações e tentativas SCORM. Inscrições, certificados e tentativas passaram a identificar o ciclo de formação. Cada renovação avança o ciclo uma única vez e conserva IDs, respostas, resultados e estado SCORM anteriores. A nova tentativa começa no ciclo actual; um commit SCORM do ciclo anterior é recusado. Os relatórios de conformidade usam apenas o ciclo actual.

A emissão e a renovação bloqueiam a inscrição durante a transacção. Um índice único impede dois certificados activos no mesmo ciclo. O arquivo reclama os certificados efectivamente activos antes de repor progresso, evitando renovações concorrentes duplicadas. O endpoint autenticado `GET /api/certificates/history` apresenta ciclos, certificados e resultados anteriores sem devolver respostas ou suspend_data. Ainda não existe um ecrã de histórico.

Migração Drizzle gerada: `0221_outgoing_jackpot.sql`, aplicada com sucesso **apenas** às bases locais `guidebook` e `guidebook_test`. O nome automático não cumpriu a convenção de nome descritivo; não foi alterado depois de aplicada. Registos legados iniciam no ciclo 1: não se reconstrói uma cronologia inexistente. Antes de outro ambiente é obrigatório verificar certificados activos duplicados; a migração deve falhar perante duplicados, nunca apagar evidência para os contornar.

## Evidências e testes executados

| Suite | Resultado final | Duração |
|---|---|---|
| Certificados, suite completa | **41 passaram / 41** | 146,371 s |
| SCORM com RustFS/S3 real | **9 passaram, 1 excluído / 10** | 79,044 s |
| Relatórios de resultados | **4 passaram / 4** | 15,458 s |

O teste SCORM importa um ZIP sintético, valida manifest e permissões, lança a unidade, persiste score/suspend_data, retoma, conclui, emite certificado, renova, recusa a tentativa antiga e conclui um segundo ciclo com histórico preservado. Um teste separado exporta um curso nativo para ZIP SCORM 1.2, inspecciona o manifest e reimporta esse ZIP no armazenamento real. Uma sessão de formando não pode exportar.

O teste de questionário conserva IDs e respostas anteriores, abre a primeira tentativa do ciclo seguinte e consulta ambos os ciclos pela API. O teste de concorrência faz três emissões e duas renovações paralelas: um certificado, um avanço de ciclo. A matriz negativa inclui outro formando, colaborador não gerido e administrador de outro tenant.

Os PDFs são realmente gerados em Chrome, mas o teste intercepta a dependência CSS externa: não comprova fidelidade visual de produção. O perfil S3 mantém um detector MIME determinístico no teste e exclui um caso próprio do armazenamento em memória. Não comprova o classificador MIME real. Não foram demonstrados SCORM 2004, xAPI, LRS, execução SCORM offline ou player SCORM no navegador.

Logs locais ignorados: `.local/sprint/certificates-full-final.log`, `scorm-export-import-cycles.log`, `reports-current-cycle.log`, `typecheck-history-api.log`, `typecheck-web-cycles.log`. Typechecks API/web e build API passaram. Uma primeira execução dos certificados falhou em dois registos de actividade porque a shell preservava NODE_ENV=development; a repetição correcta com NODE_ENV=test passou. Não se alterou o domínio para ocultar essa falha.

## Reprodução segura

```bash
node scripts/sprints/omatapalo/prepare-storage.mjs
bash scripts/sprints/omatapalo/test-api-e2e.sh --runTestsByPath src/certificates/__tests__/certificates.controller.e2e-spec.ts
SCORM_TEST_REAL_STORAGE=true bash scripts/sprints/omatapalo/test-api-e2e.sh --runTestsByPath src/scorm/__tests__/scorm.controller.e2e-spec.ts
bash scripts/sprints/omatapalo/test-api-e2e.sh --runTestsByPath src/report/__tests__/reports-metrics.e2e-spec.ts
```

O wrapper recusa destinos diferentes de PostgreSQL 127.0.0.1:55432/guidebook_test, Redis 127.0.0.1:56379/1 e RustFS 127.0.0.1:59100/omatapalo-sprint. As suites truncam dados exclusivamente da base de teste. O armazenamento é privado e sintético.

## Limitações e trabalho restante

- Matriz de certificados de percursos de aprendizagem, partilha pública e revogação ainda não concluída; a correcção não certifica toda a plataforma.
- Histórico por curso/utilizador sem paginação; dimensionar e limitar antes de produção.
- Preservação das tentativas não representa um arquivo imutável das versões de perguntas/conteúdos. Não há migração Totara sem perdas demonstrada.
- Validar o player no navegador, Android, ZIPs independentes licenciados e falhas de rede.
- Executar ensaio da migração com duplicados legados, cópia de segurança e rollback antes de qualquer ambiente partilhado.

## Tempo efectivo

Checkpoint: 17-10-2026 17:40 UTC; início global 14:56:11 UTC. Cerca de 164 minutos decorridos no sprint, incluindo ambiente, tradução, autorizações, execução e esperas. Não existe medição exclusiva fiável de engenharia por módulo. As durações finais das três suites somam 240,873 s; as repetições intermédias consumiram tempo adicional e não são contabilizadas como novos testes.

## Actualização — player Chrome e encaminhamento SCORM

Em 18-10-2026, **4/4 checkpoints Chrome passaram**, duração do percurso **11.194 ms** (inclui preparação após criação do browser; não é tempo de implementação). Importação ZIP pela UI com TUS real 201/204 e processamento nativo, publicação pela API, iframe SCORM, gravação de checkpoint, recarregamento com `entry=resume`, ecrã inteiro e `LMSFinish` com conclusão nativa persistida. O script terminou com código zero e limpou o curso/categoria fictícios.

Pacote: `apps/web/e2e/data/scorm/files/single-scorm.zip`, sintético do upstream sob MIT. **Não é um pacote de fornecedor independente**. Actor: administrador no modo de formando nativo. Score/suspend_data e restrições de outros papéis mantêm a evidência dos testes API anteriores; não foram todos novamente demonstrados visualmente. Não há prova de SCORM 2004/xAPI/offline SCORM ou Android físico.

Foram encontrados e corrigidos dois problemas de integração do ambiente/browser: upload TUS relativo chegava ao frontend estático (404); conteúdo SCORM relativo recebia o HTML da SPA em vez do pacote. O upload resolve o endereço configurado da API e configura credenciais pelo `onBeforeRequest` do tus-js-client 4.1. O preview encaminha só GET/HEAD do conteúdo SCORM para a API, mantendo a mesma origem necessária a `window.parent.API`. Conteúdo sem autenticação devolveu **401**. Quatro testes de encaminhamento verificam API separada, instalação na mesma origem, CDN sem cookies e rejeição de protocolos não HTTP.

Falhas do guião corrigidas: expectativa 200 em commit/finish, quando o contrato actual devolve 201. A primeira proposta de opção `withCredentials` foi recusada pelo typecheck do tus-js-client 4.1; foi substituída pela configuração XHR suportada e o typecheck final passou. Não se alteraram respostas da API para satisfazer o teste.

```sh
source scripts/sprints/omatapalo/environment.sh
node scripts/sprints/omatapalo/serve-preview.mjs
# Noutro terminal, com API local activa:
sprint_pnpm --filter api exec tsx --tsconfig ../web/tsconfig.json ../../scripts/sprints/omatapalo/browser-scorm.mts
```

O gate de interoperabilidade permanece aberto: falta pacote independente e Android. A matriz completa de verificação pública/revogação e o ecrã de histórico de certificados não foram entregues nesta execução. Os 41 testes anteriores de certificados são evidência histórica; não se declara nova validação de revogação sem a executar. A preservação de tentativas continua coberta pelas regressões registadas.

## Validação empresarial — execução iniciada em 18/10/2026 16:02:49 UTC

Base preservada: `656f4a9c`. A suite de baseline passou 41/41 (163,972 s). Novos testes reproduziram certificados expirados ainda publicamente acessíveis e cache pública prolongada. A correcção impõe validade imediata na consulta pública e `Cache-Control: no-store`. A revogação formal passa a conservar motivo, responsável e data, sem eliminar resultados nem reiniciar o ciclo; uma reemissão no mesmo ciclo é recusada. A migração aditiva Drizzle `0234_certificate_revocation_decision.sql` foi gerada pelo projecto e ensaiada nas bases locais.

A regressão final de certificados passou **51/51, 278,927 s**. A primeira versão do endpoint de revogação falhou um teste entre tenants; foi acrescentado o filtro explícito de tenant, confirmado pela repetição. Os parâmetros públicos passaram a ter validação Nest anterior aos diagnósticos TypeBox, após a suite de teste devolver 500 para entradas inválidas. A aplicação local devolveu 400 na verificação HTTP directa. Não se ocultaram os testes intermédios falhados.

Pacote independente, original e sem alterações: [Rustici Golf / Basic Runtime SCORM 1.2](https://scorm.com/scorm-explained/technical-scorm/golf-examples/), ficheiro `RuntimeBasicCalls_SCORM12.zip`, SHA-256 `b778566f79d56e48fab58f3a4e1fe8c1d05f372be9db3385aa1a1896063fe02a`, 360.842 bytes. O código identifica CC BY 3.0 US; as atribuições e ligações de conteúdo por página permanecem intactas. O ZIP não é redistribuído no Git. `prepare-independent-scorm.mjs` fixa o hash e recusa alterações da origem até revisão.

Chrome: importação pela UI/TUS, publicação nativa, navegação, saída/retoma na página 3, avaliação 100, score persistido e certificado emitido automaticamente: **4 checkpoints, 9,331 s**. Segundo percurso: renovação nativa, novo ciclo completo pelo player, dois certificados/tentativas, página pública anónima no URL canónico, histórico pt-AO e revogação pela interface com 404 público imediato: **4 checkpoints, 9,976 s**. Os dois cursos/ciclos são dados fictícios; o pacote original está em inglês. O primeiro guião falhou uma expectativa do título do pacote, corrigida sem alterar o pacote. O QA detectou e corrigiu a ordem dos argumentos do formatador de datas no novo ecrã.

Reprodução: executar `prepare-independent-scorm.mjs`, depois `browser-independent-scorm.mts` e `browser-certificate-history.mts` com o mesmo comando tsx usado nos restantes guiões. Os scripts conservam a demonstração para revisão; `SPRINT_QA_CLEANUP=true` limpa apenas os recursos que o primeiro script acabou de criar. Sem esta opção, cada repetição cria recursos novos, sem sobrescrever os anteriores.

Capturas: `.local/sprint/screenshots/18-independent-scorm-resume.png`, `18-independent-scorm-complete.png`, `18-public-certificate.png`, `18-certificate-history.png`, `18-revoked-certificate-history.png`. Logs ignorados: `certificates-enterprise-final.log`, `independent-scorm-browser-final.log`, `certificate-history-browser.log`.

Limites: Android físico, SCORM 2004, xAPI/LRS e SCORM offline não demonstrados. O histórico ainda não pagina tentativas. A revogação de certificados de percursos de aprendizagem e a renovação após revogação explícita não são declaradas concluídas. O checklist permanece provisoriamente em 22/32 até fechar os critérios integrais.
