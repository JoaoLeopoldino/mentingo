# Decisão provisória do sprint

Estado: **sprint incompleto; CONDITIONAL GO para continuar a validação técnica, sem autorização de adopção em produção**.

Base `52ddc41a`; recuperação `b6bf4bb9`; branch `sprint/omatapalo-resume-20261017`. Este memorando será actualizado depois das etapas restantes.

Os commits preservados demonstram pt-AO parcial, correcção de autorização de metadados de certificados, ciclos de renovação e preservação de tentativas, com testes de integração executados antes do reinício. O conteúdo offline reconstruído passou novamente os testes unitários, mas os ensaios API/Chrome e os builds ainda precisam de confirmação neste ambiente.

Cinco gates por fechar: avaliações offline com sincronização segura; competências RH; integrações reais e extração analítica autorizada; interoperabilidade SCORM no navegador/Android e requisitos xAPI; operação em rede fraca e validação operacional/de segurança completa. Localização não está completa: a cobertura actual testada é 2.029/6.006 chaves, com fallback inglês explícito.

Não foram executados benchmark com 20/50/100 sessões, instalação Moodle/IOMAD, comparação funcional por execução, teste de recuperação de backups, carga de vídeo/IA ou TCO empírico. Não se apresenta uma pontuação ponderada que oculte estes gates nem cotações de fornecedores inventadas.

A recuperação após reinício expôs um risco de processo: o worktree temporário não preservou ficheiros ainda não consolidados. O trabalho passa a residir numa directoria persistente e a ser consolidado em checkpoints Git. Os serviços e os dados sintéticos sobreviveram; nenhuma produção foi alterada.

Próxima acção: concluir a prova recuperada de texto/PDF offline e implementar a sincronização de um questionário nativo, usando o motor existente. O sucesso de uma interface ou de testes unitários não fecha o gate de formação offline completa.
