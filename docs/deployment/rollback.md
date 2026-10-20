# Reversão da demo Utu Lab

Aplicável apenas ao projecto/ambiente demo identificado e às releases aprovadas. Nesta execução não existe deployment Railway para reverter. Nunca reutilizar IDs de outro projecto.

1. Fechar acesso aos convidados no gate; suspender novas inscrições/emissões/importações. Identificar SHA, deployment ID, digest das imagens, versão de migrations e instante de corte. Guardar evidências sem tokens.
2. Capturar backup PG consistente, inventário/hash de objectos e cópia cifrada dos segredos/chaves. Preservar volumes e buckets originais; não efectuar drop/truncate/reset para “voltar atrás”.
3. Se não houver migração incompatível, seleccionar o deployment anterior **do mesmo serviço e ambiente**. Confirmar esse ID em SUCCESS e executar smoke tests; não assumir que redeploy voltou ao código desejado.
4. Se houver incompatibilidade de schema/dados, restaurar PG e storage para novos recursos isolados, com chaves originais e roles limitadas. Comparar utilizadores, inscrições, ciclos, tentativas, avaliações, planos, certificados, estados de revogação e objectos. Não repor um certificado revogado como válido. Não apontar o código antigo para schema incompatível.
5. Ensaiar API/Web privada sobre recursos restaurados; mudar referências apenas após revisão. Guardar os recursos anteriores para investigação. Não modificar DNS de outros serviços; se o domínio precisar de mudar de destino, usar apenas valores realmente retornados pelo Railway.
6. Repetir autenticação, privacidade de ficheiros, SCORM, emissão/verificação/revogação e isolamento. Reabrir gate aos convidados e registar tempos observados, perda eventual de dados e aprovação responsável.

Meta proposta de piloto: RPO 24h/RTO 8h. **Não demonstrado no Railway nem contratado como SLA**. Os ensaios locais anteriores recuperaram PG/objectos/API, mas não cobrem perda da máquina, perda das chaves ou indisponibilidade regional.

Rotação: JWT/refresh invalidam sessões; actualizar contas/gate SMTP/S3/control/app com coordenação; MASTER_KEY exige estratégia de re-encriptação e retenção de chaves, nunca substituir cegamente. Após suspeita de exposição, conter acessos e rever logs/artefactos antes de retomar.


## Rollback no Railway (projecto utu-mentingo-demo)

1. Imagens: cada serviço está fixado a um commit; voltar atrás = `connect-service-source` com o SHA anterior (API e Web) e aguardar SUCCESS. Ordem: API antes do Web (o nginx resolve a API no arranque).
2. Base de dados: as migrations são aditivas, sem rollback automático. Antes de migrar, copiar o Postgres (pg_dump a partir do serviço Postgres via `railway ssh`) e guardar fora do projecto; restaurar numa BD nova e só depois repontuar `LMS_DATABASE_URL`/`CONTROL_DATABASE_URL`.
3. Acesso de emergência: remover o domínio personalizado do Web (ou alterar `DEMO_GATE_PASSWORD`) corta o acesso externo sem apagar dados.
4. Nunca apagar o volume `postgres-data` nem o bucket sem backup verificado.
