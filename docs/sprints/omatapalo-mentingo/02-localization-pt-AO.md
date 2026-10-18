# Etapa 1 — português de Angola

Estado: **MVP funcional implementado e testado; localização integral incompleta**.

Base: `7a23e967`; branch `sprint/omatapalo-validation-20261017`. Ambiente isolado no commit `c6c53fc7`. O commit de localização será registado no estado global.

## Alterações efectuadas

- Registo partilhado `SUPPORTED_LANGUAGES.PT_AO`, normalização BCP 47 por Intl e correspondência de variantes portuguesas para pt-AO.
- Detecção ordenada dos idiomas do navegador, fallback en e tratamento seguro de códigos desconhecidos.
- Reutilização do selector visível em Definições e do selector de conteúdos existente; opção «Português (Angola)» em todos os idiomas.
- Preferência individual persistida no Zustand/localStorage e pela API de definições já existente; preferência da conta tem prioridade. `LanguageProvider` conserva a actualização de `html[lang]`.
- Novo catálogo `apps/web/app/locales/pt-AO/translation.json`: **2.002 / 5.984 chaves (33,46%)**, **3.982** com fallback inglês. A referência original tinha 5.981 chaves; foram acrescentadas duas etiquetas de idioma e uma mensagem de capacidade da IA.
- Traduções produzidas em lotes por LLM, com reutilização de frases repetidas; sem copiar catálogos de terceiros. Preservação automática de chaves, placeholders, markup e pares de plurais.
- Cobertura completa das chaves dos percursos principais de login, recuperação de palavra-passe, navegação, dashboard, catálogo, formação, lição, avaliação e certificado, validada por teste. «Cobertura completa de chaves de um percurso» não prova que todos os textos fixos estejam traduzidos.
- date-fns português para nomes de datas. Intl pt-AO/Africa/Luanda para os dois padrões correntes de timestamps em `formatLocalizedDate`; funções partilhadas de números, percentagens e AOA/Kz. Moeda efectiva dos pagamentos preservada; Stripe recebe `pt` quando o idioma da interface é pt-AO.
- Corpo dos certificados partilhados traduzido. Emails, automações, notificações, cabeçalhos de relatórios e páginas de partilha ainda por traduzir usam fallback explícito para inglês, em vez de valores indefinidos.
- Luma SDK 0.4.0 tem enum fechado de idiomas: criação por IA em pt-AO é recusada explicitamente com mensagem traduzida; não se altera silenciosamente a língua de uma formação. O editor nativo permanece disponível.
- Swagger exportado pelo arranque da API e cliente web regenerado com `pnpm generate:client`; nenhum destes ficheiros foi editado manualmente. Os artefactos regenerados têm um diff amplo devido à expansão do idioma em numerosos contratos e à actualização do esquema efectivamente exportado.

## Evidência executada

| Verificação | Resultado |
|---|---|
| Node 22, `node --experimental-strip-types --test packages/shared/test/*.test.mjs` | **10 passaram**; cobertura/JSON/chaves/placeholders/markup/plurais/Intl/fallback |
| Vitest localização + regressão de inscrição em curso arquivado | **8 passaram**, 2 ficheiros |
| Jest: settings.schema, limite de idioma Luma, reports-access | **9 passaram**, 3 suites na execução final (6,103s), incluindo as duas asserções de esquema |
| Integração SettingsController: `de`, `pt-AO` | **2 passaram**, 40 fora do filtro; resposta e valor persistido verificados; 262,707s incluindo preparação e compilação |
| Typecheck web após regeneração e correcção de fixture | **Passou**, 101,01s medidos |
| Build shared/email/prompts/runtime SCORM/gerador SCORM | **Passou** |
| Build API | **Passou** antes da correcção de autorização da etapa 2 |
| Chrome real: visitante pt-AO, login fictício, mudança en → pt-AO, PUT 200, reload | **Confirmado** |
| Catálogo com cartões efectivamente carregados em pt-AO | **Confirmado**; captura local |
| Abertura de lição | **Confirmada**, questionário nativo aberto através do índice; interface pt-AO e conteúdo fictício inglês. Cinco checkpoints do script passaram |
| Build web completo | **Passou**, heap Node de 4 GB, 72,53s; tentativa anterior falhou por OOM |

Os testes Vitest de idioma usam i18next e localStorage reais. Os testes de API usam a base isolada `guidebook_test`; o adapter de emails de teste não valida SMTP. Não foram utilizados mocks para apresentar a persistência de idioma como real.

As primeiras execuções vermelhas detectaram ausência do registo pt-AO e das funções de fallback/formatação. Um teste de interpolação foi corrigido para usar uma chave real do catálogo. O teste visual inicialmente usou uma rota errada e depois necessitou de aquecimento do Vite; essas execuções falharam e não contam como sucesso. O script passou a esperar pela rota e pelos cartões, evitando capturar apenas um esqueleto de carregamento.

## Capturas locais

Disponíveis em `.local/sprint/screenshots/01-login-pt-AO.png`, `02-settings-pt-AO.png` e `03-catalog-pt-AO.png`, mais `04-lesson-pt-AO.png`. Apenas dados sintéticos. Ficheiros não versionados; não constituem capturas de produção.

## Canais ainda incompletos

Tradução de 3.982 chaves, revisão linguística angolana, conteúdos de cursos existentes, onboarding/ajuda integral, emails transaccionais e modelos publicados, mensagens fixas de API, relatórios PDF/Excel, páginas públicas de partilha e prompts/texto gerado por IA. O invólucro HTML do PDF ainda declara `lang=en`; o corpo traduzido não resolve essa limitação. A aplicação não tem preferência independente por papel na mesma conta.

As funções Intl não substituem automaticamente todos os formatadores antigos. Há padrões personalizados de datas ainda dependentes do fuso do dispositivo. Não se garante equivalência linguística entre pt-AO e pt-PT; o fallback escolhido é **pt-AO → en**, porque não existe catálogo pt-PT no checkout.

## Reprodução e trabalho restante

```bash
source scripts/sprints/omatapalo/environment.sh
node --experimental-strip-types --test packages/shared/test/*.test.mjs
TMPDIR="$PWD/.local/tmp" sprint_pnpm --filter web exec vitest run app/utils/language-localization.test.ts app/api/mutations/useEnrollCourse.test.tsx --maxWorkers=1 --minWorkers=1
# API/web locais devem estar a executar:
TMPDIR="$PWD/.local/tmp" sprint_pnpm --filter api exec tsx ../../scripts/sprints/omatapalo/browser-smoke.mts
```

Verificar Android real, acrescentar idiomas aos canais em falta por lotes, rever terminologia com a Utu Lab e propor contribuição upstream. Manter um único registo de idiomas; não duplicar o frontend. A especificação funcional foi actualizada em `docs/specs/language-localization-business-spec.md`.

## Tempo efectivo

A localização foi intercalada com a recuperação do ambiente. Há checkpoints medidos desde **14:56:11 UTC**; os primeiros testes verdes surgiram durante a instalação e a persistência API/navegador foi demonstrada por volta de **16:19 UTC**. São cerca de **83 minutos de tempo decorrido global até esse checkpoint**, com configuração e esperas incluídas. O refinamento e a validação prosseguiram depois. Não existe cronómetro exclusivo fiável por actividade; não se apresenta este intervalo como 83 minutos de tradução ou desenvolvimento puro, nem como estimativa de localização integral.

## Cobertura após conteúdos e avaliações offline

No checkpoint de 18-10-2026, o catálogo tem **2.050/6.027 chaves traduzidas (34,01%)**, com **3.977 em fallback inglês**. Os dez testes Node passaram novamente, incluindo placeholders e formatação. A nova página offline foi demonstrada em pt-AO no Chrome com estados de submissão e nota confirmada pelo servidor. Não interpretar a cobertura adicional como localização integral dos canais API, emails, PDFs ou AI.
