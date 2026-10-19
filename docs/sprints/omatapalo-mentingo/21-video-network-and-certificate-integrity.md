# Vídeo sob rede limitada e integridade de certificados — 18/10/2026

Checkpoint histórico preservado. Estado seguinte: **27/32**, [demonstração e matriz contratual 22](22-integrated-demo-and-contract-matrix.md), [operação e desempenho 23](23-performance-recovery-and-validation.md).

Estado: **26/32 critérios demonstrados = 81,25%**, mantendo o denominador e os gates críticos. **CONDITIONAL GO para piloto delimitado; NO-GO para substituição em produção**. Código: `fa521a48` (certificados de percursos) e `b1b32296` (vídeo). Base desta execução: `75380ae5`, branch `feat/omatapalo-enterprise-competencies-20261018`. Sem push, merge, produção ou dados reais.

Fecha-se apenas o critério de medição de arranque, rebuffering, resolução e tráfego sob rede limitada. A correcção de certificados reforça o critério anteriormente demonstrado; não cria outro ponto. O utilizador confirmou que **não dispõe de Android físico nesta sessão**: offline móvel permanece BLOCKED, sem o substituir por viewport ou Chrome de secretária.

## Alterações funcionais

### Certificados de percursos de aprendizagem

`apps/api/src/learning-path/services/learning-path-certificate.service.ts` valida o destinatário no tenant do percurso, com RLS e exclusão de contas eliminadas, antes de emitir ou reutilizar um certificado. `learning-path.repository.ts` dá prioridade ao certificado activo sobre histórico expirado e trata a colisão de emissão pelo índice único. Uma chamada repetida não reactiva um certificado expirado.

A migration Drizzle gerada `0235_learning_path_certificate_active_uniqueness.sql` acrescenta um índice único parcial por tenant/destinatário/percurso, apenas para estado `active`. Conserva certificados expirados. Não elimina, funde ou reescreve evidências. O preflight local encontrou **zero grupos activos duplicados**; a tabela principal tinha **zero certificados de percursos antes e depois**, com fingerprint igual. O teste de integração, separado, exerceu histórico não vazio. Não se apresenta a tabela principal vazia como prova de migração de dados históricos reais.

O script `scripts/sprints/omatapalo/verify-learning-path-certificate-migration.mjs` recusa outra base, duplicados e sobreposição da captura. Um ambiente com duplicados precisa de revisão explícita antes de aplicar o índice. O snapshot extenso é gerado pelo Drizzle; não representa reconstrução do módulo nem eliminação de ficheiros.

**Limite:** revogação formal e ciclos de recertificação de percursos ainda não implementados. Os estados existentes são `active`/`expired`; não se inventou um estado `archived`. Este teste valida o serviço interno, persistência e RLS, não demonstra uma exploração por endpoint público. Os certificados de cursos e o SCORM independente conservam as provas anteriores do relatório 18.

### Recuperação do leitor nativo

`apps/web/app/components/VideoPlayer/useVideoPlaybackRecovery.ts` oferece **«Voltar a tentar reproduzir»** após espera/interrupção prolongada ou erro nativo. A acção recarrega a mesma origem e repõe a posição observada após os metadados. Impede duplo clique, permite nova tentativa após timeout e remove listeners/timers quando muda o leitor ou a origem. O aviso desaparece com reprodução efectiva, não apenas pela resolução de uma promessa.

Uma regressão cobre o último evento de progresso durante buffering: não pode cancelar o aviso enquanto não existem dados suficientes. A posição da lição anterior não é aplicada a outra origem. O controlo reutiliza o Button/design system existente; Chrome confirmou altura de **44 px** e texto de **14 px**, incluindo a sobreposição do Video.js. Etiquetas e acessibilidade foram acrescentadas aos oito catálogos, sem novas dependências.

**Limite:** recuperação assistida, não transparente ou automática. Não renova sessões nem URLs assinadas; não acrescenta vídeo offline, transcodificação ou suporte equivalente para YouTube/Vimeo. A cobertura de visualização nativa continua a ser usada; clicar em retry não conclui a formação.

## Medição real HLS

O gerador cria um padrão sintético próprio de 48 segundos, 15 fps, sem áudio, segmentos de dois segundos, H.264 e quatro variantes. Não contém imagens de terceiros. O FFmpeg Homebrew falhou por ausência de `libx265.215.dylib`; não se alterou a instalação global. Usou-se a imagem versionada `mwader/static-ffmpeg:8.0.1`, digest `sha256:252705ff88532fa338e7065c21792756552f8fe7c212f84bc503d3c340689594`, num contentor sem rede, só de leitura, sem capabilities e com montagem apenas da nova pasta sintética. Geração: **6.483 ms**. [Origem e condições do gerador](https://github.com/wader/static-ffmpeg): a licença do repositório não substitui as licenças FFmpeg/x264 do binário. Não foi distribuído com a aplicação.

| Variante | Resolução | Bytes completos de segmentos | Débito médio observado |
|---|---|---:|---:|
| 144p | 256×144 | 498.388 | 83.065 bit/s |
| 240p | 426×240 | 891.120 | 148.520 bit/s |
| 360p | 640×360 | 1.690.120 | 281.687 bit/s |
| 720p | 1280×720 | 5.690.572 | 948.429 bit/s |

`browser-hls-bandwidth.mts` cria uma formação/lição nativa através das APIs reais, serve apenas os ficheiros sintéticos numa origem loopback e abre o leitor Video.js/VHS no Chrome. Não substitui respostas LMS por mocks. Usa CDP para banda/latência, observa eventos reais e conta bytes HTTP de media. Cada perfil usa contexto novo, cache desligada e service worker bloqueado. A aplicação já está carregada antes da limitação: **não é medição de arranque frio da aplicação/PWA**. O curso e a categoria temporários são removidos pelas APIs no fim; mantêm-se JSON e capturas locais ignorados pelo Git.

Execução completa final: **20:17:07.895–20:19:32.262 UTC**, **144.359 ms**, quatro perfis PASS.

| Banda / latência | Até reprodução efectiva | Resolução observada | Bytes HTTP de media | Reprodução na janela | Esperas de rebuffering |
|---|---:|---|---:|---:|---|
| 5.000 kbit/s / 20 ms | 801,7 ms | 720p | 5.698.059 | 14,34 s | 0 |
| 500 kbit/s / 200 ms | 2.209,7 ms | 360p | 1.697.583 | 32,91 s | 0 |
| 150 kbit/s / 400 ms | 3.312,3 ms | 144p | 505.851 | 41,82 s | 0 |
| 500 kbit/s, corte de 6 s | 2.077,7 ms | 360p | 876.746 | 14,84 s | 2 eventos, 16.318 ms |

O leitor pode pré-carregar o ficheiro de 48 segundos: os bytes não correspondem apenas aos segundos vistos. Contam cabeçalhos HTTP e dados parciais observados; não equivalem à factura de uma operadora móvel. Não há áudio, conteúdos pedagógicos legíveis, CDN, transcodificação, Android ou vídeo concorrente neste ensaio.

Antes da correcção, no cenário interrompido, a reprodução ficou em **7,914 s**, sem voltar a avançar durante aproximadamente 18 s após restabelecer a rede. O modo Auto já seleccionava resoluções baixas; o problema observado era a recuperação do leitor. A desactivação temporária de variantes pelo VHS após falhas é comportamento legítimo: uma primeira asserção do guião que exigia todas as variantes activas no final foi corrigida. O teste final exige reprodução e avanço efectivos, não uma lista artificial de variantes.

Após a correcção, o guião clica no controlo real. Na repetição visual final (**20:24:17.584–20:24:56.909 UTC**, **39.324 ms**), conservou a posição de **7,924695 s → 7,924753 s** e retomou **3.851,5 ms após o clique**. Desde a reposição da rede foram **12.953,5 ms**, incluindo cerca de nove segundos de espera deliberada do guião antes do clique. Houve três eventos de espera, **16.285,8 ms**, incluindo reload/seek; reprodução estável nos últimos sete segundos observados. Não se promete ausência de interrupções.

O precache do build final contém 511 entradas/**14.791,09 KiB**; foi excluído desta janela de media. O custo de arranque da aplicação, compressão/evicção, URLs privadas, expiração de sessão, conteúdos reais com áudio e qualidade pedagógica a 144p precisam de ensaios separados.

## QA visual

Capturas locais, revistas, com dados fictícios; não são versionadas:

- [Normal, 720p](../../../.local/sprint/screenshots/21-hls-normal.png).
- [500 kbit/s, 360p](../../../.local/sprint/screenshots/21-hls-limited-500.png).
- [150 kbit/s, 144p](../../../.local/sprint/screenshots/21-hls-limited-150.png).

![Acção de recuperação após interrupção](../../../.local/sprint/screenshots/21-hls-recovery-offer.png)

![Reprodução retomada, preservando a posição](../../../.local/sprint/screenshots/21-hls-interrupted-500.png)

## Testes executados e falhas corrigidas

| Verificação nesta execução | Resultado final | Observação |
|---|---|---|
| Integração certificados de percursos, PostgreSQL/RLS | **14/14**, 88,81 s | Destinatário externo/eliminado, emissão concorrente, índice, histórico, expiração e acessos |
| VideoPlayer Vitest | **41/41**, 7,46 s | Seis de recovery, nove HLS e regressões de cobertura/teclado/tipos |
| Validador pt-AO | **6.233/6.233**, 100% estrutural | 6.176 valores diferentes do inglês, 57 invariantes, zero omissões/placeholders inválidos |
| Testes Node do validador | **5/5**, 111,946 ms | Revisão humana permanece não quantificada |
| Build API | **PASS, exit 0** | Compilação após a correcção; API reiniciada com este build |
| Typecheck web | **PASS, exit 0** | Sem alteração de contratos HTTP |
| Build web final | **PASS, exit 0** | Cliente 39,61 s; SSR 18,23 s; configuração de memória da sprint |
| Lint dos ficheiros alterados | **PASS, zero erros** | API/web; formatação final corrigida |
| Chrome HLS final | **4/4 perfis PASS** | Mais repetição visual final do cenário interrompido |
| Android físico | **BLOCKED** | Indisponibilidade confirmada pelo utilizador |

Execuções vermelhas preservadas: dois testes reproduziram aceitação de destinatários externos/eliminados; uma regressão do hook detectou o cancelamento incorrecto do temporizador. Foram corrigidas e as suites completas passaram. As cinco emissões concorrentes já passaram antes do índice; não se afirma ter observado duplicação nessa execução. O índice acrescenta uma garantia de persistência testada directamente.

Erros do próprio trabalho, resolvidos: fixture inicial usava estado `ARCHIVED` inexistente (corrigido para `EXPIRED` antes de executar a suite); a declaração Video.js de `currentSource()` não correspondia ao contrato pretendido (usaram-se `currentSrc()`/`currentType()` tipados); ordem de imports e formatação ajustadas. Estes erros não são apresentados como falhas de produção.

Os testes históricos de SCORM, offline, emails e carga do relatório 18 não foram todos repetidos nesta janela e não se somam como novos testes. Não houve mudança de contrato HTTP, pelo que a regeneração Swagger/cliente não era necessária. Os dois business specs afectados foram actualizados com o workflow de descoberta do repositório: [certificados](../../specs/certificates-business-spec.md), [vídeo](../../specs/video-quality-business-spec.md).

## Reprodução segura

Executar no worktree da sprint, apenas com os serviços e contas fictícias locais já configurados:

```sh
source scripts/sprints/omatapalo/environment.sh
NODE_OPTIONS=--max-old-space-size=4096 bash scripts/sprints/omatapalo/test-api-e2e.sh --runTestsByPath src/learning-path/__tests__/learning-path-certificates-security.e2e-spec.ts
sprint_pnpm --filter web test app/components/VideoPlayer
node scripts/localization/validate-pt-AO.mjs
node --test scripts/localization/translation-validation.test.mjs
```

O wrapper E2E confirma os serviços locais/teste e recria apenas a base `guidebook_test`; nunca apontar este comando a outra base. A migration foi aplicada à base local `guidebook` com zero duplicados. O script `verify-learning-path-certificate-migration.mjs verify` compara a captura já existente; alterações legítimas futuras tornam essa comparação obsoleta. Não sobrescrever a captura para simular preservação.

Para recriar o padrão e executar o navegador, com Docker, API e preview locais operacionais:

```sh
SPRINT_FFMPEG_IMAGE=mwader/static-ffmpeg:8.0.1 node scripts/sprints/omatapalo/prepare-hls-fixture.mjs
sprint_pnpm --filter api exec tsx --tsconfig ../web/tsconfig.json ../../scripts/sprints/omatapalo/browser-hls-bandwidth.mts
```

O gerador cria uma pasta nova, não substitui conteúdos existentes. O guião necessita do Chrome instalado e de acesso aos serviços loopback. `SPRINT_VIDEO_PROFILES=interrupted-500` permite repetir apenas a recuperação. A aplicação mantém-se em **http://localhost:5173**. O guião Android e os critérios de recolha continuam no [relatório 13](13-android-physical-validation.md).

Logs/JSON locais: `.local/sprint/learning-path-issuance-{red,green}.log`, `learning-path-certificate-migration-{before,apply,after}.log`, `hls-fixture.json`, `hls-baseline-limited.json`, `hls-final.json`, `hls-visual-recovery-final.json`, `video-player-all-unit-final.log`, `21-api-build.log`, `21-web-visual-build.log`, `21-pt-AO.json`. Não publicar cookies, storageState ou HARs brutos.

## Tempo medido, decisão e trabalho restante

Intervalo desta execução registado: **19:58:51–20:30:14 UTC, 31 min 23 s**, até à consolidação de resultados. Inclui downloads, aprovação, builds, testes e esperas sobrepostas; a redacção final posterior não está incluída neste checkpoint. Não foram medidas horas exclusivas por funcionalidade nem se aplica um multiplicador de produtividade da IA. As durações dos testes e guiões acima são medições separadas, não esforço humano facturável.

Estimativas revistas, ainda provisórias, em dias-pessoa para um engenheiro experiente: validar vídeo com conteúdos reais, URLs privadas/CDN e telemóvel **1/3/7** (optimista/provável/conservadora); revogação e ciclos formais dos percursos **2/4/8**. Dependem de políticas de credenciais, conteúdos e equipamento. O envelope restante de produção do relatório 20 mantém-se **35/70/140**; estas fatias sobrepõem-se a esse envelope, não se somam novamente. A prova local não resolve conectores ou operação de produção.

Próximos gates: Android físico/quotas e recuperação de sessões; política de revogação/recertificação dos percursos; Primavera e Teams reais com acesso autorizado; refresh BI; conteúdos privados e áudio sob rede fraca; vídeo/IA concorrentes; backup/restore integral e revisão de segurança. Competências não foram expandidas nesta janela. A matriz a–j do relatório 18 continua válida, com avanço do requisito **i** para medição local real e reforço parcial de **f**. Não se declara paridade total com Totara nem cobertura SCORM 2004/xAPI.

Verificação de fecho às **20:32:53 UTC**: checklist conferido por script, exactamente **32 critérios/26 demonstrados**; links locais do novo relatório existentes; frontend **HTTP 200** e API anónima **401** esperados. O primeiro probe HTTP dentro do sandbox foi bloqueado (000); a repetição autorizada fora dessa restrição confirmou os serviços. Checkout original preservado em `main`/`7a23e967`, apenas `docs/audits/` não versionado. Zero ficheiros eliminados no diff desde `75380ae5`. Intervalo global até este checkpoint: **34 min 02 s**, incluindo consolidação documental; commit final posterior não incluído.
