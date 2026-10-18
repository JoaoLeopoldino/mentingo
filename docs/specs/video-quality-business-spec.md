# Qualidade de vídeo na formação

O formando pode deixar o leitor adaptar a resolução ou escolher uma qualidade disponível no vídeo. A escolha permite adequar a reprodução à ligação e ao ecrã, desde que o conteúdo publicado tenha várias resoluções.

No modo Auto, todas as variantes anunciadas ficam elegíveis para a adaptação do leitor. A opção deixou de impor uma resolução mínima de 720p. Escolher uma resolução fixa continua a limitar a reprodução a essa qualidade; regressar a Auto volta a permitir as resoluções mais baixas. O identificador interno anterior é preservado para compatibilidade.

Esta alteração não cria variantes, não faz transcodificação e não transforma um ficheiro MP4 único num fluxo adaptativo. O fornecedor/armazenamento tem de disponibilizar a distribuição HLS e as resoluções adequadas. Não foram medidos nesta entrega arranque, rebuffering ou consumo em rede móvel real.

Evidência: `apps/web/app/components/VideoPlayer/hlsQuality.ts`, integração no `VideoPlayer.tsx` e quatro testes em `hlsQuality.test.ts`. Os testes demonstram elegibilidade das variantes, regresso de qualidade fixa a Auto, distribuição só com resoluções baixas e preservação da selecção manual. A validação do algoritmo adaptativo e do tráfego num vídeo real continua aberta.
