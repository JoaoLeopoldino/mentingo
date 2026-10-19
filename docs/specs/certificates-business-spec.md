# Certificates Business Spec

> Estado actualizado em 19/10/2026: ver «Recertificação explícita de percursos» abaixo. As secções de validação anteriores conservam os respectivos checkpoints históricos.

## Business Overview

Certificates provide formal proof that a learner completed a course or learning path. They support HR and L&D needs around recognition, compliance evidence, auditability, and external sharing of learning achievements.

The feature also gives course managers controlled ways to handle certificate validity and resets when course requirements change. Existing certificates can remain valid for historical record, receive updated validity rules, expire automatically, or be reset when the organization needs learners to re-complete training.

## Who Uses It

- Learners viewing, downloading, or sharing certificates from their profile.
- HR and L&D administrators reviewing learner certificate records.
- Course administrators managing certificate availability, validity, and resets for courses they can update.
- External viewers opening public certificate share pages created by learners.

## Feature Functions

- List active certificates for a learner profile.
- Open centered certificate previews for completed courses and learning paths, including from dashboard certificate tiles and the course overview certificate card.
- Switch certificate preview language between all supported platform languages.
- Download certificate PDFs with generated filenames.
- Share certificates externally through LinkedIn/public share links.
- Configure whether a course issues certificates.
- Preview course certificates with the signed-in user's name before enabling issuance.
- Customize and save the certificate font color from the live preview.
- Upload or remove the signature displayed on course certificates.
- Set certificate validity rules for a course.
- Show the impact of validity changes before applying them to active certificates.
- Reset course certificates for all holders, selected groups, or selected users.
- Optionally notify affected learners when certificates are reset.
- Archive expired or reset certificates while preserving activity history.

## End-User Value

Learners receive portable proof of completion that they can keep, download, and share outside Mentingo. HR and L&D teams get a reliable record of achievement for audits, compliance programs, and internal mobility.

For administrators, the reset and validity tools reduce operational risk. When a course changes materially, the team can identify affected certificate holders, choose the right reset scope, and keep historical certificate activity instead of silently overwriting records.

## How It Works

Learners access certificates from the profile certificate area, dashboard certificate tiles, or an eligible course overview certificate card. Each certificate opens in a centered preview, can be rendered as a PDF, and can be shared when sharing is enabled. Certificate rendering is available in every supported platform language, including Spanish and French, even when the related course or learning path does not have a translation in that language; in that case Mentingo falls back to the base title. Public share endpoints serve external certificate pages and images, while protected certificate listing, rendering, and share-link creation remain permission-gated.

Course certificate settings are managed from the admin course settings workflow and the certificate card on the modern course page. Administrators can preview the certificate with their own signed-in name, enable or disable certificate issuance with an immediately saved switch, customize the certificate font color in the live preview and receive confirmation after closing the color picker, upload or remove the certificate signature, define validity, inspect how a validity change affects active certificates, and choose whether the change applies only to future certificates or also to existing active certificates. When validity is enabled for the first time and no active certificates exist, the confirmation focuses on enabling validity without showing the later-change empty-state message. When certificate issuance is disabled, the dependent settings remain visible for context but cannot be edited until issuance is enabled again.

Certificate reset actions archive matching active certificates, reset the relevant learner progress, record certificate activity, and optionally send reset emails. Reset scope can target all certificate holders for the course, selected groups, or selected users with active certificates.

## Key Technical Context

- Profile certificate UI lives under `apps/web/app/modules/Profile/Certificates`.
- Course certificate settings live in both the admin course settings workflow and the modern course stat-card modal; certificate reset tools remain in the admin settings workflow.
- API endpoints are implemented under `apps/api/src/certificates`.
- Core permissions include `PERMISSIONS.CERTIFICATE_READ`, `PERMISSIONS.CERTIFICATE_RENDER`, and `PERMISSIONS.CERTIFICATE_SHARE`.
- Course certificate validity and reset operations require `PERMISSIONS.COURSE_UPDATE` or `PERMISSIONS.COURSE_UPDATE_OWN`.
- Public share endpoints intentionally allow external certificate page and image access for share workflows.
- Certificate PDFs, previews, share pages, and share images use the shared supported-language list, so new platform languages become available to certificates through the same contract.

## Test Evidence

- API E2E coverage verifies authenticated certificate listing, archived certificate exclusion, pagination and sorting, single certificate retrieval, PDF downloads, custom download filenames, validity-impact counts, bulk validity application, expiration handling, reset by all/users/groups, reset validation, reset options, reset-user search, authorization, and activity logging.
- Frontend unit/source evidence covers profile certificate cards, previews, downloads, language toggles, LinkedIn sharing controls, certificate theme behavior, the modern course certificate stat card and modal, disabled settings, immediate issuance updates, signature controls, color saving on picker close, validity-impact confirmation including its first-enable empty state, and reset dialogs.
- I did not find a dedicated frontend E2E certificate spec in the current test tree.

## Validação de acesso — Utu Lab / Omatapalo

Os endpoints de metadados de certificados de formações recebem o actor autenticado. Um formando consulta os próprios certificados. Administradores com gestão de colaboradores podem consultar colaboradores do mesmo tenant; gestores consultam apenas membros dos grupos que gerem. A permissão de leitura de certificados, isoladamente, não permite consultar certificados de outras pessoas. Os testes negativos reproduziram acesso indevido antes da correcção e verificaram a recusa posterior, incluindo entre tenants. Consultar `docs/sprints/omatapalo-mentingo/03-scorm-certificates.md` para âmbito e resultados executados.

## Renovação com preservação de evidências — sprint Omatapalo

A renovação abre um novo ciclo de formação e conserva as avaliações, respostas e resultados anteriores. O formando volta a realizar a formação sem que a evidência antiga satisfaça o ciclo actual. Um administrador pode renovar a formação; pedidos concorrentes não devem criar certificados ou ciclos duplicados.

A API autenticada de histórico permite consultar certificados e tentativas por ciclo, com o mesmo âmbito de acesso aplicado aos metadados de certificados. O ecrã protegido de histórico apresenta os ciclos e resultados em `/learning-history/:courseId/:userId`. O histórico conserva resultados e estados, mas não arquiva uma versão imutável de cada pergunta ou conteúdo.

Evidência: `certificates.controller.e2e-spec.ts` passou 41 testes com PostgreSQL real, incluindo renovação, preservação de respostas, concorrência e recusas de acesso entre utilizadores/tenants. A integração SCORM demonstrou dois ciclos completos, com um certificado por ciclo. A revogação e os certificados de percursos de aprendizagem continuam fora desta validação.

## Revogação explícita e verificação pública — validação empresarial

O administrador com autorização para gerir a formação pode revogar um certificado, indicando uma fundamentação e confirmando a decisão no histórico. A revogação conserva o certificado, responsável, motivo, datas, resultados e ciclo. Não apaga respostas, não repõe progresso e não representa uma renovação. A emissão no mesmo ciclo revogado é recusada; o fluxo administrativo para abrir um novo ciclo após revogação ainda requer implementação específica.

A verificação pública de certificados de formações recusa imediatamente certificados expirados, arquivados, revogados e identificadores inexistentes. As respostas deixam de permitir cache pública. Uma cópia já descarregada ou uma cache externa anterior não pode ser retirada por esta alteração. Os motivos da revogação são consultáveis apenas no histórico autenticado.

Foram executados 51 testes de certificados com PostgreSQL, incluindo autorização negativa, concorrência, histórico, expiração e partilha pública. O percurso Chrome com pacote independente da Rustici demonstrou dois ciclos SCORM, emissão automática, histórico, partilha anónima e revogação pela UI, preservando as duas tentativas. O ensaio usou um administrador fictício no modo de formando. Um formando distinto concluiu depois uma formação nativa, recebeu automaticamente um certificado e consultou o seu histórico.

## Segurança e localização de percursos — validação seguinte

A consulta privada de certificados de percursos passou a aplicar a mesma política dos certificados de curso: o próprio formando, administradores autorizados e gestores no âmbito dos seus grupos. Outro formando ou tenant recebe 404. A leitura pública consulta estado activo e validade antes de gerar página/imagem, com `no-store`; parâmetros inválidos são recusados. Oito testes com PostgreSQL/RLS passaram, incluindo acesso alheio, tenant, expiração e imagem após expiração. A revogação e a recertificação completa de percursos continuam por implementar/aceitar.

A página pública de curso e os metadados de percurso têm textos pt-AO explícitos, evitando fallback inglês. O QA detectou «Open platform», agora «Abrir a plataforma». A criação de curso respeita o parâmetro de emissão de certificado; três regressões cobrem true/false/ausente. A configuração administrativa própria continua disponível. Não se concede competência profissional por emissão de certificado.

## Integridade de emissão de percursos — 18/10/2026

A emissão recusa associar um percurso visível a um colaborador de outro tenant ou eliminado. Dois testes com RLS real reproduziram a aceitação indevida antes da correcção; a prova é do serviço interno de emissão, não uma exploração demonstrada de um endpoint público.

Uma restrição parcial PostgreSQL permite apenas uma credencial activa por tenant/colaborador/percurso, conservando registos inactivos. A emissão concorrente reutiliza a credencial vencedora; a consulta dá prioridade à credencial activa e, depois, à mais recente. Pedir emissão novamente não reactiva silenciosamente uma credencial expirada.

A suite foi alargada para 14 testes, todos aprovados, incluindo cinco pedidos de emissão concorrentes, unicidade na base, prioridade da credencial corrente e recusas de acesso/tenant anteriores. A migration aditiva `0235_learning_path_certificate_active_uniqueness.sql` foi gerada pelo Drizzle e aplicada apenas às bases locais conhecidas. O preflight recusa duplicados, sem os eliminar ou fundir. A base de demonstração tinha zero certificados de percursos; a impressão antes/depois permaneceu igual. Os testes exercitam também histórico inactivo com dados não vazios.

Esta correcção não acrescenta revogação formal, ciclos ou recertificação empresarial de percursos. Esses fluxos continuam pendentes e o critério global de certificados permanece aberto. Não se reconstruíram datas/decisões históricas nem se alterou o domínio de competências.

## Recertificação explícita de percursos — 19/10/2026

O administrador pode revogar fundamentadamente uma credencial de percurso e emitir uma nova após novas conclusões das formações exigidas. O formando conserva o histórico; o gestor autorizado consulta o histórico dos membros da sua equipa. A decisão exige simultaneamente gestão global de percursos e de colaboradores, não apenas permissão para ler certificados.

A emissão inicial guarda os cursos, ciclos e datas de conclusão observados. Para recertificar, todas as formações actualmente exigidas têm de estar concluídas depois da credencial anterior e num ciclo superior ao seu snapshot. Uma nova conclusão, por si só, não substitui a credencial: o administrador regista a recertificação com motivo e validade opcional. Pedidos repetidos/contemporâneos para a mesma credencial devolvem a mesma substituição; argumentos incompatíveis são recusados.

A recertificação do percurso não repõe silenciosamente o progresso dos cursos partilhados. A repetição de uma formação é iniciada pelo fluxo nativo de renovação do curso, com o âmbito explícito do colaborador. Respostas/tentativas antigas continuam conservadas. Não é atribuída competência profissional por conclusão de curso ou emissão de certificado.

A revogação conserva responsável, motivo e data, retira a credencial da consulta corrente e recusa partilha/download público e privado. O histórico autenticado conserva a credencial e o snapshot anterior; uma credencial substituta tem ID próprio e referência à anterior. Cópias anteriormente descarregadas não podem ser recolhidas. O estado técnico inactivo continua `expired`, complementado por `revokedAt` e motivo; consumidores do histórico devem dar precedência à revogação explícita.

A migration aditiva 0236 conserva registos existentes. Credenciais legadas sem snapshot usam a data original como limite mínimo para novas conclusões; não se reconstrói um ciclo histórico desconhecido nem uma versão antiga do conteúdo. Imutabilidade refere-se aos campos de emissão/snapshot preservados pelas operações da API; não é arquivo legal inviolável contra um administrador da base.

Contexto técnico essencial: serviço `learning-path-certificate-lifecycle.service.ts`, endpoints autenticados de histórico/revogação/renovação sob `/api/learning-path/certificates`, RLS e política comum de leitura. As decisões são gravadas na mesma transacção que a mudança de credencial. Não há efeitos externos/avisos novos; eventuais notificações futuras devem reutilizar o outbox. A resposta corrente sem credencial é JSON `null` explícito, conforme o contrato já declarado.

Evidência: **18 testes PostgreSQL/RLS passaram**, incluindo cinco renovações concorrentes, recusas de gestão por formando/tenant, leitura pelo gestor nativo limitada à equipa, revogação pública, histórico/snapshots e novas conclusões. A evidência final de navegador e limites estão no relatório 22 da sprint. Comandos administrativos de percursos foram exercitados pela API; ainda não existe um ecrã específico de gestão do histórico/renovação de percursos. Recorrência, alertas e política RH de produção continuam por acordar.
