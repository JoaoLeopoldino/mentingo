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

A preservação de identidade histórica por emissão ainda não está implementada: alterações actuais podem reflectir-se em renderizações antigas. Não apresentar este comportamento como preservação imutável do emissor. Novos campos legalFooter/defaultLocale/publicVerificationBaseUrl estão validados e armazenados mas o respectivo consumo operacional continua pendente.

## Key Technical Context

- Contrato: `apps/api/src/settings/schemas/settings.schema.ts`; PATCH existente com SETTINGS_MANAGE, RLS e registo de alterações.
- Renders: shared certificate markup e serviços de cursos/percursos; `DEMONSTRATION_MODE` é configuração do servidor.
- Browser: PlatformLogo/Favicon, layout e root; `VITE_DEMONSTRATION_MODE` é público e não substitui a protecção servidor.
- Proxy Railway: autenticação adicional, API privada, sem cache de dados privados; validação de ambiente separa runtime e migrador.
- Evidência: testes unitários, regressão de definições, QA Chrome/PDF local. Não há demonstração Railway/Android físico nem release pública aprovada.
