# Correção 1.3.2 — Gestão de EPIs Grupo GPS

## Correções desta revisão
- Service Worker: fallback de navegação sempre retorna uma Response válida; elimina o erro `Failed to convert value to Response` quando a rede falha e não existe cópia em cache.
- Service Worker: limita o tratamento às requisições da mesma origem e dentro do escopo da aplicação; não intercepta chamadas externas ao Apps Script.
- Service Worker: limpa apenas caches antigos com o prefixo próprio do sistema.
- Login: só abre o painel após o `bootstrap` concluir e renderizar os dados. Se o carregamento falhar, retorna à tela de login e apresenta a causa, evitando deixar a Visão Geral vazia.
- Campos de matrícula e nome com atributos autocomplete para acessibilidade.

## Validação
- Validar sintaxe JS do frontend e backend, igualdade dos arquivos Code.gs e integridade do ZIP.
- Ainda requer homologação no GitHub Pages e no Apps Script real.
