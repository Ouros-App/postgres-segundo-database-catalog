# Catálogo do banco de dados

Site estático gerado a partir de `source/docs/catalogacao_tabelas_colunas.md`.

Para executar, abra `index.html` diretamente no navegador. O arquivo contém os dados, o estilo e o código necessários; não é preciso servidor ou conexão com a internet.

Depois de alterar o Markdown, execute `python build.py` para atualizar `index.html`.

As seções de views, rotinas e RPA são mantidas em `template.html` com base nos scripts SQL, no README e no script de importação do repositório. Após alterá-las, execute também `python build.py`.

O mapa e os links de origem apontam para a branch `main` no GitHub. A página abre sem internet, mas os links externos precisam de conexão. A seção de tabelas identifica os arquivos SQL que contêm declarações `CREATE TABLE` na cópia local; o catálogo Markdown também é indicado como fonte.

A fonte Poppins é incorporada ao HTML a partir dos arquivos em `fonts/`. A licença está em `fonts/OFL.txt`.
