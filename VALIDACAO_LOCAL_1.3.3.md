# Correção 1.3.3 — desempenho do carregamento inicial

## Causa identificada na 1.3.2
A função `bootstrap_()` chamava `table_("ESTOQUE")` e `table_("MOVIMENTACOES")` repetidamente dentro dos loops de estoques e produtos, provocando releituras integrais das mesmas abas. Também recalculava saldos de cada estoque com novas leituras. O custo crescia proporcionalmente ao número de produtos, estoques e movimentações, podendo ultrapassar o limite de 35 segundos no frontend.

## Correção aplicada
- `bootstrap_()` agora carrega PRODUTOS, MOVIMENTACOES, ESTOQUE, ESTOQUES e COLABORADORES uma vez por execução.
- Saldos consolidados, por produto e por estoque são agregados em memória.
- Totais por local deixam de disparar novas leituras das planilhas.
- O mapeamento de produtos para o histórico usa índice por ID, evitando busca linear repetida.
- `Code.gs` e `backend/Code.gs` sincronizados.
- Versão da aplicação e cache da PWA atualizados para 1.3.3.

## Limites da validação
A sintaxe dos arquivos e a integridade do pacote podem ser verificadas localmente. O tempo real de resposta depende do volume da planilha e precisa ser medido na implantação Google Apps Script do usuário. Não foi executada conexão com a planilha de produção.
