# Decisão da sprint — checkpoint de 18-10-2026

**Actualização empresarial:** mantém-se CONDITIONAL GO para piloto e 22/32 (68,75%), sem GO para produção. [Execução e evidências actuais](16-enterprise-competencies.md); [comparação delimitada com Totara](17-competency-totara-parity.md). Os números/código abaixo correspondem ao checkpoint anterior.


**CONDITIONAL GO para continuar a validação; sem GO para substituir Totara em produção.** O Mentingo já sustenta uma demonstração técnica local com competências, catálogo pt-AO completo estruturalmente, avaliações offline recuperáveis e SCORM 1.2 no Chrome. Faltam provas críticas em dispositivo, interoperabilidade independente, integração empresarial e operação.

Estado: **22/32 critérios = 68,75%**, preservando os 32 critérios do [checklist](11-sprint-progress.md). Esta percentagem não mede conclusão do contrato, esforço restante ou prontidão para produção. Código desta entrega: `ca797c72`, `067407d1`, `848677e0`, `94f14739`, `b414f7ba`, `906c9398`, `30ff88f2`. O [relatório de execução](14-next-execution.md) contém testes, falhas corrigidas, tempos observados, estimativas e dependências. A [galeria de QA](15-next-visual-qa.md) contém capturas reais revistas.

## O que mudou na decisão

A gestão de competências deixou de ser uma lacuna sem implementação: há catálogo, níveis, requisitos por função/unidade, evidência profissional explícita, perfil e matriz. Seis testes API/RLS, oito de domínio e cinco checkpoints Chrome passaram. A recuperação de avaliações conserva respostas em 401/409 e permite retry/arquivo/nova tentativa; dois percursos Chrome de seis checkpoints passaram no build final. A tradução chegou a 6.099 chaves, com zero omissões e revisão linguística humana ainda por fazer.

O QA descobriu problemas de encaminhamento que a execução API não mostrava. Depois das correcções TUS/conteúdo na mesma origem, o Chrome importou e executou o pacote SCORM, retomou o progresso e confirmou a conclusão nativa. O modo Auto HLS passou a permitir variantes abaixo de 720p, coberto por regressões. Nenhuma destas provas valida SCORM de todos os fornecedores, vídeo em rede móvel ou uma operação de produção.

## Gates de adopção

| Gate                  | Decisão actual                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| Offline fiável        | Chrome demonstrado; Android físico, quotas e política de dispositivos pendentes                       |
| Competências          | MVP funcional; hardening, paginação e gestor na UI pendentes                                          |
| SCORM/xAPI            | SCORM 1.2 sintético API/Chrome; pacote independente, Android, 2004/xAPI não demonstrados              |
| Certificações         | Histórico/ciclos preservados nos testes anteriores; matriz pública/revogação e histórico UI pendentes |
| Isolamento de tenants | RLS/âmbitos nas novas fatias testados; segurança global e exportações por validar                     |
| pt-AO                 | 100% estrutural; revisão humana, textos fixos e canais complementares incompletos                     |
| ERP/Microsoft/BI      | Sem integração real; adapter sintético e dataset autorizado ainda por entregar                        |
| Operação              | Sem ensaios 20/50/100, restore, RPO/RTO ou SLA comprovado                                             |

## Viabilidade económica e manutenção

Há evidência de que a Utu Lab consegue acrescentar fatias úteis mantendo Nest/React/Drizzle, o RBAC e o motor LMS existentes. Não foi criado outro backend nem acrescentada dependência. A comparação de custos ainda não é empírica: não há preços de ERP/infra-estrutura/licenças/serviço equivalentes, nem medições recorrentes de operação. Não se promete poupança ou paridade Totara a partir da velocidade deste MVP.

O intervalo e a estimativa revista constam do relatório 14: 21/49/103 dias-pessoa para as fatias restantes delimitadas, com incerteza explícita e exclusões. Não são custos cotados, não usam multiplicador de IA e não incluem toda a migração, produção de cursos, Teams real ou LRS/xAPI. A consulta de competências sem paginação e a responsabilidade por actualizar o fork são riscos concretos.

Moodle/IOMAD foram comparados por documentação primária, sem instalação ou execução nesta máquina. Totara continua a ser referência de funcionalidades publicadas; desconhece-se a configuração anterior do cliente. Não se atribuem falhas do fornecedor/configuração ao produto Totara sem validação.

## Próxima acção

Executar o [guião Android físico](13-android-physical-validation.md), validar gestor/formando na interface e fechar o pacote SCORM independente/matriz de certificados. Em paralelo ao trabalho que não depende do dispositivo, construir o adapter Primavera explicitamente sintético e o dataset analítico com autorização. Só preparar uma proposta de produção depois de ensaios de carga, restore e aceitação dos gates pelo cliente.

Aplicação local: http://localhost:5173 ; competências: http://localhost:5173/competencies . Trabalho anterior preservado e novos módulos consolidados no branch isolado; sem deployment ou dados reais.
