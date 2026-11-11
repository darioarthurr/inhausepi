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
