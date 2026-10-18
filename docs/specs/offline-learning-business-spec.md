# Formação offline — primeira fatia de leitura

## Business Overview

O colaborador pode preparar uma formação com Internet e consultar depois o texto e os PDFs guardados no seu dispositivo. Esta fatia serve a consulta de conteúdos em operações com conectividade limitada; avaliações e conclusão continuam online.

## Who Uses It

- O formando inscrito descarrega conteúdos no idioma seleccionado e consulta-os sem rede.
- O administrador valida a experiência no modo de aprendizagem existente; o modo de suporte não admite descargas privadas.

## Feature Functions

- Descarregar texto e PDFs suportados de uma formação inscrita.
- Identificar conteúdos e formatação excluídos.
- Consultar a cópia numa página própria após reabrir a aplicação sem rede.
- Remover a cópia ou substituí-la através de nova preparação online.
- Recusar descargas parciais e separar conteúdos por conta e origem.

## End-User Value

O colaborador consulta instruções de trabalho em locais sem Internet e distingue uma cópia disponível de uma transferência interrompida.

## How It Works

O colaborador escolhe «Descarregar texto e PDFs» na formação. A aplicação obtém os conteúdos através dos endpoints existentes com a sessão autenticada. A página «Descargas offline» só apresenta uma cópia completa. O limite inicial é 32 MB por formação e sete dias de validade local.

Terminar sessão ou mudar de conta desencadeia a remoção da cópia anterior. O colaborador deve usar um dispositivo privado; não se garante apagamento remoto enquanto estiver desligado. Uma nova descarga actualiza a cópia; as alterações ao curso não são sincronizadas automaticamente.

## Key Technical Context

IndexedDB/Dexie guarda apenas o conteúdo de leitura, sem credenciais. Workbox guarda recursos estáticos, sem respostas privadas da API. A rota offline evita consultas globais de sessão e reutiliza os visualizadores existentes. O texto não conserva URLs ou atributos executáveis; PDFs usam worker local. A API continua a decidir o acesso online. A identidade local nunca atribui notas ou certificados.

## Test Evidence

Antes do reinício, testes de persistência, isolamento, interrupção, limpeza de sessão e acesso a anexos passaram, incluindo Chrome com API e S3 reais. O worktree temporário desapareceu; a reconstrução voltou a passar 26 testes web e sete de integração de lições; os cinco checkpoints Chrome também passaram novamente, incluindo fecho/reabertura sem rede, canvas PDF e remoção persistente. O estado actual e os comandos estão em `docs/sprints/omatapalo-mentingo/04-offline-content.md`. Android, avaliações e conclusão offline ainda não foram demonstrados.
