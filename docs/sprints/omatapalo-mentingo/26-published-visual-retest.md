# Reensaio visual após a correcção de disponibilidade

20/10/2026. URL: https://omatapalo.uturh.ao. **Disponibilidade aprovada nos percursos ensaiados; o P0 de disponibilidade do relatório 25 não se reproduziu.** Demonstração completa com gestores continua condicionada à preparação das contas e dos dados. Este ensaio não certifica produção, SLA ou segurança global.

## Release e método

Commit observado: `7be2da76`. Railway confirmou SUCCESS na mesma referência para Web (`086876a4-fe02-4a32-859c-34be987fd568`), API (`ca181e86-21e2-499e-b26d-35e533ae0d62`) e Migrator (`5496e7fb-9439-45f3-b6d3-22d9e09b5e0f`). Sem novo deployment durante a ronda principal observada. A alteração do proxy resolve a API em tempo de pedido (`deployment/railway/default.conf.template`), em vez de conservar apenas a resolução do arranque.

Chrome real via Playwright, sessões isoladas, gate HTTP e quatro contas fictícias. Desktop 1440×1000 e viewport móvel 390×844, pt-AO/Africa-Luanda. Android físico não foi testado. Os percursos usam a interface publicada; não se executaram seeds, submissões de avaliação, emissão ou renovação de certificados, nem alteração de palavras-passe.

| Intervalo medido UTC | Duração | Resultado |
|---|---|---|
| 2026-10-20T12:21:45.409Z–2026-10-20T12:24:47.763Z | 182.354 s | Navegação dos perfis e captura de 24 ecrãs; 23 válidos para o âmbito |
| 2026-10-20T12:39:17.470Z–2026-10-20T12:41:05.260Z | 107.79 s | Certificado, PDF, catálogo/curso/histórico/perfil em móvel: seis capturas válidas |

Tempos são intervalos automatizados, não horas exclusivas de trabalho. Artefactos privados: `.local/qa/20261020-retest/report.json`, `certificate-ui-report.json`, textos/capturas e PDF. Credenciais temporárias foram retiradas no fecho.

## Resultados

| Percurso | Estado real | Evidência |
|---|---|---|
| Login desktop/móvel | pt-AO, aviso demo, campos legíveis, sem imagens quebradas ou overflow global | [Móvel](../../../.local/qa/20261020-retest/screenshots/02-login-mobile.png) |
| Painel do formando | Widgets carregados: 2/2 formações, 100%, dois certificados. Sem carregamento permanente anterior | [Desktop](../../../.local/qa/20261020-retest/screenshots/student-landing.png), [móvel](../../../.local/qa/20261020-retest/screenshots/student-dashboard-mobile.png) |
| Catálogo e detalhe | Duas formações fictícias apresentadas; detalhe e conclusão carregam | [Catálogo](../../../.local/qa/20261020-retest/screenshots/student-courses.png), [curso móvel](../../../.local/qa/20261020-retest/screenshots/student-course-detail-mobile.png) |
| Competências | Matriz e perfil carregam para administrador/formando. Formulários disponíveis, catálogo/requisitos/planos ainda sem amostra empresarial | [Perfil](../../../.local/qa/20261020-retest/screenshots/student-competencies-tab-1.png), [móvel](../../../.local/qa/20261020-retest/screenshots/student-competencies-mobile.png) |
| Relatórios do administrador | Mostram 1 formando, 2 formações, taxa de conclusão 100% e 2 certificados; coerente com a amostra | [Relatório](../../../.local/qa/20261020-retest/screenshots/admin-reports.png) |
| Gestão de cursos e identidade | Carregam em pt-AO; definições consultadas sem alterações | [Cursos](../../../.local/qa/20261020-retest/screenshots/admin-admin-courses.png), [identidade](../../../.local/qa/20261020-retest/screenshots/admin-provider-information.png) |
| Gestor operacional e gestor de formação | Credenciais aceites e primeira troca de palavra-passe exigida. É uma regra de segurança esperada, mas impede demonstrar os respectivos percursos enquanto não for concluída | [Gestor](../../../.local/qa/20261020-retest/screenshots/group_manager-landing.png) |
| Certificado pela interface | Modal abre em desktop/móvel, com emissor e marca de demonstração; PDF existente descarregado pela UI | [Desktop](../../../.local/qa/20261020-retest/screenshots/student-certificate-desktop.png), [móvel](../../../.local/qa/20261020-retest/screenshots/student-certificate-mobile.png) |
| Histórico de formação e perfil | Rota correcta do perfil e histórico abrem em móvel; ciclo 1 válido, avaliação 100%, datas visíveis | [Histórico](../../../.local/qa/20261020-retest/screenshots/student-certificate-history-mobile.png), [perfil](../../../.local/qa/20261020-retest/screenshots/student-profile-mobile-correct-route.png) |

**Zero respostas HTTP 5xx** registadas nas duas rondas bem-sucedidas. Respostas 401 iniciais na descoberta da sessão anónima não foram classificadas como defeitos. Não se observaram imagens quebradas nem overflow horizontal global nos ecrãs válidos medidos. Isto não exclui scroll interno de tabelas ou problemas em áreas não ensaiadas.

O PDF descarregado tem 43.289 bytes. Texto e render Poppler inspeccionados: “DEMONSTRAÇÃO — SEM VALIDADE”, emissor Utu Lab, nome fictício, título e data legíveis, sem cortes. Não foi emitida outra credencial. [PDF](../../../.local/qa/20261020-retest/certificate-downloaded-from-ui.pdf), [render](../../../.local/qa/20261020-retest/screenshots/certificate-downloaded-from-ui.png).

## Pendências encontradas

1. **P1 — preparação da demonstração de gestão:** as duas contas de gestores precisam de concluir o primeiro acesso. Não se alterou a palavra-passe nem se simulou um gestor autenticado para ultrapassar a guarda. Matriz e decisões do gestor não ficaram demonstradas nesta ronda.
2. **P1 — cenário de competências incompleto no tenant publicado:** o perfil mostra ausência de requisitos profissionais em vigor e de planos. É falta de configuração/dados demonstrativos observada, não prova de ausência do módulo. Preparar a amostra Luanda/Huíla/Benguela com funções, requisitos, lacunas e planos antes da apresentação integrada.
3. **P2 — moeda inadequada:** a listagem administrativa mostra `0 zł` apesar da interface pt-AO. Rever moeda/configuração e exposição de elementos comerciais num LMS corporativo. Não se activaram pagamentos para testar.
4. **P2 — erros React na consola:** foram registados códigos 418/423/425 repetidos na ronda, embora os ecrãs recuperassem e funcionassem. Não são 135 bugs distintos nem respostas 502. Devem ser diagnosticados; a ausência de 5xx não significa consola limpa.
5. **P3 — apresentação:** login ainda mostra `v0.0.0`; cursos usam imagens-placeholder; o certificado móvel adapta-se à largura mas o conteúdo fica pequeno. Recomenda-se opção de ampliar/PDF para leitura, sem considerar a miniatura prova de acessibilidade completa.

O ecrã de erro com stack técnico e `lang=en` do relatório 25 **não foi deliberadamente provocado nem aprovado como corrigido**; a disponibilidade restabelecida evita esse percurso normal, mas a política de apresentação de erros continua por rever.

## Precisão do ensaio e limites

Uma captura exploratória de `/profile` foi descartada: a rota real exige `/profile/:id`, posteriormente ensaiada com sucesso. A primeira tentativa de abrir certificado clicou no botão de ajuda do widget; o selector foi corrigido para a credencial e o fluxo foi repetido com sucesso. Estes dois erros do harness não foram classificados como defeitos do produto. Capturas dessas tentativas não contam nos 29 ecrãs válidos descritos acima.

Não foram testados envio de email real, LinkedIn externo, upload/TUS, renovação/revogação, SCORM no player, avaliações/offline, Android físico, carga ou backup/restauro nesta repetição. Não se inferem esses resultados a partir da navegação saudável. A rota de percursos redireccionou o formando para o painel; não se declarou o fluxo de percursos demonstrado.

**Decisão: GO para a disponibilidade e demonstração guiada de administrador/formando no âmbito observado; CONDITIONAL GO para a apresentação empresarial integrada**, dependente das contas de gestores, dados de competências e gates pendentes já registados. Produção continua sem validação completa. O checklist original de 32 critérios não foi alterado.

Não houve alterações de código/configuração, mudança de credenciais, push, commit, restart ou deployment nesta sessão. Apenas este relatório e a nota de reensaio no relatório 25; ficheiros de QA permanecem ignorados.
