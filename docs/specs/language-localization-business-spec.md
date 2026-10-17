# Idiomas e localização — especificação funcional

## Valor para a formação empresarial

A interface e os conteúdos multilingues permitem servir formandos, formadores, colaboradores e administradores através da mesma instalação. A língua da interface e as versões linguísticas dos conteúdos são conceitos distintos: seleccionar português de Angola não traduz automaticamente uma formação existente.

## Utilizadores e percursos

- Visitantes recebem um idioma suportado a partir das preferências do navegador; na ausência de correspondência, recebem inglês.
- Colaboradores autenticados escolhem o idioma em Definições. A API guarda a preferência na configuração individual. A preferência da conta prevalece sobre a preferência local.
- A preferência local persiste no armazenamento do navegador, incluindo antes da autenticação. Não substitui a configuração guardada na conta.
- Criadores de conteúdos escolhem uma língua base e acrescentam versões através do selector existente. A estrutura do currículo continua protegida nas versões traduzidas.
- Administradores mantêm versões linguísticas de grupos, categorias, notícias, perguntas frequentes, percursos de aprendizagem e outros conteúdos suportados.

## Português de Angola

`pt-AO` integra o registo partilhado de idiomas. Os códigos BCP 47 são normalizados na resolução das preferências; `pt`, `pt-AO`, `pt-PT`, `pt-BR` e variantes com sublinhado resolvem para a única tradução portuguesa actualmente disponibilizada, `pt-AO`. Esta correspondência serve a preferência da interface e não altera a língua de dados importados.

O selector apresenta «Português (Angola)». O estado da interface actualiza `html[lang]`. O catálogo pt-AO é parcial, com tradução dos percursos principais de autenticação, dashboard, formações, lições, avaliações e certificados. As chaves por traduzir usam inglês através do i18next. O catálogo não contém cópias inglesas para simular cobertura completa.

A apresentação de timestamps através de `formatLocalizedDate` usa `Africa/Luanda` nos formatos correntes da plataforma quando a interface está em pt-AO. Outros padrões date-fns usam a localização portuguesa. Existem funções partilhadas Intl para números, percentagens e valores AOA; os pagamentos continuam a respeitar a moeda efectiva da transacção. As datas armazenadas não são reinterpretadas nem convertidas na base de dados.

Os certificados gerados pelo construtor partilhado incluem texto pt-AO. O serviço externo de criação por IA Luma 0.4.0 tem um contrato de idiomas fechado e ainda não aceita pt-AO: a API recusa esse pedido explicitamente, com indicação para utilizar o editor nativo. A tradução da interface não prova a disponibilidade de IA, SCORM ou conteúdos produzidos noutras línguas.

## Canais e limites

Os dicionários operacionais de emails, notificações, automações e relatórios dispõem de fallback explícito para inglês quando falta pt-AO. Isto evita valores indefinidos e erros de execução; não constitui tradução desses canais. Os modelos de email personalizados já publicados necessitam de validação e tradução próprias.

A preferência é individual e partilhada entre os papéis da mesma conta. Não foi introduzida uma preferência diferente por papel. Conteúdos continuam a usar `baseLanguage`, `availableLocales` e os mecanismos de fallback do domínio. Não se introduziu um segundo frontend ou um motor de tradução de conteúdos.

Persistem por validar: experiência integral no telemóvel, qualidade linguística por revisores angolanos, textos fixos fora do catálogo, mensagens da API, modelos de email, ajudas, prompts de IA, acessibilidade e documentos PDF efectivamente renderizados. O invólucro HTML de PDF ainda declara inglês; a tradução do corpo do certificado não corrige todos os metadados desse canal.

## Contratos e permissões

O registo em `packages/shared/src/constants/languages.ts` alimenta a validação TypeBox da API e os selectores. Alterações do contrato exigem exportação Swagger pela API e regeneração do cliente web pelo script existente. A preferência reside numa coluna JSON/texto existente; esta adição não exige uma migração de esquema.

A actualização de idioma mantém a autorização `SETTINGS_UPDATE_SELF`. A localização não amplia permissões nem altera fronteiras de tenants. O locale da interface também não pode contornar as regras de visibilidade do conteúdo.

## Evidência e aceitação

Os testes acrescentados verificam normalização, fallback inglês, integridade JSON, chaves, placeholders, markup, plurais, etiquetas de selector, persistência local, resolução da preferência da conta e formatos Intl/Luanda. Os testes Vitest usam o armazenamento e o motor i18next reais. Testes de unidade não demonstram persistência na base de dados.

O teste API existente de actualização das definições foi parametrizado para `de` e `pt-AO`, verificando resposta e configuração gravada. A execução e os resultados encontram-se em `docs/sprints/omatapalo-mentingo/02-localization-pt-AO.md`.

O script `scripts/sprints/omatapalo/browser-smoke.mts` valida, exclusivamente com a carga fictícia local, login, selector de idioma, recarregamento e navegação no catálogo. Não usa o setup global de Playwright nem volta a popular bases de dados. A existência do script não deve ser confundida com um resultado positivo: consultar o relatório do sprint.

## Referências principais

- `apps/web/i18n.ts`, `app/utils/browser-language.ts`, `app/utils/getDateLocale.ts` e `app/utils/formatLocalizedDate.ts`.
- `apps/web/app/modules/Dashboard/Settings/Language/LanguageStore.ts` e `LanguageProvider.tsx`.
- `apps/web/app/components/LanguageSelector/languageOptions.ts` e `app/modules/Dashboard/Settings/components/LanguageSelect.tsx`.
- `apps/api/src/settings/schemas/settings.schema.ts`, `settings.controller.ts` e `settings.service.ts`.
- `apps/api/src/localization/localization.service.ts` e `packages/email-templates/src/`.
- `packages/shared/src/utils/certificate.ts` e `regional-formatting.ts`.
