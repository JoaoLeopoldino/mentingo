# Alternativas, custo e decisão — 18/10/2026

Estado: comparação por critérios de aceitação; **só Mentingo foi executado nesta sprint**. Moodle/IOMAD/Totara são referências documentais, não benchmarks feitos nesta máquina. Commit-base `656f4a9c`, primeiro checkpoint novo `9c0a6700`; commits finais no histórico do branch. Nenhum produto alternativo foi instalado nem contactado comercialmente.

## Comparação objectiva

O histórico Totara do cliente é desconhecido: versão, módulos, configuração, conteúdos, parceiro e funcionalidades efectivamente utilizadas requerem validação. As dificuldades do fornecedor anterior não demonstram limitações intrínsecas do Totara.

| Mesmo critério de aceitação | Mentingo: execução desta sprint | Moodle LMS / IOMAD: documentação | Totara: referência publicada |
|---|---|---|---|
| Descarregar, responder sem rede e sincronizar sem perda | Texto/PDF e escolha única em Chrome; Android/quota pendentes; sem SCORM offline | Moodle App documenta actividades/sincronização com restrições; questionários offline têm configuração e critérios próprios. Repetir o guião físico. IOMAD precisa de validação da combinação instalada. | App documenta descarga/sincronização; verificar a ressalva específica de tentativas SCORM e a versão concreta. |
| Competências, evidências, planos e equipa autorizada | Fatia acordada demonstrada em 16/17; decisões independentes das evidências, sem atribuição automática por quiz | Moodle documenta frameworks, planos, evidências e avaliação; não pressupor equivalência de funções RH múltiplas ou âmbito de gestor sem configuração/ensaio. | Learn 19 publica competências e planos; fluxos avançados de atribuições/achievement paths dependem do produto/módulo, incluindo Perform/Skills. Ver matriz 17. |
| Importar/executar/retomar/concluir pacote independente | SCORM 1.2 no Chrome passou; 2004/xAPI/LRS não demonstrados | Validar pacote e versão/plugins concretos; download de SCORM/H5P na app não prova a semântica de todo o conteúdo | Aceitar apenas após teste com a versão, app e pacotes autorizados do cliente |
| Certificado, validade, renovação e histórico | Cursos demonstrados, revogação pública e histórico preservado; percursos ainda parciais | Certificação/renovação empresarial precisa de avaliação da solução e plugins escolhidos; não atribuir tudo ao core Moodle | Learn 19 publica certificações/recertificação; reproduzir política e retenção efectiva do cliente |
| Relatórios e exportação autorizada | Relatórios nativos, 6 CSV BI, testes de âmbito e paginação | Provar o relatório empresarial e o isolamento necessários na instalação seleccionada | Learn 19 publica report builder e relatórios empresariais; não presumir que estavam configurados no cliente |
| Primavera/Teams/BI reais | Sem ERP/Graph/serviço BI real; simulação e CSV explicitamente identificados | Exige discovery de APIs, plugins e contratos de manutenção | Mesma obrigação; não assumir conector disponível na subscrição do cliente |
| pt-AO nos percursos/canais | 6.228 chaves estruturais, amostra visual; revisão humana pendente | Validar pacote linguístico e canais; não copiar traduções de outro projecto sem análise de licença | Validar idioma/template/configuração na versão instalada |
| 20/50/100, restauro e continuidade | HTTP real sem erros; p95 0,92/1,71/3,62 s; DB restaurada; sem vídeo/IA/offsite | Não ensaiados nesta sprint; aplicar o mesmo perfil, conteúdos e SLO | Não ensaiados; solicitar métricas e restauro do parceiro proposto |
| Portabilidade e manutenção | Código MIT e stack TS/React/Nest acessíveis; Utu Lab assume fork, actualizações e operação | Moodle/IOMAD têm ecossistema e código próprios; compatibilidade de plugins/versões e obrigações GPL precisam de gestão | Ecossistema de parceiros/subscrição e responsabilidade contratual a negociar; não confundir dependência do parceiro actual com ausência de alternativas |

Fontes primárias consultadas em 18/10/2026: [Moodle 5.1 — offline](https://docs.moodle.org/501/en/Moodle_app_offline_features), [Moodle 5.1 — competências](https://docs.moodle.org/501/en/Competencies), [código IOMAD e GPL-3.0](https://github.com/iomad/iomad), [Totara Learn 19 — funcionalidades](https://www.totara.com/wp-content/uploads/2025/04/Totara-Functionality-Overview-Learn-Sheet-V19.pdf) e [Totara 20 — offline](https://totara.help/totara-20/docs/mobile-offline-support). A página Moodle offline descreve também limites de planos da app; custos da app devem entrar na proposta efectiva. Não se declara que Moodle LMS core tenha todos os recursos de Moodle Workplace/IOMAD.

Nuance de Totara: a documentação 20 consultada contém uma ressalva de que as tentativas SCORM offline ficam no dispositivo e não são actualmente sincronizadas para o servidor, apesar da descrição geral de sincronização. Não resolver essa nuance por marketing ou inferência: exigir ensaio do pacote na versão/app efectivamente proposta. Isto não invalida por si só todo o offline Totara nem prova superioridade do Mentingo.

## TCO ilustrativo a 12/24/36 meses

**Hipóteses de decisão, não preços de fornecedores nem custos já observados.** USD, sem conversão cambial inventada. Taxa interna de planeamento R = 250 USD/dia-pessoa de oito horas. Assumir 500 contas e os perfis de utilização da sprint, nunca 500 utilizadores simultâneos. Não foi medida manutenção mensal durante meses.

Infra-estrutura comum ilustrativa: aplicação 60 USD/mês, PostgreSQL 35, Redis 10, objectos 10, monitorização/backups 35 e rede/outros 30: **180 USD/mês**. São dotações, não especificações de serviço cotadas. Tráfego vídeo/CDN, transcodificação, IA/voz, planos móveis/plugins, licenças ERP/Graph, impostos e alojamento contratado podem alterar radicalmente o cenário.

| Opção | Trabalho inicial assumido | Manutenção assumida | Custo mensal modelado |
|---|---:|---:|---:|
| A — Mentingo adaptado pela Utu Lab | 60 dias = 15.000 USD | 2,5 dias/mês = 625 USD | 805 USD com infra |
| B — Moodle/IOMAD, âmbito comparável a validar | 35 dias = 8.750 USD | 2 dias/mês = 500 USD | 680 USD com infra |
| C — Evoluir Totara com outro parceiro | 20 dias = 5.000 USD | 1,5 dias/mês = 375 USD | 555 USD com infra + licença/contrato L |

O esforço inicial A é um cenário dentro do intervalo revisto, não uma conversão do tempo de Codex. B/C não foram implementados nesta sprint: os valores são hipóteses para sensibilidade, não alegações de maior produtividade. Excluem produção massiva de cursos, migração histórica irrestrita e paridade total. O contrato real pode incluir alojamento/suporte: substituir as rubricas e evitar dupla contagem.

| Horizonte | A — Mentingo | B — Moodle/IOMAD | C — Totara; L = custo anual ainda desconhecido |
|---|---:|---:|---:|
| 12 meses | 24.660 USD | 16.910 USD | 11.660 USD + L |
| 24 meses | 34.320 USD | 25.070 USD | 18.320 USD + 2L |
| 36 meses | 43.980 USD | 33.230 USD | 24.980 USD + 3L |

Fórmula: dias iniciais × R + meses × (dias de manutenção × R + infra) + licenças efectivas. IA/vídeo ficam separados até existirem minutos, bitrate, tráfego e tokens medidos. Conteúdos e armazenamento externos precisam de backup próprio.

Sensibilidade: ±20 dias iniciais altera 5.000 USD a R=250; ±1 dia de manutenção/mês altera 9.000 USD em 36 meses; ±100 USD/mês de infra altera 3.600 USD. Recalcular R=150/250/350 em vez de apresentar um número como orçamento aprovado. Com estas hipóteses, A custa mais que B; não há prova económica de que a licença MIT torne A automaticamente mais barato.

## Decisão e próximos passos

**CONDITIONAL GO para piloto online controlado**, após aceitação dos papéis, retenção, conteúdos e processos de suporte. Manter o Totara como origem/alternativa durante a validação; não prometer migração sem perda. **NO-GO para substituição de produção agora**, principalmente pela validação física offline, integrações reais, continuidade/segurança e restantes requisitos acordados.

Executar a seguir o guião Android físico, incluindo armazenamento limitado, fecho/reabertura, sessão expirada, avaliação alterada e interrupção de sincronização. Em paralelo, obter versão/API Primavera, exportações Totara, dados de concorrência/conteúdos e orçamento do parceiro alternativo. Só fechar o fornecedor após demonstrar os mesmos critérios com os pacotes/conteúdos autorizados e propostas comerciais comparáveis.

A Utu Lab ganha controlo do código e uma base adaptável já demonstrada; assume também responsabilidade por regressões, actualizações upstream, segurança, documentação e apoio. As customizações podem ser propriedade contratual do cliente, preservando MIT e licenças de terceiros; esta sprint não substituiu uma auditoria completa de dependências/IP.

Tempo exclusivo deste estudo não foi cronometrado; integra o intervalo da execução 18. Não houve contacto comercial, contratação ou utilização de dados reais.
