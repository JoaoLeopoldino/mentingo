# Etapa 6 — Integrações e rede fraca

Estado actual em 18-10-2026: **adapter Primavera sintético/reconciliação e dataset BI manual entregues; HLS medido em Chrome e recuperação assistida testada; API ERP real, Android e pipeline privado pendentes**. Branch `feat/omatapalo-enterprise-competencies-20261018`; commits no histórico desta entrega. [Medições actuais, capturas e limites: relatório 21](21-video-network-and-certificate-integrity.md). Os parágrafos iniciais abaixo preservam o checkpoint anterior, incluindo referências a medições então não executadas.

## Alteração efectuada

A hipótese sobre `hlsQuality.ts` confirmou-se: o modo Auto eliminava variantes inferiores a 720p quando existia HD; numa distribuição apenas SD fixava a variante mais alta. Agora permite todas as variantes ao motor adaptativo. A escolha manual mantém-se e o identificador anterior é preservado. Não se acrescentaram serviços, transcodificação ou dependências.

Quatro testes foram executados antes da correcção: **três falharam e um passou**, demonstrando o problema. Após a correcção, **4/4 passaram**. O conjunto com os quatro testes TUS passou **8/8 em 1,62 s**; a regressão final web passou **35/35 em 7,63 s**. Typecheck e build finais são registados no relatório da execução.

Não foram medidos arranque, rebuffering, selecção efectiva ou tráfego com limitação de banda. Por isso o gate de desempenho de vídeo continua aberto. O código permite adaptação; não se declara melhoria de consumo comprovada. O build com o catálogo integral tem cerca de 14,4 MiB de precache de arranque, custo distinto dos conteúdos descarregados.

## Integrações restantes

Ainda não foram criados os adapters Primavera e Power BI nesta execução. A Utu Lab não forneceu API Primavera real e não se afirma integração. A primeira fatia seguinte deve implementar o contrato sintético de colaborador/unidade/cargo/situação/chefia com reconciliação, identificadores estáveis e erros explícitos, sem o apresentar como ligação ao ERP.

O dataset analítico deve conciliar inscrições, ciclos, conclusões, certificados e as novas competências, com isolamento por tenant e autorização. Um CSV isolado não equivale a refresh incremental ou warehouse. Microsoft Teams também não foi implementado nesta execução.

## Reprodução e medição seguinte

```sh
source scripts/sprints/omatapalo/environment.sh
sprint_pnpm --filter web exec vitest run app/components/VideoPlayer/hlsQuality.test.ts
```

Preparar uma distribuição HLS de teste com 144/240/360/720p, licença explícita e conteúdo fictício. No leitor nativo, comparar ligação normal e 150/500/1.500 kbit/s, latências 100/400 ms, interrupção/retoma e regresso de resolução fixa a Auto. Recolher segmentos, bytes, resolução, tempo até reprodução e eventos de espera; separar tráfego de arranque da aplicação. `ffmpeg` está disponível localmente, mas esse ensaio ainda não foi preparado/executado. Não atribuir zero a rebuffering ou consumo por ausência de medição.

Tempo por esta correcção não foi isolado em cronómetro próprio; integra o intervalo global documentado. Custos externos reais e esforço de conectores continuam sem medição empírica.

## Entrega empresarial seguinte

- `apps/api/src/integration/primavera/`: adapter explicitamente sintético, três províncias fictícias, identidades/atribuições, reconciliação `dry-run`, duplicações, datas, chefias, incremental inclusivo e retries limitados. Sete testes passaram. O guião devolveu duas propostas, um registo inalterado e zero erros em 1 ms, **sem aplicar alterações ao LMS**. Faltam API real e pipeline persistente BullMQ/outbox. [Especificação](../../specs/primavera-reconciliation-business-spec.md).
- `apps/api/src/report/analytics-dataset.ts`: seis CSV relacionados, permissões conjuntas e APIs nativas autorizadas, validação de mapeamentos e protecção contra fórmulas textuais. Cinco testes passaram; três de autorização de relatórios passaram. Exportações reais em 8,018 s e 4,869 s, com páginas de 100 e um registo, produziram os mesmos bytes: 23 colaboradores, 16 inscrições, quatro conclusões, 16 progressos, dois certificados e oito competências. Dados são os existentes no momento do ensaio; a demonstração comercial posterior acrescentou registos. **Não existe ligação ao serviço Power BI nem refresh automático**.
- Nove testes HLS passaram no conjunto final: quatro da correcção e cinco da suite anterior. Dois testes antigos ainda exigiam a regra HD anterior; foram mantidos e actualizados para a adaptação completa. Não se alterou o leitor nesta execução nem se mediu tráfego/rebuffering; gate aberto.

O conjunto de integração puro terminou **12/12 em 18,815 s**. Detalhes, comandos, estimativas, limites e métricas no [relatório 18](18-enterprise-validation.md). Tempo exclusivo por funcionalidade não medido; não confundir milissegundos da simulação com esforço de integração real.

## Medição de vídeo e recuperação — execução 21

`b1b32296`: leitor nativo Chrome com HLS sintético sem áudio, quatro variantes, cache/service worker desligados e aplicação previamente carregada. Arranque a 500/150 kbit/s: **2.209,7/3.312,3 ms**; resolução **360p/144p**; tráfego HTTP **1.697.583/505.851 bytes**; zero eventos de rebuffering nas janelas contínuas observadas. O caso interrompido inicialmente ficou parado. A recuperação explícita entregue preservou ~7,925 s e retomou em **3.851,5 ms após clique**, com esperas durante reload/seek. Quatro perfis e repetição visual passaram; 41 testes VideoPlayer passaram. Não equivale a rede móvel real, arranque frio, conteúdos com áudio, URLs assinadas, vídeo offline ou carga concorrente. [Método e reprodução](21-video-network-and-certificate-integrity.md).
