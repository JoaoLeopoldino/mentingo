# Evolução empresarial das competências — execução de 18/10/2026

**Estado: fatia empresarial funcional em ambiente local, com limites explícitos; CONDITIONAL GO para piloto, sem GO para produção.** Foram implementadas decisões profissionais independentes das evidências, frameworks/escalas, requisitos versionados, planos com aprovação/histórico, funções simultâneas e filtros/paginação. O checklist global mantém 22/32 (68,75%).

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

## Compatibilidade e retenção de recursos — correcção final

O ensaio de eliminação de uma formação ligada a um plano reproduziu um erro 500. A referência deve ser preservada, mas o erro deve ser operacional. Um helper comum traduz exclusivamente as violações FK das actividades de plano/versões de requisitos para `409 competencies.errors.learningResourceInUse`, depois do rollback. Não intercepta erros de autorização ou outras causas. Cursos/percursos referidos pelo histórico não são eliminados fisicamente; a política de arquivo/retirada deve ser acordada.

Red: um caso falhou (500 em vez de 409), 19,172 s. Green específico: 1 passou, 11 casos não seleccionados, 24,749 s. Regressão final: **20 passaram em três suites, 121,718 s**, incluindo os 12 cenários de competências e oito de eliminação normal/protegida de cursos/percursos. Os outros 180 casos dessas suites ficaram fora do filtro; não foram executados. O novo cenário confirma referências reais a curso/percurso, retenção após retirar uma recomendação da versão corrente, rollback integral de lote com recurso protegido e eliminação normal de curso não referenciado.

Regressões web preservadas: **31/31**, seis ficheiros, 4,51 s (fila, sessão, texto/armazenamento offline, Auto HLS e localização/formatação). Validador de traduções: cinco testes Node, 60,57 ms. Cobertura final do catálogo: **6.202/6.202 chaves**, 57 invariantes técnicos, 6.145 valores distintos do inglês, zero omissões/erros de placeholders. Estas métricas são estruturais e de validação automática; a revisão linguística humana integral não foi medida. As datas do perfil/histórico reutilizam o formatador localizado existente.

## Demonstração reproduzível

1. `source scripts/sprints/omatapalo/environment.sh`, com os quatro serviços isolados existentes activos.
2. Compilar API (`sprint_pnpm --filter api build`) e iniciar (`sprint_pnpm --filter api start:prod`). Aguardar a mensagem de arranque concluído antes de gerar o cliente ou verificar migrações.
3. Após alterações de contrato, `sprint_pnpm generate:client`. Build web: `NODE_OPTIONS=--max-old-space-size=4096 sprint_pnpm --filter web exec remix vite:build --config ../../scripts/sprints/omatapalo/vite-low-memory.config.mts`.
4. Preview: `node scripts/sprints/omatapalo/serve-preview.mjs` (não iniciar outra instância se a porta já estiver ocupada pelo preview do sprint). Aplicação: http://localhost:5173 ; percurso: http://localhost:5173/competencies . Conta administrativa exclusivamente fictícia já preparada no ambiente local.
5. QA de três papéis: `sprint_pnpm --filter api exec tsx --tsconfig ../web/tsconfig.json ../../scripts/sprints/omatapalo/browser-enterprise-competencies.mts`. O script cria um novo cenário fictício, mantém-no para demonstração e não utiliza registo público nem credenciais existentes de colaboradores. Os seus resultados/capturas ficam em `.local/sprint/`.
6. Administrador cria framework/escala/competência; colaborador cria plano a partir da lacuna e solicita aprovação; gestor aprova; colaborador declara actividade e apresenta evidência; gestor usa a fila de pendências, revê, avalia formalmente e conclui. O colaborador consulta seis decisões. O administrador acrescenta função de segurança em Huíla com nível 3, observa nível 2 insuficiente e termina a atribuição, preservando-a. Os colaboradores fictícios anteriores em Luanda/Huíla/Benguela continuam presentes.

Testes de domínio e API acima têm comandos reprodutíveis. O benchmark de 500 colaboradores é parte de `competencies.e2e-spec.ts`, executado apenas através do guard `test-api-e2e.sh`; não cria 500 contas na base principal da demonstração.

## Integração futura com Primavera — contrato a acordar, não implementado

| Origem de RH | Destino/cuidado |
|---|---|
| Empresa/base ERP | Tenant definido pela configuração autenticada do adapter; nunca aceite livremente do payload. |
| Identificador estável do colaborador | Exige mapa persistente `(tenant, origem, employeeExternalId) → userId`. O modelo actual de utilizador não fornece esse vínculo RH; o email não deve ser a chave imutável. |
| Identificador da atribuição profissional | `externalHrId`, único no tenant; corresponde à atribuição, não substitui o identificador do colaborador. |
| Cargo/código da função | Mapeamento explícito para função Mentingo, sem criar duplicados por variações de texto. |
| Unidade/província/local | Mapear identificadores externos para grupos/unidades acordados; não inferir uma hierarquia RH a partir de nomes de grupos de aprendizagem. |
| Chefia | Resolver colaborador/gestor. Só estabelecer âmbito após verificar permissões; um cargo no ERP não confere automaticamente autoridade de avaliação. |
| Início/fim/situação | Aplicar vigência e terminar atribuições, preservando anteriores. Cancelamento de futuras atribuições e alterações de uma mesma atribuição externa exigem contrato e API de reconciliação adicionais. |

Confirmar versão Primavera, API/módulos autorizados e semântica dos identificadores. O CRUD entregue suporta criação idempotente/término, mas ainda não fornece sincronização incremental, reconciliação de alterações, recibos de importação ou credenciais para ERP. Um conector de produção deve ter permissão própria limitada, sem acesso administrativo de avaliação, e reutilizar BullMQ para comandos com retry e outbox para eventos duráveis. Guardar credenciais no servidor, reconciliar contagens/IDs e reportar rejeições; não desactivar pessoas por ausência numa extracção parcial. Nenhuma chamada real a Primavera foi efectuada.

## Gate e esforço restante

| Área | Estado verificável | Próxima condição |
|---|---|---|
| Competências | Percurso empresarial mínimo funcional, incluindo RLS e três papéis | Aprovar semântica de níveis, autoridade e políticas de revisão/retirada com RH; completar ciclo administrativo acordado |
| Offline | Regressões de armazenamento/fila/sessão passaram; Chrome anterior preservado | Android físico e política de dispositivos continuam pendentes |
| SCORM | Sem alteração nesta evolução | Pacote independente/SCORM 2004/xAPI/LRS não demonstrados por estes testes |
| Certificados | Implementação anterior preservada, sem atribuição automática de proficiência | Matriz pública/revogação e operação continuam a exigir validação própria |
| Tenants | Novas operações com autorização e RLS reais | Revisão de segurança global e análise da resposta 401 esporádica anterior; não foi declarada resolvida |
| pt-AO | Catálogo estrutural completo, percursos novos em pt-AO | Revisão humana e canais complementares |
| ERP | Apenas desenho do contrato | Acesso autorizado/API concreta, identificadores e permissão de sincronização |
| Produção | Não demonstrada | 20/50/100 sessões concorrentes, restauro, observabilidade, RPO/RTO/SLAs e migração do cliente |

Estimativa provisória para **preparar um piloto governado deste módulo**, por um engenheiro experiente assistido por Codex, sem multiplicador de IA:

| Trabalho restante | Optimista | Provável | Conservador | Dependência |
|---|---:|---:|---:|---|
| Validar regras, níveis, evidências, validade e autoridade; documentar decisões | 4 h | 8 h | 16 h | Disponibilidade de RH/gestores |
| Completar administração acordada (revisão de definições de planos, classificação do catálogo anterior, arquivo/retirada) | 8 h | 16 h | 32 h | Regras de alteração e retenção aprovadas |
| Revisão de autorização, concorrência e casos de histórico; repetição de QA com utilizadores | 8 h | 16 h | 32 h | Revisor e cenários representativos |
| Repetição do piloto, documentação/transferência e correcções observadas | 4 h | 8 h | 16 h | Ambiente e avaliadores de aceitação |
| **Total deste âmbito** | **24 h** | **48 h** | **96 h** | **3/6/12 dias assumindo 8 h/dia** |

Estas são estimativas de trabalho humano futuro, não tempo medido. Excluem suite RH completa, achievement paths genéricos, BI, ERP real, operação de produção e migração Totara. A execução demonstrou viabilidade de fatias locais, não uma taxa universal de produtividade; integrações/produção têm incerteza maior. Não foram introduzidos dependências pagas, outro backend ou serviço externo. Custos monetários de operação não foram medidos; permanecem dependentes do alojamento, vídeo, AI, backups, observabilidade e pessoal do cenário anterior. O histórico aumenta retenção/armazenamento e exige uma política antes de produção.

O risco de fork concentra-se no schema/migrações centrais, permissões, contratos gerados e interfaces. Mitigação entregue: alterações locais, commits delimitados, migrações Drizzle, cálculo de lacunas central e testes reprodutíveis. Cada actualização upstream precisa de rebase/revisão e dessas verificações; não foi medida uma taxa mensal de manutenção.

## Fecho verificável e medição de tempo

Commits locais anteriores deste trabalho: `57a73c8e` (semântica/histórico), `7fc2bbfd` (frameworks/planos/UI), `dc915432` (funções simultâneas/paginação). A correcção final de retenção, datas e relatório fica no commit que contém esta secção. Base `4e187000`; branch `feat/omatapalo-enterprise-competencies-20261018`. Checkout original continua em `7a23e967`, sem alterações tracked/staged, preservando `docs/audits/` já não versionado. Não houve push, merge ou deployment.

Checkpoint observado de aceitação: **18/10/2026 15:43:08 UTC (16:43:08 em Luanda)**. Desde o início às 11:11:17 UTC decorreram **4 h 31 min 51 s de calendário**. Inclui esperas de ferramentas/aprovação, intervalos sem actividade continuamente medida, diagnóstico, builds, QA e documentação. Existem observações intermédias às 12:37:48 e 14:11:02 UTC; não se interpreta o intervalo entre observações como programação activa. Não foi recolhido um cronómetro exclusivo por funcionalidade e não se inventam horas/pessoa realizadas a partir deste total. Os tempos automatizados por etapa estão acima e nos logs identificados.

Na aceitação final, API compilada/reiniciada e preview operacional; pedido anónimo a competências devolve 401. **Chrome: 7/7 em 24,626 s**, com os builds finais. As capturas foram inspeccionadas e a página também foi observada pelo Chrome DevTools MCP. A última compilação API/web e os typechecks terminaram sem erros; permanecem avisos de source maps/Tailwind/Sentry já observados no baseline, sem publicação de release.

Última repetição do ensaio HTTP de 500 colaboradores (uma competência por colaborador, 100 avaliações correntes): mínimo **75,68 ms**, máximo **105,31 ms**, média **87,89 ms** em cinco páginas sequenciais. O checkpoint anterior, registado acima, teve média 84,29 ms. Não se extrapolam estes valores para mais competências, vídeo, AI ou sessões concorrentes.

Microbenchmark adicional **só de CPU em memória**, separado do ensaio HTTP/PostgreSQL: 500 colaboradores × 20 competências, 30.000 evidências, 10.000 linhas de matriz, três aquecimentos e dez medições; mediana **8,62 ms**, intervalo **6,14–9,83 ms**. Não mede permissões, rede, SQL, renderização ou capacidade de produção. Script `benchmark-competency-gaps.mts` e resultado `.local/sprint/enterprise-final-domain-benchmark.json`.

### Evidência de implementação para revisão

- `apps/api/src/competencies/competency-gaps.ts`: estado profissional corrente e agregação de requisitos; `competency-requirement-versions.ts`: vigência/precedência das versões.
- `apps/api/src/competencies/competencies.repository.ts`: locks, idempotência, histórico, funções e consultas correntes; `competencies.service.ts`: autorização e validação de referências.
- `apps/api/src/competencies/development-plan-transitions.ts` e `development-plans.repository.ts`: estados, actividades, decisão final e histórico transaccional.
- `apps/api/src/competencies/__tests__/competencies.e2e-spec.ts`: 12 cenários com PostgreSQL/RLS e volume.
- `apps/web/app/modules/Competencies/`: quatro painéis/formulários repo-native e página de equipa/perfil. `scripts/sprints/omatapalo/browser-enterprise-competencies.mts`: QA dos três papéis, sem mocks do comportamento.

**Próxima acção executável:** rever a demonstração com RH/gestores da Omatapalo e aprovar as regras/limites do piloto. Para continuar engenharia local, partir deste branch e dos comandos deste relatório; implementar as alterações administrativas acordadas e repetir o mesmo conjunto de testes. Não iniciar integração real, migração de dados do cliente ou produção a partir desta demonstração sem o respectivo âmbito autorizado.
