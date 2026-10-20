# Demonstração restrita no Railway

Estado em 19/10/2026: **candidata local, não implantada; NO-GO para exposição externa enquanto os bloqueios da checklist não forem resolvidos**. Não é produção. O domínio pretendido é `omatapalo.uturh.ao`; ainda não existe serviço/domain Railway para o qual apontar DNS.

## Arquitectura preparada

Contexto de build: raiz inteira do monorepo. API: `api.Dockerfile` + configuração `deployment/railway/api.toml`. Web: `deployment/railway/web.Dockerfile` + `web.toml`. Na definição de cada serviço, seleccionar explicitamente o respectivo config path. Configuração conforme [Railway Config as Code](https://docs.railway.com/config-as-code/reference).

Um Nginx público serve a SPA e encaminha `/api/` (incluindo TUS e SCORM) e `/socket.io/` para a API **privada**. Preserva caminho/query/cookies; desactiva buffering de uploads e não faz cache de API. Não publicar uma segunda URL pública da API que contorne o gate. Apenas um processo/réplica da API nesta candidata: workers BullMQ, outbox e tarefas agendadas estão integrados no AppModule. Não criar outro worker idêntico nem duplicar cron. PostgreSQL 16 com pgvector, Redis e bucket S3 privado persistente; nunca usar o disco efémero para uploads permanentes.

O gate HTTP adicional requer utilizador e palavra-passe aleatória próprios, além das contas LMS individuais por convite. `noindex` não substitui o gate. `/healthz` do proxy é público e não contém dados; o endpoint nativo `/api/healthcheck` responde sobre o processo, mas usa Terminus sem indicadores de dependências: **não é prova de prontidão PostgreSQL/Redis/S3**.

## Variáveis reais da candidata

Não copiar `.env` da sprint. Os exemplos upstream contêm segredos fracos de desenvolvimento. Gerar valores no gestor de segredos, sem os colocar em Git, screenshots ou comandos registados.

| Serviço | Variáveis e valores/referências |
|---|---|
| API — modo | `NODE_ENV=production`, `DEMONSTRATION_MODE=true`, `RUN_STARTUP_MAINTENANCE=false`, `PORT=3000`, `API_BIND_HOST=::`, `CORS_ORIGIN=https://omatapalo.uturh.ao` |
| API — BD | `LMS_DATABASE_URL` para `lms_app_user` com RLS; `CONTROL_DATABASE_URL` para `utu_control`, sem DDL/ownership/superuser; endereço `${{Postgres.RAILWAY_PRIVATE_DOMAIN}}` e porta real. Não injectar `DATABASE_URL` nem `MIGRATOR_DATABASE_URL` no runtime. O token interno DB_ADMIN continua a existir para operações deliberadas de controlo; não é uma role de migração. |
| API — Redis | `REDIS_URL=${{Redis.REDIS_URL}}`; confirmar que esta referência é privada no serviço escolhido. Instância exclusiva da demo. |
| API — sessões | `JWT_SECRET`, `JWT_REFRESH_SECRET` diferentes e aleatórios (>=32 caracteres), `JWT_EXPIRATION_TIME=24h`, `MASTER_KEY` exactamente 32 bytes em Base64; `ANALYTICS_SECRET` aleatório para funcionalidade analítica aplicável. Guardar cópia cifrada do MASTER_KEY para restauro. |
| API — storage | `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, obtidos do bucket real. Sem ACL pública. Validar SDK, presigned URLs, imagens e Range contra esse fornecedor. Não assumir equivalência de todos os endpoints S3. |
| API — email | `EMAIL_ADAPTER=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_EMAIL_FROM`. SMTP real exige utilizador e palavra-passe. Para captura, usar `EMAIL_ADAPTER=mailhog` apenas com host privado localhost ou *.railway.internal; o validador recusa captura pública. Não apresentar Mailhog local como entrega real. `companyInformation.emailSenderName` altera o nome no envio com branding, mantendo o endereço autorizado. |
| API — opcionais | `GOOGLE_OAUTH_ENABLED=false`, `MICROSOFT_OAUTH_ENABLED=false`, `SLACK_OAUTH_ENABLED=false`, `WORKER_CONCURRENCY=2`. Não fornecer chaves AI, Stripe, Bunny, LiveKit, Langfuse, Sentry/PostHog enquanto não aprovados. Ausência de chaves não prova que todos os respectivos botões estão ocultos: rever UI. |
| Web — build | `VITE_APP_URL=https://omatapalo.uturh.ao`, `VITE_API_URL=https://omatapalo.uturh.ao`, `VITE_DEMONSTRATION_MODE=true`; OAuth false definido no Dockerfile. São valores públicos incorporados no bundle, nunca segredos. |
| Web — runtime | `PORT=8080`, `API_PRIVATE_HOST=${{API.RAILWAY_PRIVATE_DOMAIN}}`, `API_PRIVATE_PORT=3000`, `DEMO_GATE_USERNAME`, `DEMO_GATE_PASSWORD` aleatória >=24 caracteres. Substituir nomes API/Postgres/Redis pelos nomes reais criados. |
| Migrador dedicado | Imagem API exactamente do mesmo SHA, comando `node /app/release-migrate.mjs`, apenas `MIGRATOR_DATABASE_URL` com owner da BD exclusiva. Sem domínio nem cron. Obter sucesso antes do arranque da nova release; não usar o `db:migrate` que depende de drizzle-kit ausente no deploy prod-only. |

O validador `node deployment/railway/validate-demo-env.mjs` recusa configurações fracas/ambíguas e não imprime valores. É executado pelo entrypoint da imagem em modo demo. Não valida por si só os privilégios reais da BD, convites ou entrega SMTP.

## Migração e isolamento

As migrações upstream incluem operações privilegiadas; inspeccionar requisitos de pgvector/RLS antes de provisionar. Não executar automaticamente extensões/configuração numa BD partilhada. Preparar BD `mentingo_demo`, roles e palavras-passe únicas; aplicar migrações uma vez com o processo dedicado (advisory lock de sessão; falha bloqueia avanço). Rever/executar `runtime-grants.sql` como owner e confirmar que runtime não é proprietário de tabelas nem tem CREATE no schema.

`RUN_STARTUP_MAINTENANCE=false` também omite backfills de permissões e automações. Estes precisam de uma preparação administrativa controlada no provisionamento, com os serviços nativos existentes; ainda não há comando de release completo para esse passo. Não marcar a instalação como operacional apenas porque as migrations passaram.

Verificar com cada ligação: `SELECT current_user, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname=current_user;`; `lms_app_user` deve ter todos false; `utu_control` apenas BYPASSRLS true. Verificar owner/schema grants e executar os ensaios negativos multi-tenant numa cópia isolada equivalente. **A matriz de grants proposta ainda não foi demonstrada em Railway.**

## Provisionamento e domínio — passos restantes

1. Criar/seleccionar projecto **exclusivo Mentingo demo** em workspace autorizado. Foram encontrados Tumisa, unique-achievement e respectful-serenity; nenhum foi alterado. Não reutilizar um destes por suposição.
2. Resolver revisão/licenças, imagens e confirmação de roles no destino; snapshot de novas emissões e prova de runtime limitado já passaram localmente. Congelar SHA/imagens e configurar deployment manual; desactivar autodeploy de main/desenvolvimento.
3. Criar PG16/pgvector, Redis, bucket privado e captura SMTP; configurar referências reais e limites. Provisionar roles, migrar e inicializar apenas dados fictícios com convites. Remover contas/passwords da sprint; não restaurar a BD de laboratório directamente para a Internet.
4. Subir API privada e web com gate; verificar health, jobs, login/logout, cookies Secure/HttpOnly/SameSite, WebSocket, upload TUS, SCORM e ficheiros privados.
5. Adicionar o domínio no serviço web. **CNAME/TXT: pendentes, nenhum valor foi emitido.** Copiar exactamente os valores retornados pelo Railway para apenas `omatapalo.uturh.ao` no Cloudflare. Validar primeiro DNS/HTTPS com DNS-only; se activar proxy depois, usar TLS Full (strict) e voltar a ensaiar uploads/WS/SCORM. Não alterar outros hosts de uturh.ao.
6. Confirmar redirects/HTTPS/certificados, ausência de registo público, robots/noindex, URLs e gate em todos os caminhos; executar a checklist contra o SHA implantado. Só então autorizar os convidados.

## Operação e custos

Proposta inicial, não dimensionamento medido em Railway: API 1 réplica, web 1, PG16, Redis e storage dedicado; começar sem IA/transcoding externo. Definir alertas de custo no workspace e revisão diária durante a demo, limite acordado antes de provisionar. Orçamento autorizado pelo utilizador: **até US$50/mês para a demo**. Não alterar limites globais do workspace, que aloja outros projectos. A criação do projecto foi recusada por trial expirado; o utilizador confirmou que vai activar plano e avisar. Nenhum recurso criado. Recolher CPU/RAM/filas/PG/Redis/erros e custos reais, com retenção curta e sem tokens/PII nos logs.

Backups diários cifrados PG + objectos + chaves de encriptação em destino independente, com restauro ensaiado. RPO 24h/RTO 8h são propostas para piloto, não SLA. Ensaios locais anteriores não demonstram perda do host ou restauro no Railway. Seguir rollback e checklist para promoção.

## Evidência local adicional e orçamento

A API em `NODE_ENV=production` funcionou numa cópia PostgreSQL restaurada com ligações distintas control/app, sem DATABASE_URL/MIGRATOR_DATABASE_URL no processo. Ambas as roles não tinham superuser/CREATE DB/CREATE ROLE/CREATE schema; controlo com BYPASSRLS deliberado, aplicação sem bypass. DDL e leitura do schema Drizzle foram recusados; RLS, login, atributos Secure/HttpOnly/SameSite=Strict, PDF e competências passaram. Intervalo: 08:38:34.331–08:38:47.246 UTC (12,915 s). Cookies foram enviados manualmente pelo harness sobre HTTP local: isto **não** demonstra transporte HTTPS nem Railway. Script: `scripts/sprints/omatapalo/validate-managed-runtime.mts`, via runner tsx da API com tsconfig web.

Referência de custos consultada em 19/10: [Railway pricing](https://docs.railway.com/pricing). Modelo indicativo, sem consumo Railway medido: RAM média 2,5 GB × US$10 = US$25; CPU média agregada 0,35 vCPU × US$20 = US$7; volumes 10 GB × US$0,15 = US$1,50; egress 10 GB × US$0,05 = US$0,50. Total computacional indicativo US$34/mês, antes de storage/backup externo, impostos e particularidades do plano. Reserva de US$16; não é cotação nem garantia. Se a RAM média subir a 4 GB e CPU a 0,6 vCPU, os mesmos itens excedem US$50. Medir uso real, alertar aos US$35/45 e reduzir/desligar apenas serviços demo antes de exceder o tecto. Limites de CPU/RAM evitam escalada por serviço mas não constituem hard cap financeiro do projecto. Não activar IA paga, transcoding externo ou grande tráfego de vídeo neste orçamento.


## Estado real do projecto Railway (20/10/2026)

Projecto `utu-mentingo-demo` (5c12b153-427f-44d5-9fce-040548df71c8), ambiente `demo`. Serviços: Postgres (imagem pgvector/pgvector:pg16, volume 5 GB), Redis, Mailhog (captura privada, não é entrega real), Migrator, API, Web. Migrator, API e Web fixados ao commit 7322454c (sem autodeploy por push). Migrator: SUCCESS, 238 migrations (até 0237). Roles lms_app_user/utu_control confirmadas sem superuser/DDL/CREATE, donas de zero tabelas; RLS activa em 139 de 149 tabelas. Domínio personalizado `omatapalo.uturh.ao` (zona uturh.ao, escolha do utilizador): CNAME `omatapalo` -> `z9g50dgc.up.railway.app`; TXT `_railway-verify.omatapalo` -> `railway-verify=ae9440a19b074aee66609106cace98cc1246ec24de9a2fc24cf41b68cd260970`. DNS propagado, certificado Let's Encrypt válido, HTTP redirecciona 301 para HTTPS. De fora, sem credenciais: `/`, `/api/*` e `/socket.io/` respondem 401; só `/healthz` e `/robots.txt` 200; `X-Robots-Tag: noindex`. Storage: Cloudflare R2, bucket `kulonga` (partilhado com outro projecto: risco aberto, token com acesso ao bucket inteiro). Corrigido: o Railway não aceita `--mount=type=cache,id=pnpm`, por isso usa-se `deployment/railway/api.Dockerfile`; o `railway.toml` está obsoleto e os valores foram aplicados no serviço. Ordem de deploy: API antes do Web (o nginx resolve o upstream no arranque). Ainda não testado: login com gate, WebSocket, TUS, SCORM, PDF, email, cookies Secure, isolamento entre tenants no destino. Tenant, permissões e contas por convite ainda não criados. NO-GO para exposição externa.


## Jobs de provisionamento e verificação (20/10/2026)

Todos correm no serviço `Migrator` (mesma imagem da API, sem domínio, restart NEVER) trocando o comando de arranque; **depois de cada job o comando volta a `node /app/release-migrate.mjs`** para ninguém reexecutar por engano. Segredos só existem como variáveis Railway (geradas com `${{secret(n)}}`), nunca em Git, chat ou logs. Ordem usada: `release-migrate.mjs` -> `dist/src/seed/provision-demo.js` (tenant, roles, 4 utilizadores fictícios, branding, convite obrigatório) -> `seed-demo-content.mjs` (2 cursos pt-AO) -> `demo-learner-flow.mjs` (colaborador conclui cursos, 2 certificados) -> `demo-certificate-pdf.mjs` (PDF verificado por SHA-256). Os jobs de conteúdo e fluxo não são idempotentes: não voltar a correr no mesmo tenant.

Credenciais: administrador = variável `SEED_ADMIN_NEW_PASSWORD` do Migrator (a inicial foi substituída pelo job); gestor, chefe de operação e colaborador = `DEMO_PW_GESTOR`, `DEMO_PW_CHEFE`; o colaborador já trocou a sua para `SEED_LEARNER_NEW_PASSWORD`. Gate HTTP: utilizador `demo`, palavra-passe `DEMO_GATE_PASSWORD` do Web. Emails são capturados pelo Mailhog privado (não há entrega real nem recuperação de palavra-passe por email). Após a demo: arquivar contas, rodar/remover estas variáveis e apagar o tenant.

Achados corrigidos durante a validação no destino: cabeçalhos de login do administrador excediam o buffer do nginx (502); o proxy já não reencaminha as credenciais do gate para a API; a API exige SMTP_USER/SMTP_PASSWORD mesmo com Mailhog; a imagem não aceita `--mount=type=cache` no Railway; contas novas só usam a API depois de trocar a palavra-passe (guarda nativa, mantida).

Riscos abertos: JWT sem revogação (token continua válido até 24 h após logout; ponderar JWT_EXPIRATION_TIME menor); bucket R2 `kulonga` partilhado com outro projecto e sem prefixo (a API não suporta prefixo de chaves) — preferir bucket exclusivo; automações padrão não criadas (RUN_STARTUP_MAINTENANCE=false); "Legacy Tenant" (legacy.local) criado pelas migrações upstream, sem utilizadores; logs da API atingem o limite de 500 linhas/s no arranque.

Incidente 20/10 (corrigido): depois de reimplantar a API, o Web (nginx) continuava a encaminhar para o IP antigo da API, porque resolvia `api.railway.internal` apenas no arranque; todas as chamadas `/api` ficavam penduradas e o login mostrava um spinner infinito. O template passou a resolver em tempo de pedido (`resolver ${NGINX_LOCAL_RESOLVERS} valid=5s` + `proxy_pass` com variável); a imagem define `NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1`. Reproduzido e verificado localmente trocando o IP do upstream. Regra operacional que deixa de ser necessária mas é prudente: após reimplantar a API, confirmar `/api/healthcheck` através do Web.

Gate HTTP desligável (20/10, decisão do responsável do projecto): `DEMO_GATE_ENABLED=false` no serviço Web remove o HTTP Basic (UX pior para utilizadores de RH); o valor por omissão continua a ser gate activo. Sem gate o acesso passa a depender só de: contas criadas por convite sem registo público, troca obrigatória da palavra-passe inicial, rate limiting da API por email nas rotas de autenticação (Redis; o validador impede desligá-lo), TLS, `noindex` e URL partilhado apenas com o RH. `noindex` não é controlo de acesso. Qualquer pessoa com o URL vê a página de login e pode tentar autenticar-se; por isso as palavras-passe iniciais são aleatórias e longas e devem ser entregues por canal seguro. Reactivar o gate: `DEMO_GATE_ENABLED=true` (ou remover a variável) e `DEMO_GATE_PASSWORD` definida. Recomendação futura: Cloudflare Access (login por email) em vez de HTTP Basic.
