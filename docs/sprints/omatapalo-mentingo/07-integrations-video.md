# Etapa 6 — Integrações e rede fraca

Estado em 18-10-2026: **Auto HLS corrigido e testado em unidade; integrações e medições de rede por entregar**. Branch `sprint/omatapalo-resume-20261017`; commit: consultar o commit deste relatório.

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
