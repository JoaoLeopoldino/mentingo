# Etapa 2 — SCORM e certificados

Estado: **correcção de autorização testada; validação SCORM e preservação de ciclos em execução**.

Base: `7a23e967`; ambiente `c6c53fc7`; localização `6a649d65`; branch `sprint/omatapalo-validation-20261017`.

## Autorização: reprodução e correcção

Dois testes negativos novos reproduziram a falha: `GET /api/certificates/all` e `GET /api/certificates/certificate`, com sessão real de um formando, devolveram **200** e metadados de outro formando. Os testes exigiam 404. A hipótese da auditoria ficou demonstrada por execução.

Os controladores passam agora o actor autenticado ao serviço. A leitura admite o próprio utilizador, um administrador com `USER_MANAGE` no mesmo tenant, ou um gestor com `MANAGED_GROUP_RESULTS_READ` para colaboradores de grupos sob sua gestão. Os dois endpoints admitem a permissão de gestor e aplicam obrigatoriamente o âmbito no serviço. A API recusa os restantes casos com 404. Não foi atribuído acesso geral a todos os detentores de `CERTIFICATE_READ`.

**Resultado final:** 12 testes de integração passaram, 25 fora do filtro, em 54,769s. Incluem os dois negativos inicialmente vermelhos, acesso permitido de administrador e gestor ao grupo gerido, recusa de colaborador não gerido, recusa entre tenants mesmo para administrador, leitura dos próprios certificados e dashboard próprio. Os testes usam sessões e PostgreSQL reais na base isolada.

Os testes de fixture tiveram duas correcções durante a implementação: as factories de cursos/categorias não aceitam tenantId, pelo que os registos sintéticos estrangeiros foram criados directamente; gestores precisavam da permissão de resultados de grupo admitida pelo controlador. Estas execuções intermédias falharam e não contam como aprovação.

Esta correcção abrange os endpoints indicados. Não constitui certificação global de segurança; endpoints de certificados de percursos de aprendizagem, PDF, partilha pública e demais papéis ainda exigem a sua própria matriz de validação.

## Histórico de formação

Confirmada no código a eliminação de `assessmentAttempts` e `scormAttempts` em `certificate.repository.ts`, no método `resetCourseProgress`. O teste upstream de reset exige actualmente zero tentativas após o reset. Este comportamento será alterado com testes de regressão que preservem IDs, respostas, estados SCORM e tentativas dos ciclos anteriores e impeçam a reutilização dessas evidências no novo ciclo.

Ainda não foi aplicada uma migração para ciclos. Não declarar renovação com histórico preservado até passar o percurso completo e as verificações de concorrência e tentativas antigas.

## SCORM

Existe uma suite `apps/api/src/scorm/__tests__/scorm.controller.e2e-spec.ts` com ZIP sintético, importação, manifest, lançamento, score, suspend_data, retoma, conclusão e permissões. A suite substitui S3 por armazenamento em memória. Executá-la valida HTTP/base de dados e regras do domínio, mas não comprova o armazenamento real ou o player no navegador. Preparar uma execução adicional com RustFS local para fechar essa diferença. Exportação SCORM deve ser validada separadamente.

## Reprodução

```bash
source scripts/sprints/omatapalo/environment.sh
set -a
source apps/api/.env
set +a
TMPDIR="$PWD/.local/tmp" sprint_pnpm --filter api exec jest --config ./test/jest-e2e.json --runInBand --runTestsByPath src/certificates/__tests__/certificates.controller.e2e-spec.ts -t 'certificate metadata authorization|GET /api/certificates/all|GET /api/certificates/certificate|GET /api/certificates/dashboard'
```

Confirmar sempre DATABASE_TEST_URL em 127.0.0.1:55432/guidebook_test antes de testes de integração. A suite pode truncar dados nessa base. Não usar URLs de outros ambientes.

## Tempo efectivo

Testes vermelhos de autorização: 20,689s. Execução final de integração: 54,769s. O intervalo de desenvolvimento incluiu correcções de fixtures, repetições, validação de localização e esperas; ainda não há tempo exclusivo fiável de engenharia para toda a etapa. O tempo global e os próximos checkpoints constam de 00-sprint-status.md. SCORM e ciclos ainda não têm medição de implementação concluída.
