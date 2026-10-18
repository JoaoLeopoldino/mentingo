# Gestão de competências profissionais

## Visão de negócio

A equipa de formação pode definir competências profissionais exigidas para uma função e identificar colaboradores que ainda não demonstraram o nível necessário. O gestor regista uma avaliação explícita, com fundamentação e datas; o colaborador consulta a sua situação e pode apresentar evidência para avaliação.

O percurso entregue é um MVP local funcional. Usa os grupos do Mentingo como unidades organizacionais e uma função principal por colaborador. Não constitui uma suite de RH ou uma declaração de prontidão para produção.

## Quem utiliza

- Administrador com `competency.manage`: cria catálogo, níveis e funções, define requisitos, associa colaboradores a unidades/grupos existentes e revê evidências e regista avaliações profissionais formais.
- Gestor com `competency.assess_managed`: consulta e avalia colaboradores dos grupos que gere. Não aprova a sua própria competência.
- Colaborador com `competency.read_self`: consulta o seu perfil, lacunas e histórico; apresenta evidências pendentes, sem se auto-certificar.

## Funcionalidades

- Definir código, nome, descrição, categoria, níveis ordenados e estado activo de cada competência.
- Exigir um nível mínimo por função, com início/fim de vigência e recomendações de formação ou percurso existente.
- Associar uma função principal e unidade a um colaborador que já pertença ao grupo correspondente.
- Comparar exigências em vigor com a última avaliação profissional formal: cumprida, em falta, insuficiente, expirada, revogada ou suspensa; evidências pendentes/recusadas são apresentadas separadamente.
- Apresentar evidências com tipo, origem e autor; rever a sua suficiência sem atribuir automaticamente proficiência. Registar avaliações formais com nível demonstrado, avaliador, fundamentação e validade/revisão.
- Preservar o histórico ao acrescentar evidências; desactivar competências sem eliminar registos anteriores.

## Valor para os utilizadores

O administrador consegue preparar requisitos coerentes por função. Os gestores distinguem uma formação concluída de uma competência profissional efectivamente avaliada. Os colaboradores conseguem consultar o que lhes falta e os registos que fundamentam a sua situação.

## Funcionamento

Na página **Competências**, o administrador cria o catálogo e os níveis, cria uma função e exige competências para essa função. Associa os colaboradores às respectivas unidades. A matriz apresenta as lacunas e ligações às formações recomendadas.

No perfil, o colaborador apresenta evidência pendente ou o avaliador autorizado regista uma decisão fundamentada. Uma aprovação com nível suficiente e validade em vigor satisfaz o requisito. A recusa de uma evidência não invalida uma avaliação aprovada anteriormente. Só uma nova avaliação formal substitui a avaliação corrente, mesmo quando atribui um nível inferior. Revogação e suspensão exigem uma decisão explícita, fundamentação, responsável e data efectiva. A expiração da última avaliação não recupera automaticamente uma avaliação antiga.

As formações recomendadas usam os mecanismos de acesso e inscrição existentes; a recomendação não concede acesso automaticamente. Para percursos, a ligação abre o catálogo de percursos, não uma página individual inexistente no upstream.

## Contexto técnico essencial

- Rota `/competencies`; catálogo e quatro vistas na mesma interface. Contrato em `apps/api/src/competencies/competencies.schema.ts`; API em `competencies.controller.ts`.
- Âmbito e cálculo de lacunas em `competencies.service.ts`; RLS nas seis tabelas iniciais e nas três novas tabelas de revisões, avaliações e revogações. As evidências permitem SELECT/INSERT ao papel da aplicação, sem política UPDATE/DELETE.
- Migrações normais Drizzle 0223/0225/0226/0227 e backfill 0228; política RLS 0224 gerada por script para SQL não representável nesta versão do Drizzle. Não houve edição manual dos contratos gerados.
- Não existe atribuição automática a partir de notas, certificados ou IA. Não são necessários jobs/eventos para estes pequenos registos síncronos; efeitos posteriores devem reutilizar o outbox existente.
- Níveis são imutáveis neste MVP; não há anexos binários, múltiplas funções simultâneas, paginação empresarial ou ensaio de carga. A identidade do avaliador é apresentada pelo identificador quando não pertence à lista visível ao utilizador.
- Novas permissões exigem início de sessão actualizado: sessões JWT anteriores podem continuar sem os novos privilégios até renovação/início de sessão.

## Evidência de testes

Doze testes de domínio cobrem estados, validade, vigência e precedência de decisões. Sete testes de integração passaram contra PostgreSQL real com papel sujeito a RLS: percurso completo, âmbito do gestor, auto-certificação recusada, referências/níveis inválidos, desactivação e isolamento/imutabilidade de evidências.

O script `scripts/sprints/omatapalo/browser-competencies.mts` passou quatro checkpoints de interface com dados fictícios em Luanda, Huíla e Benguela. Criou/verificou catálogo e níveis, requisitos/atribuições, decisões sucessivas e matriz com competência cumprida/em falta. O administrador executou a demonstração no navegador; o âmbito específico do gestor foi ensaiado pela API. Não se realizou ensaio de carga ou validação em Android físico.

## Evolução empresarial — decisões (18/10/2026)

Avaliações concorrentes usam controlo optimista sobre a avaliação corrente e serialização por colaborador/competência: uma decisão vence e a outra recebe conflito, sem apagar histórico. A repetição do mesmo comando é idempotente; alterar o conteúdo mantendo o identificador é recusado. Os registos históricos aprovados do MVP foram convertidos em avaliações formais preservando nível, origem, autor, datas e identificação da evidência. Novas evidências aceites requerem uma avaliação formal separada.

Os testes API incluem concorrência, recusa de evidência mantendo aprovação, revogação fundamentada, acesso fora do âmbito e RLS/imutabilidade nas novas tabelas. A validação Chrome desta evolução é registada no relatório da execução; não se deve confundir a demonstração anterior com a interface agora alterada.

## Plano individual de desenvolvimento

O colaborador ou gestor autorizado cria um plano para uma competência e nível pretendido, com prazo e actividades. O colaborador solicita aprovação; o gestor aprova e assume a responsabilidade. A conclusão de actividades é declarada, sem equivaler automaticamente à conclusão de um curso nem à demonstração de proficiência. O colaborador apresenta evidência ligada ao plano e solicita avaliação final. O gestor revê a evidência e regista uma avaliação formal separada. Só depois pode concluir o plano, se o nível for suficiente e a avaliação estiver válida. Cada decisão fica no histórico com motivo, autor, data e versão; alterações concorrentes são recusadas. A posterior expiração/revogação afecta a competência corrente, preservando a decisão histórica do plano.

API e domínio dos planos ensaiados com PostgreSQL/RLS real. O percurso completo passou em Chrome para administrador, gestor e colaborador, incluindo seis decisões preservadas e consulta do histórico. Planos e actividades não emitem notificações ou inscrições automáticas; futuros efeitos devem reutilizar os mecanismos existentes de outbox/filas.

## Frameworks, escalas e requisitos

O administrador organiza novas competências em frameworks com categorias simples e pode escolher uma escala reutilizável. Os níveis de cada competência permanecem imutáveis e rastreáveis; os registos anteriores continuam válidos. Não existem hierarquias recursivas nem reinterpretação automática de avaliações antigas.

Requisitos obrigatórios e opcionais têm versões com autor e períodos de vigência. Ao alterar um requisito, o administrador preserva a versão anterior. Uma alteração futura só afecta a matriz quando entra em vigor; requisitos expirados deixam de ser exigidos sem recuperar versões anteriores. A interface permite consultar esse histórico. Alterações concorrentes exigem actualização da versão conhecida.

Validação conjunta neste checkpoint: 18 testes de domínio, nove testes API/PostgreSQL/RLS e seis checkpoints Chrome nos três papéis. Os testes não demonstram ainda capacidade com 500 colaboradores nem paridade integral com Totara Learn/Perform.
