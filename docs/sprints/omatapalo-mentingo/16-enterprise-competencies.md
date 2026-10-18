# Evolução empresarial das competências — execução de 18/10/2026

## Estado e referência

Branch isolado: `feat/omatapalo-enterprise-competencies-20261018`, a partir de `4e187000`. Checkout original preservado. Início medido: 11:11:17 UTC (12:11:17 em Luanda). Este relatório será actualizado por etapa; tempo decorrido não equivale a horas de engenharia exclusiva.

## Fase 1 — evidências, avaliações e revogação

Implementada a separação das três decisões. A revisão de uma evidência não atribui nem retira proficiência. Uma avaliação formal posterior substitui a anterior mesmo com nível inferior. Revogação/suspensão exige fundamentação e responsável. Histórico só de acrescentamento, idempotência durável e controlo de concorrência por colaborador/competência.

Migrações Drizzle: 0226 e 0227 (estrutura), 0228 (RLS e conversão dos registos antigos). Na base local fictícia, antes/depois: oito evidências, oito aprovações, hash dos campos originais `28bfcf558a5ae684e62e55fd3b3866e5`; oito avaliações criadas a partir dessas aprovações. Nenhuma evidência original alterada. Script reprodutível: `verify-competency-migration.mjs` (captura antes e verificação depois da migração; apenas localhost/guidebook).

### Testes executados

- Baseline de domínio: 8/8, 12,794 s.
- Regressão primeiro reproduzida: 1 falha/7 sucessos, 14,213 s; a evidência recusada removia a aprovação anterior.
- Domínio após separação: 12/12, última execução 8,480 s.
- API/PostgreSQL/RLS: 7/7, última execução 46,599 s. Inclui recusa mantendo avaliação, avaliação concorrente (201/409), repetição idempotente, comando incompatível, revogação, âmbito do gestor e isolamento/imutabilidade das três novas tabelas.
- TypeScript API e web: sem erros nas verificações executadas.
- Compilação API: concluída; servidor local reiniciado. Cliente regenerado a partir de Swagger pela ferramenta existente.
- Compilação web: concluída. Chrome: 5/5 checkpoints reais em 6,003 s; submissão/revisão de duas evidências, duas avaliações formais e matriz. Capturas inspeccionadas visualmente. O primeiro ensaio encontrou sobreposição de formulários por larguras mínimas intrínsecas; corrigida sem forçar cliques ou alterar permissões.

### Problemas encontrados e resolvidos

A primeira geração omitiu a coluna de tipo de evidência antes do backfill: o teste falhou por coluna inexistente. A transacção não foi aplicada. O rascunho custom ainda não aplicado foi removido pela ferramenta Drizzle, preservado em ficheiros locais ignorados, e regenerado na ordem correcta: estrutura antes de dados. As migrações aplicadas não foram reescritas.

### Limitações e trabalho seguinte

Continuam em desenvolvimento frameworks/escalas reutilizáveis, requisitos versionados, planos individuais, múltiplas funções, gestão explícita de avaliadores e validação Chrome dos três perfis. O novo modelo ainda não foi ensaiado com 500 colaboradores reais de teste nem significa paridade com Totara.

Comandos: `source scripts/sprints/omatapalo/environment.sh`; `sprint_pnpm --filter api exec jest competency-gaps.spec.ts --runInBand`; `NODE_OPTIONS=--max-old-space-size=4096 bash scripts/sprints/omatapalo/test-api-e2e.sh competencies.e2e-spec.ts` (guard de base local). Logs/evidências brutas em `.local/sprint/enterprise-*`, ignorados pelo Git.

## Planos individuais — implementação em validação

Modelo de plano, actividades e histórico imutável com estados rascunho → aguarda aprovação → em curso → aguarda avaliação final → concluído. Aprovação atribui o responsável autorizado; devolução e cancelamento exigem fundamentação. Actividades podem referir cursos ou percursos existentes, sem conceder acesso ou proficiência. Evidências podem ser associadas ao plano. A conclusão exige todas as actividades declaradas e avaliação profissional corrente suficiente, não expirada/revogada, suportada por evidência aceite desse plano. Decisões e alterações incrementam versão e preservam responsável, autor, motivo, data e avaliação final.

Testes de transições: 3/3, 7,327 s. API/PostgreSQL/RLS: 8/8, 63,428 s, incluindo o percurso completo do plano, repetição idempotente, conflito de versão/aprovação concorrente, proibição de auto-aprovação, conclusão sem avaliação recusada e isolamento/imutabilidade de histórico. TypeScript API/web e lint do módulo: sem erros. Compilação API/web concluída. Chrome dos três perfis: 6/6 checkpoints em 15,294 s; plano completo com seis decisões, histórico consultado pelo colaborador e matriz com requisito cumprido.

## Frameworks e requisitos versionados

Frameworks com categorias planas e escalas reutilizáveis imutáveis; os níveis ficam copiados em cada competência, com referência à escala. A API recusa categorias fora do framework e níveis diferentes da escala escolhida. Competências antigas mantêm categorias/níveis originais e podem continuar sem framework; não se reinterpretam os seus níveis retroactivamente.

Cada alteração de requisito acrescenta uma versão com autor, vigência, nível, obrigatoriedade e recomendações. A versão futura não substitui prematuramente a actual; uma versão expirada não ressuscita uma regra antiga. A API exige a versão conhecida para alterar um requisito existente. Migrações 0231/0232 preservam os requisitos anteriores como versão 1.

Domínio conjunto: 18/18, 6,879 s. API/RLS: 9/9, 18,671 s na repetição. Execução anterior: 8 sucessos e uma ligação HTTP interrompida (`ECONNRESET`); sem erro funcional adicional registado. O ensaio Chrome inclui criação real de framework/escala e classificação da competência.

### Bloqueios de preparação de QA e correcções

O registo público está fechado; não foi aberto. Os convites fictícios não produziram mensagens no Mailhog local durante a espera de 30 s, pelo que a entrega de convites não está validada. O script de demonstração prepara credenciais exclusivamente para novas contas `enterprise-employee/manager-<hex>@example.com`, criadas há menos de dez minutos, em `127.0.0.1:55432/guidebook` e ambiente development. Recusa credenciais existentes; reutiliza o hash nativo. O login e todas as decisões de competências são reais, sem simular respostas da API. Os dados de demonstração permanecem explicitamente fictícios.

Uma repetição Chrome encontrou uma corrida no próprio ensaio entre a resposta HTTP e a reposição do formulário. O ensaio passou a aguardar a versão visível seguinte e o fim da reposição; não força cliques ou desactiva validações. Erros Axios são resumidos sem imprimir cabeçalhos de sessão.

### Evidências locais

`.local/sprint/enterprise-plans-framework-browser-recovery.log`, `enterprise-framework-api-repeat.log`, `enterprise-framework-domain.log`; capturas `16-enterprise-admin.png`, `16-enterprise-manager.png`, `16-enterprise-employee.png`. Revisão visual e dados são locais; não são anexados ficheiros com sessões ou dados reais ao Git.

### Medição intermédia

Início 11:11:17 UTC; checkpoint observado 14:11:02 UTC: 2 h 59 min 45 s de tempo de calendário, incluindo compilações, esperas de aprovação/ferramentas, diagnóstico e preparação de QA. Não corresponde a três horas exclusivas de programação. Ainda faltam múltiplas atribuições, filtros/paginação e ensaio PostgreSQL com 500 colaboradores, gestão explícita de avaliadores e a comparação final delimitada com Totara.

Localização neste checkpoint: 6.173/6.173 chaves estruturais, 57 invariantes técnicos iguais a inglês, zero entradas inesperadamente por traduzir e zero erros de placeholders. Revisão linguística humana completa não realizada.

## Atribuições profissionais, âmbito e paginação — checkpoint validado

Migração 0233: alarga a tabela existente, preservando a função principal. Adiciona gestor, início/fim, identificador externo, estado e atribuições adicionais. Índices de colaborador/gestor e unicidade da principal activa/identificador externo. Atribuições anteriores preservadas com início desconhecido, sem inventar datas RH. Trocar a principal termina a atribuição anterior; não apaga o registo. A designação de gestor só dá âmbito a quem já tenha permissão de avaliação; não concede essa permissão.

Antes/depois na base fictícia principal: cinco atribuições e hash `512d9dda5ee9af26f3da10e2f1ded73d`; campos originais e semântica principal preservados. A primeira verificação foi antecipada antes do fim do arranque e falhou por coluna ainda inexistente; foi repetida após a migração, com sucesso. Script `verify-competency-job-migration.mjs`; nenhuma alteração de dados nesse verificador.

A matriz agrega duas funções activas e usa o maior mínimo obrigatório; um objectivo opcional superior não aumenta esse mínimo. Considera datas e ignora atribuições terminadas. Os grupos mantêm-se; não foi introduzido um organigrama paralelo. Atribuições com início futuro podem ser criadas, mas o término antecipado de uma atribuição futura ainda não tem um fluxo de cancelamento.

Filtros por pessoa, unidade, função, estado e evidências por rever são aplicados antes da paginação. O filtro de evidências encontra também pendências de uma competência já demonstrada. O perfil aberto a partir da fila fica focado no colaborador, evitando desaparecer quando a pendência é resolvida. O histórico pessoal carregado pertence apenas às pessoas da página; a matriz usa avaliações correntes. Nomes dos responsáveis/avaliadores são resolvidos apenas a partir dos registos autorizados, sem expor o directório ou hashes de comandos.

### Ensaios

- Domínio: 21/21, 7,326 s na repetição final.
- API/PostgreSQL/RLS: 11/11, 18,648 s; inclui 500 colaboradores, duas funções, âmbito da chefia RH, unicidade, histórico, filtros e limites de paginação.
- 500 colaboradores fictícios, cinco pedidos HTTP sequenciais de 100: 141,04 / 68,81 / 64,07 / 66,27 / 81,24 ms; média 84,29 ms. Sem duplicação entre páginas, ordenação estável mesmo com nomes repetidos. O filtro de cumprimento encontra os 100 colaboradores fora da primeira página; o filtro de pendências encontra um colaborador com competência já demonstrada.
- EXPLAIN real: Index Scan sobre `competency_assessments_tenant_id_user_id_competency_id_revision`; 0,023 ms de execução nessa consulta pontual. Não é teste de concorrência nem previsão de produção.
- Chrome: 7/7 checkpoints, 19,726 s. Três papéis, frameworks/escalas, plano completo, fila global de evidências, duas funções/unidades, mínimo de nível 3 face a nível demonstrado 2 e término preservado. Capturas revistas: `16-enterprise-manager.png`, `16-enterprise-employee.png`, `16-enterprise-two-jobs.png`.
- TypeScript API/web, lint do módulo e builds API/web concluídos. Uma advertência de console no benchmark é exclusivamente a saída de medição; sem dados de sessão.

### Falhas intermédias tratadas

O validador nativo exigiu alinhar a ordem dos parâmetros do controller com os decorators e aceitar booleanos de query como `true`/`false` textuais. O bloqueio por identificador externo precisou de cast SQL explícito para texto. O ensaio Chrome esperava uma expressão diferente da tradução existente; corrigida a expectativa para “Proficiência insuficiente”. Não se forçaram cliques nem se contornaram permissões. Houve também uma resposta 401 isolada numa execução anterior, não reproduzida nos onze cenários finais; origem não determinada e sem alteração ao mecanismo de autenticação.

## Limites empresariais que permanecem

Sem credenciação de avaliadores por especialidade, delegações ou escalonamento; a administração reutiliza utilizadores/permissões existentes. Escalas e categorias são básicas; competências antigas podem continuar sem framework. Definições dos planos e actividades não são editáveis após criação nesta fatia; devolução permite reapreciar a decisão e acrescentar evidências depois de reaprovação, mas alterar a definição requer actualmente outro plano. Declaração de actividade concluída não é verificação automática da conclusão do curso. O histórico de uma pessoa não tem paginação própria. Ligações a cursos/percursos não concedem acesso ou inscrição. Referências históricas impedem a eliminação física de recursos ligados, exigindo política de arquivo/retirada. Estas condições devem ser resolvidas/aceites antes de produção.

**Checklist global inalterado: 22/32 = 68,75%.** Os quatro critérios originais de competências já estavam demonstrados; esta evolução reforça-os e não cria pontos artificiais. Android físico, ERP real, SCORM independente/xAPI, certificados públicos e operação continuam gates separados. Comparação publicada em [17](17-competency-totara-parity.md). Decisão: CONDITIONAL GO para piloto controlado.
