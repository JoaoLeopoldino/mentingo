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
