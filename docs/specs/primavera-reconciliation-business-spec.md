# Reconciliação de colaboradores — prova sintética Primavera

Estado: contrato executável e reconciliação em simulação explícita. **Não existe ligação real ao ERP nem aplicação das alterações ao LMS.**

## Business Overview

A Utu Lab pode comparar uma lista fictícia de colaboradores de Luanda, Huíla e Benguela com um retrato anterior, antecipando entradas, alterações e inactivações antes de definir a integração do cliente.

## Who Uses It

O responsável técnico executa o guião local. Ainda não existe uma interface para administradores ou gestores.

## Feature Functions

- Identificar colaboradores e atribuições por identificadores externos estáveis, conservando zeros iniciais.
- Representar unidade, função, chefia, situação laboral e vigência de cada atribuição.
- Apontar identificadores duplicados, unidades/funções sem correspondência, chefias inexistentes/cíclicas e datas inválidas.
- Distinguir alterações explícitas da simples ausência de um colaborador numa lista incremental.
- Repetir apenas falhas transitórias, limitar paginação e impedir avanço do marcador incremental quando há registos recusados.

## End-User Value

O exercício torna verificáveis as correspondências e os erros antes de permitir alterações em contas, inscrições ou requisitos profissionais.

## How It Works

O adapter identificado como `synthetic-primavera-mock` devolve dados fictícios paginados. A reconciliação produz propostas e erros; o resultado contém obrigatoriamente `mode: dry-run` e `applied: false`. Não desactiva um colaborador por ausência numa página. Uma futura importação terá de confirmar versão/módulo API Primavera, credenciais, correspondências, autorização por tenant, checkpoints persistentes e política de conflitos com alterações manuais.

## Key Technical Context

- Contrato: `apps/api/src/integration/primavera/primavera.types.ts`.
- Reconciliação: `primavera-reconciliation.ts`; execução local: `scripts/sprints/omatapalo/reconcile-synthetic-primavera.mts`.
- Não foi criado outro backend, endpoint de importação, segredo ERP ou tabela RH paralela.
- A futura aplicação repetível deve reutilizar BullMQ e outbox existentes. A simulação actual não precisa de eventos porque não altera o domínio.
- A verificação de ciclos considera as atribuições recebidas, incluindo antigas; a semântica temporal e o contrato de produção carecem de validação com RH.

## Test Evidence

Sete testes cobrem paginação, identidades, reconciliação repetida, inactivação explícita, erros de mapeamento, datas, ciclos, retries e cursor repetido. O guião executado propôs uma criação e uma alteração, manteve um registo e não aplicou nenhuma proposta. Isto valida o contrato sintético, não a conectividade com Primavera.
