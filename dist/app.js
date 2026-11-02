const data = window.CATALOG;
const sections = data.sections.filter(section => section.tables.length);
const tables = sections.flatMap(section => section.tables.map(table => ({...table, group: section.title, groupIntro: section.intro})));
const byId = id => document.getElementById(id);
const escapeHtml = value => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const markup = value => escapeHtml(value).replace(/`([^`]+)`/g, '<code>$1</code>');
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const repository = 'https://github.com/Ouros-App/postgres-segundo-prod-database/blob/main/';
function sourceLinks(paths) {
  const wrapper = document.createElement('div');
  wrapper.className = 'source-links';
  const label = document.createElement('span');
  label.textContent = 'Arquivos no GitHub:';
  wrapper.append(label);
  paths.forEach(path => {
    const link = document.createElement('a');
    link.href = repository + path;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = path + ' ↗';
    wrapper.append(link);
  });
  return wrapper;
}
byId('table-count').textContent = String(tables.length).padStart(2, '0');
byId('column-count').textContent = tables.reduce((total, table) => total + table.columns.length, 0);
byId('group-count').textContent = String(sections.length).padStart(2, '0');
byId('source-note').innerHTML = data.intro.map(markup).join(' ');
const filter = byId('group-filter');
sections.forEach(section => filter.add(new Option(section.title, section.title)));
function render() {
  const query = normalize(byId('search').value.trim());
  const selectedGroup = filter.value;
  const visible = tables.filter(table => (!selectedGroup || table.group === selectedGroup) && (!query || normalize(JSON.stringify(table)).includes(query)));
  byId('result-count').innerHTML = `<strong>${visible.length}</strong> ${visible.length === 1 ? 'tabela encontrada' : 'tabelas encontradas'}`;
  byId('empty').hidden = visible.length !== 0;
  byId('catalog').innerHTML = sections.map(section => {
    const group = visible.filter(table => table.group === section.title);
    if (!group.length) return '';
    return `<div class="group"><div class="group-title"><div><span class="group-indicator"></span><h3>${escapeHtml(section.title)}</h3><span class="group-count">${group.length}</span></div><span class="group-line"></span></div>${section.intro.map(p => `<p class="group-intro">${markup(p)}</p>`).join('')}<div class="table-list">${group.map(table => `<details class="table-card"><summary><span class="table-symbol">▦</span><span class="table-name"><strong>${escapeHtml(table.name)}</strong><small>${table.description.map(markup).join(' ')}</small></span><span class="column-badge">${table.columns.length} colunas</span><span class="chevron" aria-hidden="true">⌄</span></summary><div class="table-detail"><div class="table-scroll"><table><thead><tr><th>COLUNA</th><th>TIPO E REGRAS</th><th>DESCRIÇÃO</th></tr></thead><tbody>${table.columns.map(row => `<tr>${row.map(cell => `<td>${markup(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${table.notes.map(note => `<p class="table-note">${markup(note)}</p>`).join('')}</div></details>`).join('')}</div></div>`;
  }).join('');
  byId('catalog').querySelectorAll('.table-card').forEach(card => {
    const name = card.querySelector('.table-name strong').textContent.toLowerCase();
    const paths = ['docs/catalogacao_tabelas_colunas.md', ...(data.definitions[name.split('.').pop()] || [])];
    const detail = card.querySelector('.table-detail');
    const block = document.createElement('div');
    block.className = 'table-relationships';
    const heading = document.createElement('h4');
    heading.textContent = 'Relacionamentos';
    block.append(heading);
    const items = data.relationships[name] || [];
    if (!items.length) {
      const paragraph = document.createElement('p');
      paragraph.textContent = 'Nenhuma chave estrangeira ou associação documentada para esta tabela.';
      block.append(paragraph);
    } else {
      const list = document.createElement('ul');
      items.forEach(item => {
        const row = document.createElement('li');
        const badge = document.createElement('strong');
        badge.textContent = item.type;
        const text = document.createElement('span');
        text.textContent = item.text;
        row.append(badge, text);
        list.append(row);
      });
      block.append(list);
    }
    detail.prepend(sourceLinks(paths), block);
  });
}
byId('search').addEventListener('input', render);
filter.addEventListener('change', render);
document.addEventListener('keydown', event => { if (event.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { event.preventDefault(); byId('search').focus(); } });
const viewSources = [
  ['sql/views_analytics.sql', 'README.md'], ['sql/views_analytics.sql', 'README.md'],
  ['sql/views_galinhas_consumo.sql', 'sql/rpa_preservar_timestamps.sql'],
  ['sql/monitoramento_dau.sql', 'README.md'], ['sql/midas-user.sql']
];
const routineSources = [
  ['sql/triggers_logs.sql'], ['sql/atualiza_updated_at_analytics.sql', 'sql/monitoramento_dau.sql'],
  ['sql/procedures.sql'], ['sql/funcoes_consumo_metas.sql', 'sql/farm_chicken_stock_timeline.sql', 'sql/midas-resource-import.sql']
];
byId('views').querySelectorAll('.extra-card').forEach((card, i) => card.querySelector('div').prepend(sourceLinks(viewSources[i])));
byId('rotinas').querySelectorAll('.extra-card').forEach((card, i) => card.querySelector('div').prepend(sourceLinks(routineSources[i])));
byId('rpa').querySelectorAll('.extra-card').forEach((card, i) => card.querySelector('h3').after(sourceLinks(i === 5 ? ['scripts/estrutura_banco.py', 'README.md'] : ['scripts/rpa_pre_novo.py', 'README.md'])));
const backupSources = [
  ['scripts/estrutura_banco.py', 'README.md'],
  ['scripts/estrutura_banco.py', 'README.md'],
  ['scripts/estrutura_banco.py', 'README.md'],
  ['.github/workflows/sincroniza-dados-diario.yml', 'README.md'],
  ['scripts/estrutura_banco.py', 'sql/backup_execution_log.sql']
];
byId('backup').querySelectorAll('.extra-card').forEach((card, i) => card.querySelector('h3').after(sourceLinks(backupSources[i])));
const repositoryGroups = [
  ['Tabelas e estrutura', 'Catálogo de colunas, esquema físico, versionamento e metadados.', ['docs/catalogacao_tabelas_colunas.md', 'sql/banco_ouros_fisico.sql', 'sql/versionamento.sql', 'sql/audience_engine_metadata.sql', 'sql/audience_tip_observations.sql', 'sql/farm_simulations.sql']],
  ['Views', 'Consultas analíticas, consumo, acesso MIDAS e monitoramento.', ['sql/views_analytics.sql', 'sql/views_galinhas_consumo.sql', 'sql/midas-user.sql', 'sql/monitoramento_dau.sql', 'sql/analytics_sync_user.sql']],
  ['Triggers, procedures e funções', 'Histórico, atualização de datas, operações e cálculos.', ['sql/triggers_logs.sql', 'sql/atualiza_updated_at_analytics.sql', 'sql/procedures.sql', 'sql/funcoes_consumo_metas.sql', 'sql/farm_chicken_stock_timeline.sql', 'sql/midas-resource-import.sql']],
  ['Importação e sincronização', 'RPA do banco pré, sincronização de estrutura e registro da execução.', ['scripts/rpa_pre_novo.py', 'scripts/estrutura_banco.py', 'sql/backup_execution_log.sql', 'README.md']],
  ['Aplicação e configuração', 'Executor SQL, ordem de execução, automação e testes.', ['scripts/apply_sql.py', 'config.yaml', '.github/workflows/apply-sql-on-main.yml', 'tests/test_apply_sql.py']]
];
repositoryGroups.forEach(([title, description, paths]) => {
  const card = document.createElement('article');
  card.className = 'extra-card extra-content';
  const heading = document.createElement('h3');
  heading.textContent = title;
  const paragraph = document.createElement('p');
  paragraph.textContent = description;
  card.append(heading, sourceLinks(paths), paragraph);
  byId('repository-map').append(card);
});
render();
