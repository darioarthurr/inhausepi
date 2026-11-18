# Gestão de EPIs Grupo GPS — validação local 1.3.1

## Implementações desta atualização
- Nova aba Gestão ADM, com gestão de estoques, usuários, importação, auditoria de EPIs e ajuste de estoque.
- Remoção dos atalhos separados de Gestão de usuários, Importação e Ajuste de estoque da navegação principal.
- Gestão de estoques e auditoria movidas para a área administrativa sem duplicar IDs ou formulários.
- Entrega lista somente produtos ativos com saldo consolidado estritamente maior que zero.
- Filtros de histórico montados a partir das movimentações disponíveis, incluindo colaboradores e EPIs que já não estejam ativos nos cadastros atuais.
- Timeout de 35 segundos nas chamadas ao Apps Script e mensagem clara para timeout, HTTP inválido e JSON inválido.
- Indicador de processamento com contador para evitar que uma operação simultânea esconda o carregamento de outra.
- Verificação de perfil ADMIN normalizada para maiúsculas no backend e frontend.
- Versão e cache PWA atualizados para 1.3.1.

## Verificações locais
- `node --check app.js`: aprovado.
- `node --check < Code.gs`: aprovado.
- `Code.gs` e `backend/Code.gs`: idênticos.
- ZIP: integridade será verificada após empacotamento.

## Limitações de homologação
Não foi possível testar com a planilha real, credenciais do usuário, implantação real do Apps Script ou navegador conectado ao ambiente de produção. Antes de publicar, homologar login ADM/TST, carga de usuários/produtos/estoques, entrada, entrega com saldo zero, filtros do histórico e importações. Fazer backup da planilha antes de substituir o backend. Não executar `recriarBaseLimpa()` em base com dados.
