# Decisão provisória do sprint

Estado: **sprint incompleto; CONDITIONAL GO para continuar a validação técnica, sem autorização de adopção em produção**.

Base funcional API `38683c60`, UI `276827c8`; recuperação `b6bf4bb9`; branch `sprint/omatapalo-resume-20261017`. Este memorando será actualizado depois das etapas restantes.

Os commits preservados demonstram pt-AO parcial, correcção de autorização de metadados de certificados, ciclos de renovação e preservação de tentativas, com testes de integração executados antes do reinício. O conteúdo offline reconstruído passou novamente testes unitários, sete testes API, builds/typecheck e cinco checkpoints Chrome, incluindo fecho/reabertura sem rede e PDF. A API de avaliações offline passou nove testes com PostgreSQL/RLS, concorrência e rollback. A fila local passou seis testes; o percurso Chrome completo das avaliações passou com API real e conclusão nativa confirmada.

Cinco gates por fechar: offline no Android físico e recuperação assistida de conflitos; competências RH; integrações reais e extração analítica autorizada; interoperabilidade SCORM no navegador/Android e requisitos xAPI; operação em rede fraca e validação operacional/de segurança completa. Localização não está completa: a cobertura actual testada é 2.050/6.027 chaves, com fallback inglês explícito.

Não foram executados benchmark com 20/50/100 sessões, instalação Moodle/IOMAD, comparação funcional por execução, teste de recuperação de backups, carga de vídeo/IA ou TCO empírico. Não se apresenta uma pontuação ponderada que oculte estes gates nem cotações de fornecedores inventadas.

A recuperação após reinício expôs um risco de processo: o worktree temporário não preservou ficheiros ainda não consolidados. O trabalho passa a residir numa directoria persistente e a ser consolidado em checkpoints Git. Os serviços e os dados sintéticos sobreviveram; nenhuma produção foi alterada.

Próxima acção: implementar a fatia de competências com requisitos por função, evidências e lacunas, mantendo tenant/RBAC; ensaiar também o offline num Android físico antes de aceitar esse gate. O sucesso de uma interface ou de testes unitários não fecha o gate de formação offline completa.

O comando de build local foi revisto para caber no computador de 8 GB: configuração separada do sprint, sem alterar a configuração principal. Cliente/SSR passaram em 1m17s/22,90s; as duas demonstrações Chrome foram repetidas com sucesso sobre esse build. Este resultado reduz o risco técnico da primeira fatia offline, mantendo por validar Android físico, reconciliação assistida, operações em rede fraca e restantes módulos empresariais.
