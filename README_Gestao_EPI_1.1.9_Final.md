# Gestão de EPIs — Grupo GPS | Versão 1.1.7

## Estrutura da planilha (base nova)
Abas oficiais: PRODUTOS, ESTOQUE, MOVIMENTACOES, USUARIOS, COLABORADORES, AUDITORIA e CONFIGURACOES. Não há mais abas FINANCEIRO ou INDICADORES; custo e histórico ficam registrados na movimentação.

### Cadastro de EPI
Campos: EPI, GRUPO, SUBGRUPO, UNIDADE, CA, CA_VALIDADE, CA_SITUACAO, MINIMO, ESTOQUE_SEGURANCA_QTD e PRECO_UNITARIO. O ID_EPI é gerado automaticamente e não aparece para o usuário. SKU/código, fabricante e múltiplo de compra foram removidos.

### Custo histórico
Cada entrada/saída grava PRECO_UNITARIO_REF e CUSTO_TOTAL na linha da movimentação. O painel apresenta custos mensais de entrada e saída; ao filtrar um EPI, o gráfico considera apenas aquele EPI. O custo usa o preço unitário cadastrado no momento da movimentação.

## Implantação inicial — ATENÇÃO
Esta versão foi preparada para uma base nova, ainda sem carga inicial. No Apps Script, configure as propriedades ADMIN_MATRICULA e ADMIN_SENHA. Em seguida execute uma única vez `recriarBaseLimpa("RECRIAR BASE EPIs")` e depois `setupSistema()`. A função recriarBaseLimpa é destrutiva: remove abas antigas fora da estrutura nova e limpa as abas do sistema. Use somente na planilha de implementação sem dados que devam ser preservados.

Depois publique o Apps Script como Web App e configure a URL /exec em config.js. Suba os arquivos do frontend para o GitHub mantendo a estrutura de assets/icons.

## Carga inicial
Cadastre/importar primeiro os EPIs em PRODUTOS e os funcionários em COLABORADORES. Para carga inicial de saldo, preencha ESTOQUE com ID_EPI, SALDO_INICIAL e LOCAL. O ID_EPI é criado pelo sistema no cadastro do EPI; para importação em lote, use o ID_EPI retornado/gerado e não invente identificadores.

## Validações
A sintaxe JavaScript pode ser verificada com `node --check app.js` e `node --check Code.gs` (após copiar para extensão .js). A integração real deve ser homologada após implantação no Apps Script e conexão à planilha.


## Importação em lote (v1.1.8)
Acesse **Importação de dados** com perfil ADMIN. Baixe o modelo CSV correspondente, preencha no Excel e salve como **CSV UTF-8** (separador ponto e vírgula). Importe na ordem: EPIs, funcionários e estoque inicial. O sistema gera `ID_EPI` automaticamente. Duplicidades são ignoradas; erros por linha são apresentados após o processamento. Limite: 1.000 linhas por arquivo. A tela aceita CSV; arquivos XLSX devem ser salvos como CSV UTF-8 antes do envio.

Cabeçalhos dos modelos:
- EPIs: `EPI;GRUPO;SUBGRUPO;UNIDADE;CA;CA_VALIDADE;CA_SITUACAO;MINIMO;ESTOQUE_SEGURANCA_QTD;PRECO_UNITARIO`
- Funcionários: `MATRICULA;NOME;CR;SETOR;CENTRO_CUSTO;ATIVO`
- Estoque inicial: `EPI;GRUPO;SUBGRUPO;SALDO_INICIAL;LOCAL`


## Versão 1.1.9 — melhorias integradas

- A aba **Gestão de TSTs** foi substituída por **Gestão de usuários**, com cadastro e edição dos perfis `TST` e `ADMIN`.
- O backend impede que um administrador retire o próprio perfil ADMIN ou desative a própria conta e protege a existência de pelo menos um ADMIN ativo.
- A Visão geral recebeu filtros por ano e por produto. Movimentações, consumo e custos são recalculados pelo período escolhido; saldo, estoque mínimo e situação dos CAs continuam representando a posição atual.
- A Análise por grupos recebeu filtro por ano, totais anuais de entradas e saídas e filtros visuais padronizados.
- A posição de estoque e a análise por grupos mostram dias desde a última movimentação efetiva (entrada, saída ou ajuste não estornado). Quando não existe movimentação, a referência é a data de cadastro do produto; se essa data também não existir no histórico, o sistema informa que não há data de referência.
- Os modelos CSV são gerados no navegador com BOM UTF-8, delimitador `;` e download com URL temporária; o seletor de arquivo foi transformado em botão visual e exibe o nome do arquivo escolhido.

### Atualização

1. Publique os arquivos do frontend desta versão no mesmo local do GitHub Pages, substituindo os arquivos antigos.
2. No projeto Google Apps Script, substitua o conteúdo do arquivo principal pelo `Code.gs` desta versão (o arquivo `backend/Code.gs` é uma cópia idêntica).
3. Salve e crie uma nova implantação/versionamento do Web App do Apps Script. Se a URL `/exec` permanecer a mesma, não é necessário alterar `config.js`; se criar uma implantação com URL diferente, atualize `API_URL`.
4. No navegador, use **Atualizar** ou faça recarga completa para eliminar o cache antigo.

**Compatibilidade de dados:** não há alteração nos cabeçalhos das abas existentes nem necessidade de recriar a planilha. A Gestão de usuários utiliza a aba `USUARIOS` existente.

**Validação realizada neste pacote:** sintaxe JavaScript do frontend e do backend, JSON do manifesto, igualdade entre `Code.gs` e `backend/Code.gs` e integridade do ZIP. A execução real contra a planilha Google e a implantação do Apps Script dependem do ambiente do usuário e não foram simuladas.


### Acabamento final da interface (1.1.9)

- O seletor **Escolher arquivo CSV** utiliza o mesmo padrão visual, altura, tipografia, borda e alinhamento do botão **Baixar modelo CSV**.
- Os filtros da **Visão geral** foram organizados em duas colunas equilibradas.
- Os filtros da **Análise por grupos** foram organizados em três colunas no desktop, duas em telas intermediárias e uma em dispositivos móveis.
- Campos de seleção e pesquisa compartilham altura, espaçamento, foco e largura responsiva.
- O identificador de cache do Service Worker foi renovado para forçar a atualização dos arquivos de interface desta revisão.
