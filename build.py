import base64
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent
source = root / 'source' / 'docs' / 'catalogacao_tabelas_colunas.md'
text = source.read_text(encoding='utf-8')
sections = []
intro = []
current = None
table = None
for line in text.splitlines():
    if line.startswith('## '):
        current = {'title': line[3:], 'intro': [], 'tables': [], 'items': []}
        sections.append(current)
        table = None
    elif line.startswith('### '):
        table = {'name': line[4:].strip('`'), 'description': [], 'columns': [], 'notes': []}
        current['tables'].append(table)
    elif line.startswith('|'):
        cells = [cell.strip() for cell in line.strip().strip('|').split('|')]
        if table and len(cells) == 3 and cells[0] != 'Coluna' and not set(cells[0]) <= {'-', ':'}:
            table['columns'].append(cells)
    elif line.strip() and not line.startswith('# '):
        if current is None:
            intro.append(line)
        elif table:
            (table['notes'] if table['columns'] else table['description']).append(line)
        elif line.startswith('- '):
            current['items'].append(line[2:])
        else:
            current['intro'].append(line)
assert sections and sum(len(s['tables']) for s in sections) == len(re.findall(r'^### ', text, re.M))
definition_files = [
    'sql/banco_ouros_fisico.sql', 'sql/atualiza_farms-chicken-left.sql',
    'sql/audience_engine_metadata.sql', 'sql/audience_tip_observations.sql',
    'sql/backup_execution_log.sql', 'sql/farm_simulations.sql',
    'sql/midas-resource-import.sql', 'sql/monitoramento_dau.sql', 'sql/versionamento.sql',
]
definitions = {}
for path in definition_files:
    sql = (root / 'source' / path).read_text(encoding='utf-8')
    for name in re.findall(r'\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:\w+\.)?(\w+)', sql, re.I):
        definitions.setdefault(name.lower(), []).append(path)
definitions['controle_scripts_sql'] = ['scripts/apply_sql.py']
tables = {table['name']: table for section in sections for table in section['tables']}
relationships = {name: [] for name in tables}
for child, table in tables.items():
    for column, rules, _ in table['columns']:
        match = re.search(r'FK\s*→\s*`((?:\w+\.)*\w+)`', rules)
        if not match:
            continue
        target, target_column = match.group(1).rsplit('.', 1)
        if target.startswith('public.'):
            target = target[7:]
        if target not in relationships:
            raise ValueError(f'Tabela referenciada não encontrada: {target}')
        field = column.strip('`')
        optional = 'NOT NULL' not in rules.upper()
        detail = f'{target} (1) → {child} (N): {child}.{field} referencia {target}.{target_column}.'
        detail += ' A referência pode ser nula.' if optional else ' Cada registro filho exige uma referência.'
        relationship = {'type': '1:N', 'text': detail}
        relationships[child].append(relationship)
        relationships[target].append(relationship)

composite = {'type': '1:N', 'text': 'enterprise_plans (1) → payments (N): a chave estrangeira composta payments.(id_enterprise_plan, id_enterprise) referencia enterprise_plans.(id, id_enterprise).'}
relationships['enterprise_plans'].append(composite)
relationships['payments'].append(composite)
for left, right, through in [
    ('tips', 'categories', 'tip_categories'), ('farms', 'tips', 'farms_tips'),
    ('farms', 'state_goals', 'farm_goals'), ('enterprises', 'plans', 'enterprise_plans'),
    ('tips', 'audience_snapshot_refs', 'tip_audience_refs'),
    ('farms', 'tips', 'farm_tip_observations'),
    ('state_goals', 'regions_goals', 'state_goal_regions'),
]:
    relation = {'type': 'N:N', 'text': f'{left} (N) ↔ {right} (N), por meio de {through}.'}
    for name in (left, right, through):
        relationships[name].append(relation)
for name in ('notifications', 'device_tokens'):
    relationships[name].append({'type': 'Lógica', 'text': 'O par (user_id, user_role) identifica o usuário conforme seu perfil; não há chave estrangeira declarada para uma tabela única de usuários.'})
for child, parent in [('farms_log', 'farms'), ('lots_log', 'lots'), ('payments_log', 'payments')]:
    relation = {'type': 'Lógica', 'text': f'{child} registra histórico de {parent} por gatilho; o identificador copiado não é uma chave estrangeira declarada.'}
    relationships[child].append(relation)
    relationships[parent].append(relation)
data = json.dumps({'intro': intro, 'sections': sections, 'definitions': definitions, 'relationships': relationships}, ensure_ascii=False).replace('</', '<\\/')
template = (root / 'template.html').read_text(encoding='utf-8')
style = (root / 'dist' / 'style.css').read_text(encoding='utf-8')
font_faces = []
for filename, weight in [('Poppins-Regular.ttf', 400), ('Poppins-SemiBold.ttf', 600), ('Poppins-Bold.ttf', 700)]:
    encoded = base64.b64encode((root / 'fonts' / filename).read_bytes()).decode('ascii')
    font_faces.append(f"@font-face{{font-family:Poppins;src:url(data:font/ttf;base64,{encoded}) format('truetype');font-style:normal;font-weight:{weight};font-display:swap}}")
style = '\n'.join(font_faces) + '\n' + style
app = (root / 'dist' / 'app.js').read_text(encoding='utf-8')
html = template.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + style + '\n</style>')
icon = base64.b64encode((root / 'assets' / 'icone.jpg').read_bytes()).decode('ascii')
html = html.replace('href="assets/icone.jpg"', 'href="data:image/jpeg;base64,' + icon + '"')
html = html.replace('<script src="data.js" defer></script>', '<script>window.CATALOG = ' + data + ';</script>')
html = html.replace('<script src="app.js" defer></script>', '')
html = html.replace('</body>', '<script>\n' + app + '\n</script>\n</body>')
(root / 'index.html').write_text(html, encoding='utf-8')
