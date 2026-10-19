# Preparação da distribuição Utu Lab e demo Railway

Data: 19/10/2026. Estado: **implementação local parcial e testada; exposição externa não aprovada**. Branch de entrada `feat/omatapalo-enterprise-competencies-20261018`, commit `77f6bae8`; preparação em `feat/utu-distribution-railway-demo-20261019`. O checkout main original permaneceu em 7a23e967 com apenas docs/audits não versionado, sem eliminações. Não houve push, merge upstream, alteração DNS ou deployment.

## Alterações

- Novos campos opcionais no JSON de identidade existente, com contrato regenerado: app name, emissor, nome do remetente e metadados adicionais. Nome/logo por omissão Utu, favicon próprio, layout e PWA; cliente sem identidade Omatapalo embebida.
- Aviso de demonstração no build frontend e pelo servidor nos renders de certificados e emails. Marcação de email preserva conteúdo e anexos, e nome de remetente mantém endereço SMTP autorizado.
- Separação explícita de ligação de controlo e credenciais de migração; opção de manutenção fora do arranque. Em modo demo gerido, validador impede fallback administrativo, TEST_KEY, segredos fracos e rate limiting desactivado.
- Processo dedicado de migrations com advisory lock; proxy Nginx com gate obrigatório, API privada, same-origin API/TUS/SCORM, WS configurado e noindex. **Configuração não equivale a testes de todos estes protocolos.**
- Workflow semanal apenas de leitura para resumo upstream; documentação de integração/release/rollback. Confirmado: fork público; upstream main igual à base, 40 commits próprios à entrada. PR 2016 fechado **sem merge** — não assumir integração de uma correcção pelo título/estado.

## Evidências e testes

| Ensaio | Resultado real |
|---|---|
| Unitários API tocados | 36/36 passaram em 12,56 s; email repetido após refinamento: 10/10 em 13,021 s |
| E2E PostgreSQL/RLS local guardado | 62/62 em 300,129 s; bases desconhecidas recusadas pelo harness |
| Regressões web offline/vídeo/idioma/branding | 77/77 em 5,48 s; preview focado 2/2 depois do novo caso |
| Ambiente/syntax | 11 node:test de perfil demo + 5 testes de validação de tradução; JS/shell syntax passaram |
| Typecheck/build | API/web passaram; API tsc inicial sem heap ampliado abortou por memória, repetição com 4GB passou; imagens completas API/web não construídas |
| pt-AO | 6.236/6.236 estrutural, 6.179 diferentes de EN, 57 invariantes aceites, zero missing/placeholder errors; revisão humana não medida |
| Chrome/PDF final | `.local/sprint/24-branding-qa.json`: 07:21:17.305Z–07:21:22.710Z, 5,405 s; PDF real 122.848 bytes, forming PATCH403, aviso no login desktop/mobile; PNG do PDF inspeccionado |
| Proxy Docker | build target proxy passou; configuração ausente falha fechada; 5 caminhos anónimos 401; SPA/API autorizadas200; sourcemap404. Ensaio final 07:15:37.153Z–07:15:38.914Z, 1,761 s. Não testa TLS Railway, WS upgrade ou TUS completo |

Falhas corrigidas: harness de QA com cwd errado; dependência QueryClient no render de certificado; ficheiro htpasswd inicialmente ilegível pelo worker; Node de sistema no harness proxy terminava com await pendente, corrigido usando toolchain fixada, keepalive e timeouts. Captura móvel inicial apanhou apresentação transitória; ensaio final aguarda networkidle e exige um único aviso. Nenhuma destas falhas foi contada como sucesso antes de repetir o teste.

Logs, credenciais e fixtures permanecem ignorados em `.local/sprint/`, não no commit. Capturas/PDF e manifests estão referenciados no guião. QA é Chrome e viewport móvel; Android físico continua indisponível.

## Limitações e decisão

O checklist original permanece **27/32 (84,375%)**, sem mudar denominador nem promover gates por causa do branding. A decisão anterior CONDITIONAL GO para piloto online delimitado não constitui aprovação desta configuração de publicação. Esta candidata: **GO para continuação local; NO-GO exposição externa/produção**.

Faltam consumo/editor de alguns metadados de branding, inventário de licenças/vulnerabilidades, imagem completa e grants confirmados no destino, preparação administrativa de permissões/automações, tenant novo sem passwords de laboratório, storage/SMTP privados e smoke tests HTTPS/SCORM/WS/TUS no Railway. Não houve validação de produção por ausência de falhas nos testes locais.

## Tempo e continuação

Primeiro instante medido: **2026-10-19 06:54:14 UTC**. Tempos de ensaios acima provêm das ferramentas, não de estimativas. Intervalo medido até ao fecho técnico: **06:54:14–07:26:05 UTC, 31 min 51 s**; documentação/commits posteriores não são horas exclusivas de engenharia. tempo decorrido inclui comandos/esperas e não é uma medição de horas de engenharia exclusivas. O espaço oscilou entre 0,7 e 1,6 GiB: insuficiente para prometer builds completos de imagens com Chromium/LibreOffice/FFmpeg, sem remover dados anteriores.

Próxima execução: libertar/disponibilizar espaço para imagens; executar imagens completas e repetir grants no destino; concluir configuração do tenant; congelar SHA e só depois criar/provisionar o projecto demo exclusivo. Sem conector Primavera real, integração Microsoft real ou offline SCORM implícitos.

Documentos principais: [Railway](../../deployment/railway-omatapalo-demo.md), [branding](../../deployment/branding-audit.md), [checklist](../../deployment/release-checklist.md), [rollback](../../deployment/rollback.md), [upstream](../../maintenance/UPSTREAM.md), [política](../../maintenance/upstream-update-policy.md), [divergências](../../maintenance/known-divergences.md), [guião](../../demo/omatapalo-walkthrough.md).

## Commits e estado reproduzível

- `e19ed3fd`: branding, contrato regenerado, marcações e testes.
- `251a8b48`: configuração Railway, separação de migrations, gate/proxy, validadores e harnesses.
- Fecho documental num commit posterior desta mesma linha; não é release aprovada.

Todos os seis commits referenciados (38683c60, 276827c8, ba3290a3, 3a6dc5e8, 656f4a9c, 77f6bae8) foram confirmados como antecessores. Zero ficheiros eliminados pela preparação. API principal local reiniciada no build testado, modo demo e sem maintenance; frontend 5173 preservado. API temporária 3002 encerrada no fim. Reinício reproduzível: `bash scripts/sprints/omatapalo/start-demo-api.sh` a partir do worktree; recusa BD/origem desconhecidas. O `branding-qa.mts` aceita apenas API local 3000/3002 via BRANDING_QA_API_URL; não é um serviço público.

ESLint API dos ficheiros tocados passou. Não foram alteradas dependências/lockfile, nem a licença MIT. Inventário completo de licenças transitivas e imagem final continuam gates abertos.

## Retoma: integridade e permissões mínimas

- Migração **0237_certificate_branding_snapshot**, gerada normalmente pelo Drizzle: duas colunas nullable, sem backfill nem eliminação. Snapshot de emissor/asset keys/cores/demonstração na emissão/renovação nativa. Render PDF/imagem pública preserva a decisão; preview privado permanece com definições actuais.
- Sete testes específicos passaram (74,775 s), incluindo PDF HTTP autenticado com emissor original após alteração das definições, cache antigo S3 sem aviso ignorado e fonte de outro tenant recusada. Percursos: **18/18** com captura. Regressão completa de certificados de cursos: **54/54 em 323,814 s**, incluindo concorrência, histórico, revogação, permissões e PDF.
- Runtime real production numa BD restaurada, **08:38:34.331–08:38:47.246 UTC (12,915 s)**: sem owner/migrator no processo, roles sem DDL/CREATE DB/CREATE ROLE, RLS, login nativo201, atributos de cookies seguros, PDF e competências passaram. Não foi HTTPS nem Railway. Script validate-managed-runtime.mts; manifest protegido 24-managed-runtime.json.
- Migração no laboratório após backup: **08:41:37.758–08:41:38.533 UTC (0,775 s)**; hashes históricos de certificados/tentativas preservados. Script migrate-demo-api.mjs recusa recursos fora de localhost55432/guidebook e guarda dump privado antes de migrar. API local reiniciada com build novo; health200.
- Validador de ambiente: **11/11**. Captura Mailhog permitida apenas em host privado; SMTP real exige credenciais. Primeira tentativa runtime falhou pela configuração SMTP; corrigida sem inventar credenciais. Segunda encontrou host já alterado na cópia de ensaio; resolução passou a usar o ID estável do colaborador fictício, permitindo repetir sem depender do hostname anterior.
- ESLint detectou ordenação de imports e require de PDF sem tipos; corrigidos. Build Nest e typecheck 4GB passaram. Uma repetição final do novo teste de PDF encontra-se registada em 24-snapshot-postlint-e2e.log.
- pnpm licenses list falhou por índice local de pacote em falta (ERR_PNPM_MISSING_PACKAGE_INDEX_FILE). Não se apresenta inventário de licenças como concluído. Sem reinstalar dependências ou apagar caches para mascarar o bloqueio.

### Railway e custo autorizado

Workspace pessoal confirmado por MCP, com três projectos existentes, nenhum alterado. Utilizador autorizou **até US$50/mês**. Tentativa de criar projecto privado utu-mentingo-demo, ambiente demo, sem PR deploys, foi recusada: **trial expirado; escolher plano**. Nenhum ID de projecto foi retornado e nenhum serviço foi criado. Utilizador confirmou que vai activar o plano e avisar; não se interpretou essa intenção como activação concluída. CNAME/TXT continuam inexistentes.

Checklist original **27/32 (84,375%)** preservado. NO-GO externo/produção mantém-se pelos gates de publicação; GO para preparação local. O snapshot novo fecha um risco desta release, sem transformar retroactivamente o histórico legado em configuração conhecida nem aumentar o denominador.
