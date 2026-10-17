# Recuperação após reinício — 17-10-2026

Estado: em execução. Branch recuperado: `sprint/omatapalo-resume-20261017`. Base recuperada: `52ddc41a`.

Às 22:20 UTC verificou-se que `/private/tmp/mentingo-omatapalo-sprint-20261017` já não existia. O utilizador informou que reiniciou o computador. O Git preservou os commits de ambiente, pt-AO, autorização e ciclos/histórico; não preservou o código offline ainda não consolidado. A utilização de uma pasta temporária para trabalho prolongado foi uma decisão inadequada do agente.

Novo worktree persistente: `/Users/joaoleopoldino/Development/CaniveteLab/mentingo/.local/worktrees/omatapalo-20261017`. O checkout original mantém 5.191 eliminações staged e não foi alterado, reposto ou limpo.

Os quatro contentores exclusivos `utu-omatapalo-sprint` sobreviveram e estão activos. As credenciais locais foram recuperadas dos próprios contentores para um ficheiro ignorado com modo 600, sem apresentar valores. As bases e volumes não foram eliminados ou substituídos. Segredos JWT novos invalidam apenas as sessões fictícias locais anteriores.

Antes do reinício, a implementação offline tinha passado 26 testes web, 10 testes Node, sete testes de integração de lições e cinco checkpoints Chrome, incluindo reabertura sem rede e PDF renderizado. Estas execuções foram observadas na sessão, mas os logs/capturas locais desapareceram com o worktree. Não constituem aprovação da reconstrução actual: os testes serão repetidos e as novas evidências guardadas no caminho persistente.

O código offline será reconstruído a partir do trabalho registado na sessão, incluindo Dexie, propriedade por conta/origem, descarga atómica de texto/PDF, limpeza de sessão, worker PDF local e integração Workbox no fim do build Remix. A etapa de avaliações offline ainda não estava implementada.

Não incluir o intervalo entre reinício e retoma como esforço de engenharia. A retoma foi confirmada às 22:20 UTC. Não houve push ou deployment.
