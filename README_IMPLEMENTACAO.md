# Gestão de EPIs — Grupo GPS | Versão 1.3.2

## Escopo da versão
- Cadastro de múltiplos estoques com identificador estável, nome, prioridade e situação ativa/inativa.
- Estoques iniciais criados na primeira migração: `SALA ADM` (prioridade 1) e `BARRACÃO` (prioridade 2).
- Saldos iniciais e movimentos vinculados a `ID_ESTOQUE`; saldo consolidado e saldo individual por local.
- Entradas exigem o estoque de destino. Saídas não permitem selecionar origem: o backend consome automaticamente os estoques ativos pela menor prioridade, distribuindo a quantidade quando necessário.
- Bloqueio de saída quando o saldo agregado dos estoques ativos é insuficiente. Cada parcela da retirada é gravada como movimento individual com o respectivo estoque e quantidade.
- Autoatendimento utiliza o mesmo mecanismo de baixa automática.
- Cadastro/edição de estoques e reordenação da prioridade disponíveis ao ADMIN na aba **Gestão ADM**. Estoque com saldo diferente de zero não pode ser inativado. Não há exclusão física de estoques.
- Importação de saldo inicial por CSV com `EPI;GRUPO;SUBGRUPO;SALDO_INICIAL;LOCAL`. Não cria produtos: procura o cadastro existente, normaliza acentos/caixa/espaços e exige correspondência única. Local deve corresponder ao nome de um estoque ativo. O mesmo EPI pode receber saldo em locais diferentes; duplicidade EPI+estoque é ignorada.
- Aba Produtos com pesquisa por EPI/CA/tamanho, filtro por grupo e status, e colunas separadas para descrição e tamanho. TST e ADMIN podem editar; inativação/reativação exige justificativa.
- Painel de auditoria de EPI exclusivo para ADMIN, com contagem de edições/inativações/reativações e filtros por texto, usuário e período. O backend não entrega os registros de auditoria ao perfil TST.
- Histórico exibe o local associado a cada parcela de movimentação.
- Versão e cache da PWA atualizados para 1.3.2.
- Aba **Gestão ADM** centraliza gestão de usuários, importação, gestão/prioridade de estoques, auditoria de EPIs e ajustes administrativos.
- Entrega oculta EPIs inativos e itens sem saldo positivo.
- Filtros do histórico são construídos a partir das movimentações registradas.
- Chamadas ao Apps Script têm timeout de 35 segundos; o indicador de processamento considera operações simultâneas.

## Estrutura de planilha
Abas: `PRODUTOS`, `ESTOQUES`, `ESTOQUE`, `MOVIMENTACOES`, `USUARIOS`, `COLABORADORES`, `AUDITORIA` e `CONFIGURACOES`.

Colunas novas/expandidas:
- `ESTOQUES`: `ID_ESTOQUE`, `NOME`, `PRIORIDADE`, `ATIVO`, `CRIADO_EM`.
- `ESTOQUE`: `ID_ESTOQUE`, `ID_EPI`, `SALDO_INICIAL`, `LOCAL`.
- `MOVIMENTACOES`: nova coluna `ID_ESTOQUE`.

A rotina `setupSistema()` chama uma migração aditiva: cria as abas/colunas ausentes sem limpar registros, cria os estoques padrão se ainda não houver cadastro e associa linhas antigas de saldo/movimentação ao estoque padrão ou ao local de mesmo nome. **Não execute `recriarBaseLimpa()` em uma planilha com dados**, pois essa função é destrutiva.

## Atualização de uma instalação existente
1. Faça uma cópia de segurança da planilha e do projeto Apps Script.
2. Atualize os arquivos do frontend no repositório GitHub Pages, preservando `config.js` e os ícones. Não substitua a URL real do Apps Script pelo texto de exemplo do `config.js` incluído no pacote.
3. No Apps Script, substitua o conteúdo do arquivo principal por `Code.gs` desta versão. O arquivo `backend/Code.gs` é cópia idêntica.
4. Salve e execute manualmente `setupSistema()` uma vez, autorizado pelo proprietário. Essa rotina adiciona a estrutura e migra os movimentos/saldos legados; não recria nem limpa a base.
5. Publique uma nova versão da implantação Web App. Mantenha a URL `/exec` em `config.js` se a implantação continuar usando a mesma URL.
6. Abra a PWA, use **Atualizar** e confira o rodapé `Versão 1.3.2`.

## Implantação de uma base nova
Configure `ADMIN_MATRICULA` e `ADMIN_SENHA` nas propriedades do Apps Script. Execute `setupSistema()` para criar as abas e o usuário ADMIN. Não é necessário executar `recriarBaseLimpa()`.

## Carga CSV inicial
1. Cadastre/importar produtos em `PRODUTOS`.
2. Cadastre funcionários em `COLABORADORES`.
3. Cadastre/valide os nomes dos estoques na aba **Gestão ADM**.
4. Importe saldos com cabeçalhos `EPI;GRUPO;SUBGRUPO;SALDO_INICIAL;LOCAL` e `LOCAL` igual ao nome do estoque ativo.

Exemplo de linhas:
```csv
EPI;GRUPO;SUBGRUPO;SALDO_INICIAL;LOCAL
Bota PVC;Bota;PVC 41;8;SALA ADM
Bota PVC;Bota;PVC 41;12;BARRACÃO
```

## Validações técnicas realizadas no pacote
- Sintaxe JavaScript do frontend (`node --check app.js`).
- Sintaxe JavaScript do backend (`node --check` sobre o conteúdo de `Code.gs`).
- Igualdade entre `Code.gs` e `backend/Code.gs`.
- Integridade estrutural do ZIP.

## Homologação obrigatória no ambiente Google
A execução real com Google Sheets/Apps Script não pode ser simulada apenas com os arquivos locais. Antes de produção, testar: criar estoque; alterar prioridade; entradas em locais diferentes; saída simples; saída distribuída entre dois estoques; saldo insuficiente; autoatendimento; CSV com acento e subgrupo ambíguo; duplicidade EPI+estoque; filtros da aba Produtos; painel ADMIN; bloqueio de dados de auditoria para TST; migração dos movimentos antigos; atualização da PWA.

## Limitações conhecidas / observações
- Não há transferência de saldo entre estoques nesta versão; ajuste administrativo deve ser usado com justificativa e estoque de referência.
- Não há centros de custo nesta versão; fica fora do escopo 1.3.2.
- O autoatendimento continua identificando o colaborador por matrícula e confirmação de nome, não sendo autenticação forte de identidade. Recomenda-se terminal supervisionado.
- Não foram executados testes integrados com a planilha real nem implantação no domínio/conta do usuário; a homologação listada acima é necessária.


## Atualização 1.3.2
- Centralização das rotinas exclusivas do ADMIN na aba Gestão ADM.
- Correção do filtro de entrega para ocultar produtos sem saldo positivo.
- Filtros do histórico passam a considerar colaboradores e EPIs presentes nas movimentações, mesmo que não estejam mais ativos no cadastro.
- Requisições ao Apps Script possuem timeout de 35 segundos e mensagens específicas para falha de comunicação.
- Indicador de processamento passou a contabilizar operações simultâneas.
