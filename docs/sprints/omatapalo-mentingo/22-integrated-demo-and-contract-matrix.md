# Demonstração integrada e requisitos contratuais — 19/10/2026

Estado final: **27/32 critérios técnicos = 84,375%**; denominador preservado. Demonstração integrada executada com nove checkpoints Chrome, três papéis reais e dados exclusivamente fictícios. Recertificação de percursos: API/PostgreSQL/RLS com 18 testes aprovados; repetição final do navegador aprovada. Os resultados finais estão no checkpoint de fecho abaixo. **CONDITIONAL GO para piloto delimitado; NO-GO para produção**.

Branch: `feat/omatapalo-enterprise-competencies-20261018`, base `c5e58a0f`. Primeiro commit desta entrega: `668e42b0` (demo/títulos); `e5ed0173` (lifecycle de percursos), correcções e evidências seguintes no histórico. Checkout original `main` preservado; sem push, merge, produção ou dados reais.

## Demonstração: um colaborador, uma cadeia verificável

O cenário aplica apenas um colaborador activo da origem `synthetic-primavera-mock`, Bento fictício da Huíla, e mapeia a chefia/unidade/função para as APIs nativas. O adapter permanece `dry-run`, `applied:false`: **o aplicador desta demo é um guião local, não um conector Primavera nem uma sincronização persistente**. Códigos externos e mapeamentos ficam no manifesto; não existe garantia de identidade RH global entre execuções da fixture.

«SIMULAÇÃO» aparece no nome do colaborador/unidade, framework e formação. O conteúdo identifica dados fictícios e operações em Luanda, Huíla e Benguela. Não se apresenta esta lição curta como curso de segurança aprovado pelo cliente.

| Passo | Actor e execução | Resultado verificado |
|---|---|---|
| Origem e inscrição RH | Guião, adapter sintético e APIs nativas | Reconciliação sem erros, uma conta e atribuição profissional com identificador externo explicitamente simulado; unidade e gestor associados |
| Framework e competência | Administrador, Chrome | Framework, escala ordenada e competência de utilização de EPI criados na interface |
| Requisito e função | Administrador, APIs nativas | Nível mínimo 2 obrigatório, formação recomendada e função/unidade atribuídas |
| Lacuna | Formando, Chrome/API | Estado `missing` antes da formação e da avaliação profissional |
| Plano individual | Formando e gestor, Chrome | Plano com formação associada, prazo, pedido e aprovação pelo gestor da equipa |
| Formação e avaliação | Formando, Chrome | Texto, pergunta nativa, submissão com nota 100, conclusão e um certificado automático |
| Separação profissional | API nativa, após quiz | A lacuna continua `missing`: a nota não atribuiu proficiência |
| Evidência e decisão | Formando e gestor, Chrome | Evidência apresentada, revista/aceite; avaliação formal separada, nível 2 e fundamentação; plano concluído |
| Histórico e relatório | Três papéis, Chrome/API | Seis alterações no histórico do plano; lacuna `met`; relatório nativo e seis CSV conciliados com conclusão/certificado/avaliação |

A preparação de contas, inscrição, função e requisito usa factories/APIs nativas. A criação de framework/catálogo, plano, aprovações, evidência, avaliação, navegação e quiz usam a interface. Não foram simuladas respostas HTTP. O relatório e o dataset usam a autorização e os dados reais do LMS local; a extracção é manual e não atómica. Cada execução guarda um manifesto próprio em `.local/sprint/integrated-demo-<sufixo>/`.

O QA detectou o ID técnico do curso no plano do gestor. A API passa a devolver apenas os títulos recomendados na matriz dos colaboradores autorizados, sem expor o catálogo completo. Um teste vermelho reproduziu a ausência; **13 testes de competências/RLS passaram** após a correcção, incluindo utilizador sem requisito e recusa fora da equipa. Não é uma nova funcionalidade de RH.

## Certificados de percursos: âmbito fechado nesta fatia

A revogação exige motivo, responsável e data, conserva a credencial e recusa a sua consulta como actual, download e verificação pública. O histórico autenticado permite próprio formando, administrador autorizado e gestor de equipa dentro do seu âmbito. A gestão continua reservada a quem possui simultaneamente gestão global de percursos e de colaboradores.

A recertificação exige que todas as formações actualmente requeridas tenham novas conclusões, posteriores à emissão anterior e, quando existe snapshot, em ciclos superiores. Cria outro ID, referência à credencial anterior, motivo e snapshot de cursos/ciclos/datas. Cinco pedidos concorrentes devolvem uma única substituição. Não reactiva a credencial antiga nem apaga respostas. Não repõe progresso de cursos partilhados: a repetição é iniciada pelo fluxo nativo do curso, com âmbito explícito.

A migration **0236**, gerada pelo Drizzle, é aditiva. A tabela local de percursos tinha zero credenciais antes/depois da aplicação, com fingerprint igual; dados não vazios e concorrência foram exercitados em PostgreSQL de teste. Registos legados recebem snapshot vazio: datas anteriores são preservadas, sem reconstrução fictícia de ciclos/conteúdos. Estado inactivo permanece `expired`, complementado por campos explícitos de revogação. As APIs preservam os snapshots de emissão; não é arquivo inviolável contra administradores da base ou políticas de eliminação.

A primeira versão do novo teste falhou por representação textual da mesma data PostgreSQL; a comparação passou a usar o instante. Outra detectou resposta vazia em vez do JSON `null` declarado: a resposta foi corrigida e testada. Uma revisão do guião de navegador encontrou falta de permissão nativa para o gestor consultar histórico; a leitura foi autorizada por resultados da equipa, com teste negativo fora dela. Não se alargaram as permissões de revogação/renovação.

Comandos administrativos de percursos são exercitados por API; **não foi criado um ecrã dedicado de gestão/renovação do histórico de percursos**. Recorrência e avisos de renovação não foram acrescentados. SCORM 1.2 online não equivale a SCORM offline, 2004 ou xAPI.

## Matriz B — requisitos contratuais Omatapalo, a–j

Esta matriz é distinta do checklist técnico. Estados podem coexistir dentro de um grupo: **Nativo**, **Implementado e testado**, **Simulado**, **Parcial**, **Bloqueado**, **Não implementado**. Não se transformam os 27 critérios técnicos demonstrados em percentagem de cumprimento do contrato.

| Grupo | Estado por capacidade | Evidência e falta para aceitação contratual |
|---|---|---|
| a — Relatórios e dashboards | **Nativo / Implementado e testado / Parcial** | Painéis/relatórios nativos, consultas autorizadas, exportação e carga por endpoint. Falta acordar e demonstrar o report builder, dimensões RH/província/chefia, histórico, agendamento e dashboards exactos do cliente. Relatórios 18/23. |
| b — Competências | **Implementado e testado / Parcial** | Frameworks/escalas, requisitos versionados, atribuições, evidências/decisões separadas, planos e matriz; cadeia integrada observada. Faltam governação RH, revisão das políticas e aceitação de gestores autorizados. Relatórios 16/17 e esta execução. |
| c — Aplicação móvel offline | **Implementado e testado no Chrome / Parcial / Bloqueado no Android** | Texto/PDF e quiz nativo com fila, retry e recuperação; kit físico com dez casos preparado. Sem execução Android, quota real ou SCORM offline. Não é equivalente a uma app móvel empresarial integral. |
| d — Primavera | **Simulado / Bloqueado / Conector real não implementado** | Contrato/reconciliação sintéticos e aplicação de uma fixture pelas APIs locais. Sem versão/API/licença/credenciais autorizadas, fila persistente, reconciliação em produção ou prova de dados ERP reais. |
| e — Power BI | **Implementado e testado / Parcial / Serviço não implementado** | Seis CSV relacionados e autorizados com inscrições, conclusões, progresso, certificados de cursos e competências. Não inclui automaticamente todo o novo histórico de certificados de percursos; sem gateway, refresh incremental/agendado ou ligação ao serviço BI. |
| f — Certificados | **Nativo / Implementado e testado / Parcial** | Cursos com emissão/ciclos/histórico/revogação; percursos com snapshot, revogação e recertificação explícita. Configuração nativa de identidade visual; demonstração usa marca de laboratório, sem assinatura aprovada do cliente. Falta UX administrativa de percursos, recorrência/avisos acordados e política de retenção. |
| g — Microsoft Teams | **Não implementado / Bloqueado** | Não se confunde SSO Microsoft com reuniões, calendário ou presenças. Sem acesso/consentimento Graph e contrato funcional; nenhum ensaio real. |
| h — LinkedIn | **Nativo parcial / Bloqueado no serviço externo** | Link de partilha e verificação pública; sem execução numa conta LinkedIn, validação de emissor ou demonstração completa de Add to Profile. Não se declara integração externa concluída. |
| i — Vídeo em rede fraca | **Implementado e testado / Parcial** | HLS Auto, 144p/360p, banda/latência/bytes/rebuffering e recuperação explícita medidos; repetição de vídeo separada de HTTP. Conteúdo sintético sem áudio, aplicação aquecida e loopback. Faltam pipeline privado/CDN, conteúdos reais, arranque frio, telemóvel e concorrência de streaming. |
| j — Autoria, standards e blended | **Nativo / Implementado e testado / Parcial** | Editor nativo, texto e avaliações; SCORM 1.2 independente online demonstrado em execução anterior, importação/exportação separadas. Sem prova contratual de xAPI/LRS/SCORM 2004/H5P offline ou do fluxo completo presencial/blended/presenças. Conteúdos profissionais precisam de produção própria. |

A referência Totara/Moodle permanece a comparação documental do [relatório 20](20-options-tco-and-decision.md), com versões/fontes datadas. Só Mentingo foi executado nesta sprint. Não se pressupõem funcionalidades utilizadas na antiga instalação do cliente nem paridade total.

## Evidências e reprodução

Aplicação: **http://localhost:5173**. Usar sessões distintas e apenas as contas fictícias do manifesto `.local/sprint/integrated-demo.json`; administrador local conforme relatório 19. Os guiões conservam fixtures novas para apresentação, sem repor progresso de cursos antigos. O guião de recertificação recusa uma demo com mais de 30 minutos: executar primeiro a preparação integrada novamente.

```sh
source scripts/sprints/omatapalo/environment.sh
sprint_pnpm --filter api exec tsx --tsconfig ../web/tsconfig.json ../../scripts/sprints/omatapalo/browser-integrated-demo.mts
sprint_pnpm --filter api exec tsx --tsconfig ../web/tsconfig.json ../../scripts/sprints/omatapalo/browser-path-recertification.mts
```

A recertificação de curso é limitada ao colaborador/curso acabados de criar. Os guiões mantêm o adapter identificado como simulação. Erros Axios são reduzidos a mensagens, sem imprimir cookies; um erro anterior do guião deixou um log bruto com tokens exclusivamente fictícios, depois redigido localmente. Logs/capturas não são incluídos no Git.

Capturas locais finais:

![Avaliação nativa concluída, com simulação identificada](../../../.local/sprint/screenshots/22-integrated-course-completed.png)

![Plano e decisão profissional do gestor](../../../.local/sprint/screenshots/22-integrated-manager.png)

![Relatório nativo carregado](../../../.local/sprint/screenshots/22-integrated-reports.png)

As capturas foram recolhidas com Chrome real/Playwright. Os resultados do guião e a conciliação API sustentam a submissão, que uma imagem isolada não demonstra. A revisão visual por Codex/LLM não equivale a revisão linguística humana ou auditoria WCAG integral.

## Demonstração, piloto e produção

- **Demonstração comercial:** cadeia integrada fictícia observada; preparar composição da marca, guião comercial, conteúdo pedagógico revisto e ensaio do apresentador. Identificar sempre simulação, CSV manual e limites offline.
- **Piloto com utilizadores autorizados:** exige aprovação de âmbito, papéis, RH/privacidade/retenção, formação dos responsáveis, apoio e plano de saída. Enquanto Android não for aceite, excluir utilização operacional dependente de offline. Nenhum utilizador real foi integrado nesta execução.
- **Produção:** NO-GO até fechar dispositivo/quota, conectores reais acordados, migração reconciliada, revisão linguística, segurança global, cópia externa e perda do host, SLO/RPO/RTO e suporte. Os testes locais não constituem SLA.

Caminho crítico: validar políticas e âmbito → disponibilizar Android e APIs/exportações autorizadas → ensaiar offline/migração/integrações → validar operação numa infra-estrutura de piloto → aceitar piloto e só depois produção. A disponibilidade externa não é tempo de engenharia medido.

Estimativa revista O/P/C, dias-pessoa de oito horas, sem multiplicador de IA: preparação comercial **0,5/1/3**; piloto online delimitado **4/8/15**; UX/avisos restantes de certificados de percursos **1/3/6**; Android **1/3/6**, dependente de equipamento. O backend de percursos, o cenário integrado e o arranque da cópia restaurada já foram executados, reduzindo esse trabalho específico; não resolvem integração e governação. Mantém-se o envelope provisório de produção **35/70/140** do relatório 20, por incerteza de ERP/migração/operação. Fatias sobrepostas não devem ser somadas duas vezes. Custos TCO continuam hipóteses, sem novas cotações.

## Checkpoint funcional final

Demo integrada: **9/9**, 18.266 s no manifesto; recertificação: **3/3**, 11.090 s. Dois ciclos/tentativas nativos e duas credenciais de percurso conservados; a anterior revogada deixa de validar e a substituta valida. O gestor autorizado consulta as duas, sem poder revogar. Capturas de ciclos e credencial abaixo.

![Dois ciclos nativos conservados](../../../.local/sprint/screenshots/22-path-course-cycles.png)

![Credencial de percurso substituta](../../../.local/sprint/screenshots/22-path-public-renewed.png)

### Acesso local da fixture final

Só dados fictícios, sem contas reais; estas palavras-passe são fixas de laboratório e não podem ser reutilizadas em produção.

| Papel | Conta | Palavra-passe local |
|---|---|---|
| Administrador | admin+localhost@example.com | password |
| Gestor operacional | enterprise-manager-f0ed84e2@example.com | Password123@ |
| Formando | enterprise-employee-f0ed84e2@example.com | Password123@ |

Formação: http://localhost:5173/course/d8d8004c-b132-4e2a-94bb-be9d0fc83fe7. Competências: http://localhost:5173/competencies. O formando já terminou dois ciclos: consultar o histórico; para repetir do início, criar outra fixture, preservando esta. Percursos foram activados através da definição nativa apenas no ambiente local.

## Validação final e limites

Código consolidado: `668e42b0`, `e5ed0173`, `975eba93`, `e0687c70`. Passaram 13 testes de competências, 18 de certificados de percursos/RLS, 10 SCORM/S3, 72 web offline/vídeo/idioma, cinco de validação de traduções, 30 de layout/interpolação e 56 de pt-AO/segurança de emails. Builds API/web, typecheck web e lint dirigido passaram; permanece um aviso de console no benchmark. Swagger e cliente foram regenerados pelos scripts, sem edição manual. Não se repetiram todos os testes históricos do monorepo.

A referência final HTTP tem commit e fonte limpos: p95 **0,640/0,834/1,563 s** a 20/50/100 sessões, 1.638 pedidos sem erros, sem build concorrente. É uma prova curta no mesmo Mac, sem extrapolação para streaming/IA. Foram restaurados 411 objectos e 12 tabelas; a API restaurada autenticou por palavra-passe, conservou duas credenciais de percurso e recuperou ficheiro privado/PDF. O [relatório 23](23-performance-recovery-and-validation.md) contém métricas completas, falhas preservadas, RPO/RTO propostos e limites.

Os cinco critérios ainda abertos são: experiência linguística integral/humana em todos os canais; SCORM no navegador/Android incluindo a parcela física ainda pendente; Android/quota reais para conteúdos; carga com streaming/IA separados no âmbito completo; operação/segurança integral. Kit preparado não equivale a ensaio, e os dez grupos contratuais continuam a ter lacunas próprias.

## Índice de evidências de código

| Comportamento | Fonte e intervalo de linhas |
|---|---|
| Títulos de cursos apenas no âmbito da matriz autorizada | `apps/api/src/competencies/competencies.repository.ts:67–101`; `competencies.service.ts:192–204` |
| Permissões e histórico de percursos | `apps/api/src/learning-path/services/learning-path-certificate-lifecycle.service.ts:34–62`; `controllers/learning-path-certificate.controller.ts:49–149` |
| Revogação/recertificação, snapshots e transacções | `apps/api/src/learning-path/services/learning-path-certificate-lifecycle.service.ts:64–230` |
| Alteração aditiva de persistência | `apps/api/src/storage/migrations/0236_learning_path_certificate_lifecycle.sql:1–20` |
| Demonstração integrada dos três papéis | `scripts/sprints/omatapalo/browser-integrated-demo.mts:1–537` |
| Repetição real de curso e credenciais de percurso | `scripts/sprints/omatapalo/browser-path-recertification.mts:1–212` |
| Carga instrumentada | `apps/api/src/competencies/__tests__/enterprise-load.e2e-spec.ts`; `enterprise-load-observability.ts:1–149` |

Antes de produção continuam também por validar as referências comerciais, capacidade de produção de cursos, exportações/migração do LMS anterior, alojamento/apoio/SLA, documentação/IP e condições comerciais exigidas na contratação. Código funcional e MIT não substituem estes requisitos de aquisição.
