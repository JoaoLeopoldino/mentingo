# Qualidade de vídeo na formação

O formando pode deixar o leitor adaptar a resolução ou escolher uma qualidade disponível no vídeo. A escolha permite adequar a reprodução à ligação e ao ecrã, desde que o conteúdo publicado tenha várias resoluções.

No modo Auto, todas as variantes anunciadas ficam elegíveis para a adaptação do leitor. A opção deixou de impor uma resolução mínima de 720p. Escolher uma resolução fixa continua a limitar a reprodução a essa qualidade; regressar a Auto volta a permitir as resoluções mais baixas. O identificador interno anterior é preservado para compatibilidade.

Esta alteração não cria variantes, não faz transcodificação e não transforma um ficheiro MP4 único num fluxo adaptativo. O fornecedor/armazenamento tem de disponibilizar a distribuição HLS e as resoluções adequadas. Foram medidos arranque, paragens e tráfego num ensaio local com limitação de rede; rede móvel real continua por validar.

Evidência inicial: `apps/web/app/components/VideoPlayer/hlsQuality.ts`, integração no `VideoPlayer.tsx` e quatro testes em `hlsQuality.test.ts`. Os testes demonstram elegibilidade das variantes, regresso de qualidade fixa a Auto, distribuição só com resoluções baixas e preservação da selecção manual.

## Business Overview

O formando consulta um vídeo publicado com qualidade adequada à ligação e pode recuperar uma reprodução interrompida, sem começar a formação de novo.

## Who Uses It

O formando inscrito e os responsáveis no modo de aprendizagem usam os controlos do leitor existente. O criador de conteúdos continua a depender de um vídeo/distribuição que disponibilize resoluções compatíveis.

## Feature Functions

- Permitir que Auto escolha resoluções baixas quando a ligação o exige.
- Escolher uma qualidade fixa entre as variantes anunciadas e regressar a Auto.
- Apresentar uma acção explícita de recuperação após uma interrupção persistente ou erro do leitor nativo.
- Retomar a mesma fonte na posição observada antes da nova tentativa.
- Apresentar as mensagens e os rótulos de acessibilidade em pt-AO, mantendo os outros idiomas suportados.

## End-User Value

O formando tem uma alternativa operacional quando a ligação regressa e o leitor continua parado. A recuperação conserva a posição de visualização e evita repetir o início do vídeo por causa de uma interrupção transitória.

## How It Works

O formando inicia o vídeo normalmente. Auto mantém as resoluções anunciadas disponíveis para adaptação. Se a reprodução ficar à espera durante oito segundos ou ocorrer um erro nativo, aparece «Voltar a tentar reproduzir». Ao seleccionar, o leitor recarrega a mesma fonte e repõe a posição observada, limitada à duração disponível. O aviso desaparece quando existe reprodução efectiva; uma falha ou espera prolongada permite nova tentativa explícita. Não se reinicia outra lição nem se atribui conclusão por carregar neste botão.

A recuperação é para o leitor HTML5/HLS/MP4, não para os players externos YouTube/Vimeo. Não constitui descarga offline, sincronização de vídeo, garantia de retoma automática ou renovação de URLs assinados/sessões expiradas. Não cria um pipeline de transcodificação de produção. Uma sessão ou URL já inválida pode exigir nova autenticação/abertura da lição.

## Key Technical Context

- Componentes existentes `VideoPlayer.tsx` e `HlsQualitySelector.tsx`; estado transitório em `useVideoPlaybackRecovery.ts`, sem novo backend ou biblioteca.
- A recuperação conserva a origem/posição efectivamente observada; limpa timers e listeners ao mudar de fonte. O acompanhamento de cobertura continua no motor existente.
- Cinco novos textos em todos os oito catálogos; cobertura estrutural pt-AO 6.233/6.233, sem declaração de revisão linguística humana integral.
- O HLS do ensaio é um padrão sintético local com quatro resoluções, sem áudio, servido por loopback. Ficheiros privados, CDN, transcodificação, telemóvel e legibilidade de formações profissionais não estão demonstrados por este ensaio.

## Test Evidence

41 testes do módulo passaram, incluindo seis de recuperação e os anteriores de qualidade, atalhos e cobertura. Chrome real reproduziu a 720p com 5.000 kbit/s, 360p com 500 kbit/s e 144p com 150 kbit/s; não houve paragens após o arranque nessas janelas. Uma interrupção de seis segundos reproduziu a falta de retoma; depois da correcção, a acção real da interface retomou aos 7,91 s, com reprodução confirmada. O ensaio teve paragens e transferência repetida durante a recuperação: não se anuncia uma experiência sem interrupções. [Medições e limites](../sprints/omatapalo-mentingo/21-video-network-and-certificate-integrity.md).
