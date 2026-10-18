# Gestão de competências profissionais

## Visão de negócio

A equipa de formação pode definir competências profissionais exigidas para uma função e identificar colaboradores que ainda não demonstraram o nível necessário. O gestor regista uma avaliação explícita, com fundamentação e datas; o colaborador consulta a sua situação e pode apresentar evidência para avaliação.

O percurso entregue é um MVP local funcional. Usa os grupos do Mentingo como unidades organizacionais e uma função principal por colaborador. Não constitui uma suite de RH ou uma declaração de prontidão para produção.

## Quem utiliza

- Administrador com `competency.manage`: cria catálogo, níveis e funções, define requisitos, associa colaboradores a unidades/grupos existentes e avalia evidências.
- Gestor com `competency.assess_managed`: consulta e avalia colaboradores dos grupos que gere. Não aprova a sua própria competência.
- Colaborador com `competency.read_self`: consulta o seu perfil, lacunas e histórico; apresenta evidências pendentes, sem se auto-certificar.

## Funcionalidades

- Definir código, nome, descrição, categoria, níveis ordenados e estado activo de cada competência.
- Exigir um nível mínimo por função, com início/fim de vigência e recomendações de formação ou percurso existente.
- Associar uma função principal e unidade a um colaborador que já pertença ao grupo correspondente.
- Comparar exigências em vigor com a última decisão de avaliação: cumprida, em falta, insuficiente, pendente, recusada ou expirada.
- Registar evidências e decisões com origem, fundamentação, autor, avaliador, data e validade/revisão opcionais.
- Preservar o histórico ao acrescentar evidências; desactivar competências sem eliminar registos anteriores.

## Valor para os utilizadores

O administrador consegue preparar requisitos coerentes por função. Os gestores distinguem uma formação concluída de uma competência profissional efectivamente avaliada. Os colaboradores conseguem consultar o que lhes falta e os registos que fundamentam a sua situação.

## Funcionamento

Na página **Competências**, o administrador cria o catálogo e os níveis, cria uma função e exige competências para essa função. Associa os colaboradores às respectivas unidades. A matriz apresenta as lacunas e ligações às formações recomendadas.

No perfil, o colaborador apresenta evidência pendente ou o avaliador autorizado regista uma decisão fundamentada. Uma aprovação com nível suficiente e validade em vigor satisfaz o requisito. Uma decisão posterior de recusa invalida a decisão anterior para a situação actual, preservando ambas. Evidências pendentes não substituem uma decisão de avaliação já existente.

As formações recomendadas usam os mecanismos de acesso e inscrição existentes; a recomendação não concede acesso automaticamente. Para percursos, a ligação abre o catálogo de percursos, não uma página individual inexistente no upstream.

## Contexto técnico essencial

- Rota `/competencies`; catálogo e quatro vistas na mesma interface. Contrato em `apps/api/src/competencies/competencies.schema.ts`; API em `competencies.controller.ts`.
- Âmbito e cálculo de lacunas em `competencies.service.ts`; RLS em seis tabelas. As evidências permitem SELECT/INSERT ao papel da aplicação, sem política UPDATE/DELETE.
- Migrações normais Drizzle 0223/0225; política RLS 0224 gerada por script para SQL não representável nesta versão do Drizzle. Não houve edição manual dos contratos gerados.
- Não existe atribuição automática a partir de notas, certificados ou IA. Não são necessários jobs/eventos para estes pequenos registos síncronos; efeitos posteriores devem reutilizar o outbox existente.
- Níveis são imutáveis neste MVP; não há anexos binários, múltiplas funções simultâneas, histórico de versões de requisitos, paginação empresarial ou ensaio de carga. A identidade do avaliador é apresentada pelo identificador quando não pertence à lista visível ao utilizador.
- Novas permissões exigem início de sessão actualizado: sessões JWT anteriores podem continuar sem os novos privilégios até renovação/início de sessão.

## Evidência de testes

Seis testes de integração passaram contra PostgreSQL real com papel sujeito a RLS: percurso completo, âmbito do gestor, auto-certificação recusada, referências/níveis inválidos, desactivação e isolamento/imutabilidade de evidências.

O script `scripts/sprints/omatapalo/browser-competencies.mts` passou quatro checkpoints de interface com dados fictícios em Luanda, Huíla e Benguela. Criou/verificou catálogo e níveis, requisitos/atribuições, decisões sucessivas e matriz com competência cumprida/em falta. O administrador executou a demonstração no navegador; o âmbito específico do gestor foi ensaiado pela API. Não se realizou ensaio de carga ou validação em Android físico.
