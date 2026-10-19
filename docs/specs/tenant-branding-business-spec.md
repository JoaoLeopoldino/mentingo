# Identidade da plataforma e demonstrações restritas

## Business Overview

A organização apresenta a sua identidade no LMS e identifica claramente formações de demonstração. O administrador pode ajustar os nomes do emissor e aplicação sem modificar os módulos de aprendizagem; o formando recebe saídas identificadas como demonstração quando o operador activa esse modo no servidor.

## Who Uses It

- Administradores com gestão de definições ajustam os dados da organização e assets pelos mecanismos existentes.
- Formandos consultam a plataforma/certificados sem poder alterar a identidade institucional.
- Operadores preparam uma demonstração restrita, com credenciais adicionais e sem dados reais.

## Feature Functions

- Apresentar nome da aplicação e identidade visual da organização.
- Configurar emissor e nome de remetente nos canais implementados.
- Marcar PDFs/imagens de certificados e emails como demonstração pelo servidor.
- Identificar o browser como ambiente de demonstração e desaconselhar indexação.
- Recusar alterações de identidade por um formando.

## End-User Value

A identificação visível reduz a possibilidade de confundir credenciais fictícias com evidência profissional válida e permite apresentar uma distribuição Utu sem personalizações de cliente embebidas no código genérico.

## How It Works

O administrador actualiza as definições da organização. Logos/cores/assets existentes continuam a ser usados; os novos campos opcionais são geridos pelo contrato de definições, com interface administrativa específica ainda pendente. O operador activa o modo de demonstração no servidor e no build frontend. O servidor acrescenta o aviso às saídas de certificados e email, independentemente das opções do formando. O proxy pede um acesso adicional antes do login LMS.

Novas emissões e renovações guardam o emissor, as chaves dos assets, as cores e a decisão de demonstração na própria transacção. PDFs e imagens públicas usam essa configuração, mesmo depois de mudar as definições. O aviso de demonstração fica associado à credencial e não desaparece ao desligar o modo no servidor. Certificados anteriores à migração mantêm configuração histórica desconhecida (snapshot nulo), sem backfill inventado. O preview privado no browser ainda usa as definições actuais; não confundir esse preview com o PDF histórico. A conservação dos ficheiros depende também da retenção dos objectos no storage. Novos campos legalFooter/defaultLocale/publicVerificationBaseUrl estão validados e armazenados mas o respectivo consumo operacional continua pendente.

## Key Technical Context

- Contrato: `apps/api/src/settings/schemas/settings.schema.ts`; PATCH existente com SETTINGS_MANAGE, RLS e registo de alterações.
- Renders: shared certificate markup e serviços de cursos/percursos; `DEMONSTRATION_MODE` é configuração do servidor.
- Browser: PlatformLogo/Favicon, layout e root; `VITE_DEMONSTRATION_MODE` é público e não substitui a protecção servidor.
- Proxy Railway: autenticação adicional, API privada, sem cache de dados privados; validação de ambiente separa runtime e migrador.
- Evidência: testes unitários, regressão de definições, QA Chrome/PDF local. Não há demonstração Railway/Android físico nem release pública aprovada.

## Test Evidence

Sete testes PostgreSQL/RLS verificaram emissor congelado, emissão idempotente, PDF autenticado com marca persistente, rejeição de fonte de outro tenant e separação do cache de imagens antigas. Dezoito testes de certificados de percursos passaram com a nova captura. Uma API real em modo production, numa cópia local restaurada, autenticou o formando, gerou PDF e abriu competências usando apenas ligações de runtime sem permissões DDL. HTTPS e Railway continuam por demonstrar.
