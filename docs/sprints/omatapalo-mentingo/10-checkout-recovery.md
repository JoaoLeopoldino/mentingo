# Recuperação do checkout original — 18-10-2026

Estado: **concluída e verificada**. Checkout original: `/Users/joaoleopoldino/Development/CaniveteLab/mentingo`, branch `main`, HEAD `7a23e967d88947238386c588663140c21a284294`. O trabalho funcional permanece no branch `sprint/omatapalo-resume-20261017`, no worktree persistente.

## Diagnóstico confirmado

O ficheiro `.git/index` não existia. O Git apresentava todos os 5.191 caminhos do HEAD como eliminações staged porque não tinha entradas no índice. A comparação de todos os caminhos e hashes revelou 1.976 ficheiros intactos, 3.194 ausentes e 21 snapshots de migrações presentes com zero bytes. Os sete relatórios em `docs/audits/omatapalo-mentingo/` eram os únicos ficheiros adicionais não ignorados e não pertenciam ao HEAD.

A simulação com um índice temporário, fora de `.git`, confirmou 3.194 ausências reais, 21 ficheiros modificados e sete relatórios untracked. Não foi demonstrada a causa que deixou o checkout neste estado. O padrão é compatível com checkout incompleto; não atribuir a sua origem a um comando ou pessoa sem evidência.

## Operação autorizada e executada

1. Revalidado HEAD, branch, ausência de índice/lock e hashes dos ficheiros existentes. A operação recusaria qualquer alteração local diferente dos 21 snapshots vazios.
2. Criado e verificado um arquivo dos 1.997 ficheiros existentes que pertenciam ao HEAD e dos sete relatórios. Cada entrada foi conferida pelo hash SHA-256; manifestos before/after ficaram guardados.
3. Repostos exclusivamente os 3.194 caminhos ausentes e reparados os 21 snapshots vazios com os blobs do HEAD. Os 1.976 ficheiros intactos não foram substituídos. Permissões de execução conferidas.
4. Reconstruído o índice num ficheiro separado e publicado com exclusão mútua, recusando substituir um índice criado entretanto por outro processo.
5. Comparados os **5.191 ficheiros recuperados** com os respectivos blobs do HEAD e confirmada a integridade dos sete relatórios.

Não foram usados `reset --hard`, `clean` ou remoção em massa. Não houve merge do sprint para `main`, instalação de dependências na pasta original, alteração de bases de dados ou acesso a produção.

## Resultado

| Verificação | Resultado |
|---|---:|
| Ficheiros ausentes repostos | 3.194 |
| Snapshots vazios reparados | 21 |
| Ficheiros do HEAD verificados por conteúdo | 5.191 / 5.191 |
| Relatórios da auditoria preservados por hash | 7 / 7 |
| Alterações staged no checkout original | 0 |
| Alterações em ficheiros tracked no checkout original | 0 |
| Mudança de branch ou HEAD original | Não |

`git status --short` no original apresenta apenas `?? docs/audits/`. Estes relatórios mantêm-se fora do controlo de versões nessa pasta; não são eliminações. O `template-registry.ts` voltou a existir na pasta original e permanece igual ao HEAD; é um módulo utilizado, não um ficheiro obsoleto.

## Cópia de segurança e rastreabilidade

Directoria local ignorada: `.local/recovery/20261018T011143Z/`, relativa ao checkout original. Contém `before-recovery.tar.gz`, `before.json`, `after.json` e o índice reconstruído de referência. O arquivo tem SHA-256:

`8c6544c890a4bb4c19dc150353ed1e07e2245131abd9351555f14c36324b7cc5`

Os ficheiros de backup são locais e não entram no commit. O script de recuperação, também local, valida pré-condições específicas e não deve ser repetido sobre outro estado. O manifesto regista os caminhos e hashes necessários para rever ou recuperar os conteúdos anteriores; qualquer rollback deve ser planeado, sem extrair o arquivo indiscriminadamente sobre trabalho novo.

Tempo registado: a cópia de segurança foi criada às **01:11:43 UTC**. A recuperação terminou antes do início dos novos ensaios visuais. Não existe cronómetro exclusivo fiável para separar inspecção, backup e escrita; o tempo global desta execução é registado no relatório de progresso.
