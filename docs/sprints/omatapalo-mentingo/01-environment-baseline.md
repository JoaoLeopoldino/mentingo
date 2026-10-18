# Etapa 0 — recuperação e baseline

Estado: serviços e aplicação local operacionais; builds API e web aprovados.

Base: `7a23e967d88947238386c588663140c21a284294` (v4.23.0). Branch: `sprint/omatapalo-validation-20261017`. As alterações subsequentes pertencem a este branch; os hashes de entrega constarão do estado global.

## Recuperação e isolamento

O checkout original tinha 5.191 eliminações staged e foi preservado. Foi criado o worktree completo `/private/tmp/mentingo-omatapalo-sprint-20261017` a partir de HEAD. Não foram usados reset, clean ou restore destrutivos. Foram lidos o AGENTS raiz e os de API/web; não existia AGENTS.local.md.

O Node do sistema era 20.19.6, abaixo do manifesto. O Node 24 instalado estava inutilizável por falta de uma biblioteca dinâmica. Foi extraído Node **22.15.0 arm64** oficial para `.local/toolchain/`, sem reparar instalações globais. SHA-256 do arquivo: `92eb58f54d172ed9dee320b8450f1390db629d4262c936d5c074b25a110fed02`, comparado com SHASUMS256 oficial. Foi usado **pnpm 10.22.0** através de Corepack.

A primeira instalação esgotou o disco (ENOSPC). Foi removido apenas o node_modules incompleto criado neste worktree, com autorização, preservando o cache e todos os dados anteriores. A instalação posterior reutilizou hardlinks e terminou: 3.339 pacotes, 3m18,5s na tentativa bem-sucedida, sem executar scripts de instalação. Este tempo não inclui as tentativas anteriores nem equivale ao esforço total.

## Serviços

`scripts/sprints/omatapalo/compose.yml` define o projecto Docker exclusivo `utu-omatapalo-sprint`:

| Serviço | Endereço local | Persistência |
|---|---|---|
| PostgreSQL/pgvector 16 | 127.0.0.1:55432 | volume exclusivo sprint-db |
| Redis 7.2 | 127.0.0.1:56379 | sem dados de clientes |
| RustFS/S3 | 127.0.0.1:59100 / 59101 | volume exclusivo sprint-storage |
| Mailhog | SMTP 51025 / interface 58025 | mensagens de teste |
| API | localhost:3000 | processo local |
| Web | localhost:5173 | processo local |

Foram aplicadas as migrações à nova base `guidebook`. A carga existente do projecto criou **oito utilizadores fictícios** e cursos de exemplo. `seed-local.mjs` recusa hosts/portas/bases diferentes e bases com utilizadores; ajusta a palavra-passe aleatória da função `lms_app_user`, conservando NOSUPERUSER/NOBYPASSRLS. Não executar novamente sobre a carga existente.

`environment.sh` cria apenas ficheiros ignorados com credenciais aleatórias de desenvolvimento. OAuth externo está desactivado. Não foram configuradas chaves pagas de IA. As bases `guidebook` e `guidebook_test` estão separadas; os testes de integração usam apenas a segunda.

## Resultados observados

- Instalação pnpm concluída com `--frozen-lockfile --ignore-scripts --package-import-method=hardlink`.
- `pnpm packages:build`: passou nos cinco pacotes, incluindo runtime e gerador de exportação SCORM.
- `pnpm --filter api build`: passou.
- Migrações: passaram; avisos PostgreSQL de nomes longos e políticas inexistentes nas migrações, sem falha da execução.
- API: mensagem real `Nest application successfully started`; frontend Vite disponível. HTTP local do frontend respondeu 200.
- Login fictício, selector pt-AO e recarregamento confirmados no Chrome. A evidência de catálogo/lição está a ser reforçada; consultar o relatório de localização.
- Typecheck web passou depois da regeneração do contrato e da actualização da fixture de idiomas (101,01s na execução medida).
- Build web: a execução com heap predefinido falhou por falta de memória; com `NODE_OPTIONS=--max-old-space-size=4096` passou em **72,53s**, incluindo build SPA e service worker.

A instalação e os testes foram intercalados com a implementação pt-AO; não existe uma execução integral limpa de todas as suites sobre HEAD anterior às alterações. Estes resultados são baseline operacional do branch do sprint, não prova de ausência de defeitos no upstream.

## Bloqueios e avisos

Pouco espaço livre continua a limitar contentores, caches e builds. Não foram apagados caches ou imagens de outros projectos. Langfuse/IA sem credenciais produzem avisos e falhas de indexação semântica; a pesquisa semântica não foi validada. `--ignore-scripts` evita downloads implícitos de Chromium; usar o Chrome já instalado para os testes de PDF ou instalar a versão exigida num passo explícito. Sentry sem token não publica releases. Não houve publicação ou configuração de produção.

## Reprodução

```bash
cd /private/tmp/mentingo-omatapalo-sprint-20261017
source scripts/sprints/omatapalo/environment.sh
node --version
sprint_pnpm --version
sprint_pnpm install --frozen-lockfile --ignore-scripts --package-import-method=hardlink --store-dir "$PWD/../../pnpm-store"
sprint_pnpm packages:build
docker compose -f "$SPRINT_COMPOSE_FILE" up -d
sprint_pnpm db:migrate
# Apenas numa NOVA base vazia; o script recusa a base já populada:
node scripts/sprints/omatapalo/seed-local.mjs
sprint_pnpm --filter api build
sprint_pnpm --filter api start:prod
# Noutro terminal, carregar o mesmo environment.sh:
sprint_pnpm --filter web dev --host 127.0.0.1
```

Num novo worktree é necessário instalar primeiro Node >=22.15 e disponibilizar pnpm 10.22.0. Os ficheiros `.env`, o toolchain, caches, volumes e capturas não são versionados. Não reutilizar credenciais de outros ambientes.

## Tempo efectivo

Início global: **2026-10-17 14:56:11 UTC**. Aplicação compilada e carga fictícia confirmadas por volta das **16:13 UTC**: cerca de **77 minutos de tempo decorrido**, incluindo espera por permissões, falta de disco, downloads e implementação de localização em paralelo. Não foi medido CPU/esforço humano exclusivo por actividade; não se atribuem estes 77 minutos apenas à configuração nem se extrapola um multiplicador de produtividade.

## Retoma persistente e consumo de memória — 18-10-2026

Utilizar agora o worktree persistente `/Users/joaoleopoldino/Development/CaniveteLab/mentingo/.local/worktrees/omatapalo-20261017`, branch `sprint/omatapalo-resume-20261017`. O caminho anterior em `/private/tmp` desapareceu após reinício. O toolchain Node 22.15 foi recuperado neste worktree; as dependências estão instaladas com hardlinks para o store persistente `../../pnpm-store`, relativo a esta raiz. Não repetir a instalação no store antigo sem necessidade: o espaço em disco é limitado.

As migrations locais incluem agora a 0222; API e preview frontend foram reiniciados. Os typechecks finais API/web passaram após a sincronização offline. Em 8 GB de RAM, executar as verificações pesadas em sequência. O build default com heap Node de cerca de 2 GB falhou por memória; cliente/SSR passaram com `NODE_OPTIONS=--max-old-space-size=4096`. A configuração `scripts/sprints/omatapalo/vite-low-memory.config.mts` é exclusiva da validação local, reutiliza os plugins da aplicação e desactiva mapas/cálculo de gzip; consultar o resultado final no relatório 05. O limite de heap não corresponde a RAM efectivamente consumida pela API.

## Actualização — execução seguinte de 18-10-2026

Trabalho anterior preservado; branch `sprint/omatapalo-resume-20261017`, base desta retoma `d8acd593`. As migrações locais incluem 0223–0225 de competências. API em http://localhost:3000 e preview em http://localhost:5173. O preview agora encaminha conteúdo SCORM GET/HEAD na mesma origem, com autenticação da API e `Cache-Control: private, no-store`; não é configuração de produção. O upload TUS usa o endereço configurado da API, também quando separado do frontend.

Build web final com configuração de memória do sprint: cliente **1m08s**, SSR **53,84s**, 510 entradas de precache / 14.701,84 KiB. Há avisos existentes de source maps, chunks grandes e ausência de token Sentry; o build terminou com código zero. Typechecks API/web passaram; lint dos ficheiros alterados passou após correcção da ordem de imports. Não se executou a suite integral de lint/E2E do monorepo. Regressões funcionais e tempos constam do relatório 14.
