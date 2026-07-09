// Jest globalTeardown hook (see package.json > jest.globalTeardown).
// Runs after every unit-test run. If coverage was collected (--coverage /
// npm run test:cov), it rebuilds coverage/dashboard.html from
// coverage/coverage-summary.json so there's a static, human-readable HTML
// report to open in a browser without republishing anywhere.
// No-op when coverage wasn't collected (plain `npm test`).

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SUMMARY_PATH = path.join(ROOT, 'coverage', 'coverage-summary.json');
const OUTPUT_PATH = path.join(ROOT, 'coverage', 'dashboard.html');

const THRESHOLDS = { stmts: 80, branch: 75, func: 80, line: 80 };

function groupNameFor(relPath) {
  // relPath looks like "src/modules/auth/auth.service.ts" or "src/app.controller.ts"
  const parts = relPath.split('/');
  if (parts[1] === 'modules') return 'modules/' + parts[2];
  if (['common', 'config', 'database', 'providers', 'shared', 'types'].includes(parts[1])) {
    return parts[1];
  }
  return 'root';
}

function pct(covered, total) {
  return total === 0 ? 100 : +((covered / total) * 100).toFixed(2);
}

function buildModuleData(summary) {
  const prefix = ROOT.replace(/\\/g, '/') + '/';
  const groups = {};

  for (const [absPath, m] of Object.entries(summary)) {
    if (absPath === 'total') continue;
    const rel = absPath.replace(/\\/g, '/').replace(prefix, '');
    const group = groupNameFor(rel);

    if (!groups[group]) {
      groups[group] = {
        stmtsT: 0, stmtsC: 0,
        branchT: 0, branchC: 0,
        funcT: 0, funcC: 0,
        lineT: 0, lineC: 0,
        files: [],
      };
    }
    const g = groups[group];
    g.stmtsT += m.statements.total; g.stmtsC += m.statements.covered;
    g.branchT += m.branches.total; g.branchC += m.branches.covered;
    g.funcT += m.functions.total; g.funcC += m.functions.covered;
    g.lineT += m.lines.total; g.lineC += m.lines.covered;
    g.files.push({
      name: rel.replace(/^src\//, ''),
      stmts: m.statements.pct,
      branch: m.branches.pct,
      func: m.functions.pct,
      line: m.lines.pct,
      stmtsT: m.statements.total,
    });
  }

  return Object.entries(groups)
    .map(([name, g]) => ({
      name,
      stmts: pct(g.stmtsC, g.stmtsT),
      branch: pct(g.branchC, g.branchT),
      func: pct(g.funcC, g.funcT),
      line: pct(g.lineC, g.lineT),
      stmtsTotal: g.stmtsT,
      files: g.files.sort((a, b) => a.stmts - b.stmts),
    }))
    .sort((a, b) => a.stmts - b.stmts);
}

function renderHtml(moduleData, total, meta) {
  const totalJson = JSON.stringify({
    stmts: total.statements.pct,
    branch: total.branches.pct,
    func: total.functions.pct,
    line: total.lines.pct,
    stmtsTotal: total.statements.total,
  });
  const moduleJson = JSON.stringify(moduleData);
  const thresholdsJson = JSON.stringify(THRESHOLDS);

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Backlog BE — Test Coverage Dashboard</title>
<style>
  .viz-root {
    --surface-1:      #fcfcfb;
    --page:           #f9f9f7;
    --text-primary:   #0b0b0b;
    --text-secondary: #52514e;
    --text-muted:     #898781;
    --gridline:       #e1e0d9;
    --baseline:       #c3c2b7;
    --border:         rgba(11,11,11,0.10);
    --status-good:     #0ca30c;
    --status-warning:  #fab219;
    --status-serious:  #ec835a;
    --status-critical: #d03b3b;
    --series-blue:    #2a78d6;
  }
  @media (prefers-color-scheme: dark) {
    .viz-root {
      --surface-1:      #1a1a19;
      --page:           #0d0d0d;
      --text-primary:   #ffffff;
      --text-secondary: #c3c2b7;
      --text-muted:     #898781;
      --gridline:       #2c2c2a;
      --baseline:       #383835;
      --border:         rgba(255,255,255,0.10);
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    background: var(--page);
    color: var(--text-primary);
  }
  .viz-root {
    max-width: 1080px;
    margin: 0 auto;
    padding: 32px 20px 80px;
  }
  header.page-head { margin-bottom: 28px; }
  header.page-head h1 { font-size: 22px; font-weight: 700; margin: 0 0 6px; }
  header.page-head p { margin: 0; color: var(--text-secondary); font-size: 14px; line-height: 1.5; }
  .badges { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
  .badge {
    font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px;
    background: var(--surface-1); border: 1px solid var(--border); color: var(--text-secondary);
  }
  .badge.pass { color: var(--status-good); }
  .card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
  section { margin-bottom: 32px; }
  section > h2 { font-size: 15px; font-weight: 700; margin: 0 0 4px; }
  section > .section-sub { font-size: 13px; color: var(--text-secondary); margin: 0 0 14px; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  @media (max-width: 720px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
  .stat-tile { padding: 16px; }
  .stat-tile .stat-label {
    font-size: 12px; font-weight: 600; color: var(--text-secondary);
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .stat-tile .stat-value { font-size: 30px; font-weight: 700; font-variant-numeric: tabular-nums; margin: 4px 0 2px; }
  .stat-tile .stat-delta { font-size: 12px; color: var(--text-muted); margin-bottom: 10px; min-height: 16px; }
  .stat-meter { position: relative; height: 10px; border-radius: 5px; background: var(--gridline); overflow: visible; }
  .stat-meter .fill { position: absolute; inset: 0; border-radius: 5px; width: 0%; }
  .stat-meter .gate { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--text-primary); opacity: 0.55; }
  .stat-tile .gate-label { font-size: 11px; color: var(--text-muted); margin-top: 6px; }
  .legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: var(--text-secondary); margin-bottom: 16px; }
  .legend .item { display: flex; align-items: center; gap: 6px; }
  .legend .dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
  .table-scroll { overflow-x: auto; }
  table.cov-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 640px; }
  table.cov-table th {
    text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em;
    color: var(--text-muted); font-weight: 600; padding: 0 10px 8px; border-bottom: 1px solid var(--gridline);
  }
  table.cov-table th.metric, table.cov-table td.metric { width: 21%; }
  table.cov-table td { padding: 9px 10px; border-bottom: 1px solid var(--gridline); vertical-align: middle; }
  table.cov-table tr.total-row td {
    font-weight: 700; border-bottom: 2px solid var(--baseline);
    background: color-mix(in srgb, var(--series-blue) 6%, transparent);
  }
  table.cov-table tr:last-child td { border-bottom: none; }
  .row-name { font-weight: 600; white-space: nowrap; }
  .row-name .sub { display: block; font-weight: 400; color: var(--text-muted); font-size: 11px; }
  .cell-meter { display: flex; align-items: center; gap: 8px; }
  .cell-meter .track { position: relative; flex: 1; height: 8px; border-radius: 4px; background: var(--gridline); min-width: 56px; }
  .cell-meter .track .fill { position: absolute; inset: 0; border-radius: 4px; }
  .cell-meter .pct {
    font-variant-numeric: tabular-nums; font-weight: 600; font-size: 12.5px;
    width: 44px; text-align: right; flex: none; color: var(--text-primary);
  }
  .status-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; display: inline-block; }
  .stat-band { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--text-secondary); }
  details.module-detail {
    border: 1px solid var(--border); border-radius: 10px; background: var(--surface-1);
    margin-bottom: 8px; overflow: hidden;
  }
  details.module-detail summary {
    list-style: none; cursor: pointer; padding: 12px 16px; display: flex;
    align-items: center; justify-content: space-between; gap: 12px; font-size: 13px; font-weight: 600;
  }
  details.module-detail summary::-webkit-details-marker { display: none; }
  details.module-detail summary .chev { color: var(--text-muted); transition: transform 0.15s ease; flex: none; }
  details.module-detail[open] summary .chev { transform: rotate(90deg); }
  details.module-detail summary .sum-right { display: flex; align-items: center; gap: 10px; font-weight: 400; color: var(--text-secondary); }
  details.module-detail .detail-body { padding: 0 16px 14px; border-top: 1px solid var(--gridline); }
  details.module-detail table.cov-table { min-width: 520px; }
  details.module-detail table.cov-table th { padding-top: 12px; }
  footer.note { font-size: 12px; color: var(--text-muted); line-height: 1.6; margin-top: 8px; }
  footer.note code { background: var(--gridline); padding: 1px 5px; border-radius: 4px; font-size: 11.5px; }
</style>
</head>
<body>
<div class="viz-root">
  <header class="page-head">
    <h1>🧪 Backlog BE — Test Coverage Dashboard</h1>
    <p>Tự động sinh lại mỗi khi chạy <code>npm run test:cov</code> · sinh lúc: ${meta.generatedAt}</p>
  </header>

  <section>
    <h2>Tổng quan so với ngưỡng CI (coverageThreshold.global)</h2>
    <p class="section-sub">Mỗi ô: % hiện tại (thanh màu) so với vạch ngưỡng (vạch đen dọc).</p>
    <div class="stat-grid" id="stat-grid"></div>
  </section>

  <section>
    <h2>Coverage theo module</h2>
    <p class="section-sub">Sắp xếp từ thấp → cao (module cần chú ý nhất nằm trên cùng). Hàng đầu là tổng toàn repo.</p>
    <div class="legend">
      <span class="item"><span class="dot" style="background:var(--status-critical)"></span>Critical &lt; 30%</span>
      <span class="item"><span class="dot" style="background:var(--status-serious)"></span>Serious 30–49%</span>
      <span class="item"><span class="dot" style="background:var(--status-warning)"></span>Warning 50–79%</span>
      <span class="item"><span class="dot" style="background:var(--status-good)"></span>Good ≥ 80%</span>
    </div>
    <div class="card table-scroll">
      <table class="cov-table" id="module-table"></table>
    </div>
  </section>

  <section>
    <h2>Chi tiết theo từng file</h2>
    <p class="section-sub">Bấm vào một module để xem coverage từng file bên trong (đã sắp theo thứ tự thấp → cao).</p>
    <div id="detail-list"></div>
  </section>

  <footer class="note">
    Nguồn: <code>coverage/coverage-summary.json</code>. File này (<code>coverage/dashboard.html</code>) được
    <code>test/generate-coverage-dashboard.js</code> (Jest <code>globalTeardown</code>) tự regenerate mỗi lần chạy
    <code>npm run test:cov</code>. Jest cũng có sẵn báo cáo tương tác từng dòng code tại <code>coverage/index.html</code>.
  </footer>
</div>

<script>
(function () {
  var DATA = ${moduleJson};
  var TOTAL = ${totalJson};
  var THRESHOLDS = ${thresholdsJson};

  function band(pct) {
    if (pct >= 80) return 'good';
    if (pct >= 50) return 'warning';
    if (pct >= 30) return 'serious';
    return 'critical';
  }
  function colorVar(pct) { return 'var(--status-' + band(pct) + ')'; }
  function fmt(pct) { return (Math.round(pct * 10) / 10) + '%'; }
  var BAND_LABEL = { good: 'Đạt', warning: 'Cảnh báo', serious: 'Đáng lo', critical: 'Nguy cấp' };
  function bandLabel(pct) { return BAND_LABEL[band(pct)]; }

  var statMeta = [
    { key: 'stmts', label: 'Statements' },
    { key: 'branch', label: 'Branches' },
    { key: 'func', label: 'Functions' },
    { key: 'line', label: 'Lines' },
  ];
  var statGrid = document.getElementById('stat-grid');
  statMeta.forEach(function (s) {
    var val = TOTAL[s.key];
    var gate = THRESHOLDS[s.key];
    var diff = (val - gate).toFixed(1);
    var deltaText = val >= gate
      ? ('+' + diff + ' pts trên ngưỡng')
      : (Math.abs(diff) + ' pts dưới ngưỡng ' + gate + '%');
    var tile = document.createElement('div');
    tile.className = 'card stat-tile';
    tile.innerHTML =
      '<div class="stat-label">' + s.label + '</div>' +
      '<div class="stat-value">' + fmt(val) + '</div>' +
      '<div class="stat-band"><span class="status-dot" style="background:' + colorVar(val) + '"></span>' + bandLabel(val) + '</div>' +
      '<div class="stat-delta">' + deltaText + '</div>' +
      '<div class="stat-meter">' +
        '<div class="fill" style="width:' + val + '%;background:' + colorVar(val) + '"></div>' +
        '<div class="gate" style="left:' + gate + '%"></div>' +
      '</div>' +
      '<div class="gate-label">ngưỡng CI: ' + gate + '%</div>';
    statGrid.appendChild(tile);
  });

  function meterCell(pct) {
    return '<div class="cell-meter">' +
      '<span class="status-dot" style="background:' + colorVar(pct) + '"></span>' +
      '<div class="track"><div class="fill" style="width:' + Math.max(pct, 2) + '%;background:' + colorVar(pct) + '"></div></div>' +
      '<span class="pct">' + fmt(pct) + '</span>' +
    '</div>';
  }

  function headRow() {
    return '<thead><tr>' +
      '<th>Module</th>' +
      '<th class="metric">Statements</th>' +
      '<th class="metric">Branches</th>' +
      '<th class="metric">Functions</th>' +
      '<th class="metric">Lines</th>' +
      '</tr></thead>';
  }

  function moduleRow(g, isTotal) {
    return '<tr' + (isTotal ? ' class="total-row"' : '') + '>' +
      '<td class="row-name">' + g.name + (g.stmtsTotal !== undefined ? '<span class="sub">' + g.stmtsTotal + ' statements</span>' : '') + '</td>' +
      '<td class="metric">' + meterCell(g.stmts) + '</td>' +
      '<td class="metric">' + meterCell(g.branch) + '</td>' +
      '<td class="metric">' + meterCell(g.func) + '</td>' +
      '<td class="metric">' + meterCell(g.line) + '</td>' +
      '</tr>';
  }

  var moduleTable = document.getElementById('module-table');
  var rowsHtml = headRow() + '<tbody>';
  rowsHtml += moduleRow(Object.assign({ name: 'TOTAL (all files)' }, TOTAL), true);
  DATA.forEach(function (g) { rowsHtml += moduleRow(g, false); });
  rowsHtml += '</tbody>';
  moduleTable.innerHTML = rowsHtml;

  var detailList = document.getElementById('detail-list');
  DATA.forEach(function (g) {
    if (!g.files || g.files.length === 0) return;
    var det = document.createElement('details');
    det.className = 'module-detail';
    var fileRows = g.files.map(function (f) {
      return moduleRow({ name: f.name, stmts: f.stmts, branch: f.branch, func: f.func, line: f.line }, false);
    }).join('');
    det.innerHTML =
      '<summary>' +
        '<span><span class="chev">▶</span> ' + g.name + '</span>' +
        '<span class="sum-right">' + g.files.length + ' file(s) · <span class="status-dot" style="background:' + colorVar(g.stmts) + '"></span> <strong style="color:var(--text-primary)">' + fmt(g.stmts) + '</strong></span>' +
      '</summary>' +
      '<div class="detail-body table-scroll"><table class="cov-table">' + headRow() + '<tbody>' + fileRows + '</tbody></table></div>';
    detailList.appendChild(det);
  });
})();
</script>
</body>
</html>
`;
}

module.exports = async function generateCoverageDashboard() {
  // Note: Jest calls globalTeardown as (globalConfig, projectConfig) — no
  // test-result counts are available here, so the dashboard only reports
  // coverage numbers plus a generation timestamp.
  if (!fs.existsSync(SUMMARY_PATH)) {
    // No --coverage flag was passed for this run (e.g. plain `npm test`).
    return;
  }

  const summary = JSON.parse(fs.readFileSync(SUMMARY_PATH, 'utf8'));
  const moduleData = buildModuleData(summary);

  const meta = {
    generatedAt: new Date().toLocaleString('vi-VN'),
  };

  const html = renderHtml(moduleData, summary.total, meta);
  fs.writeFileSync(OUTPUT_PATH, html, 'utf8');
  // eslint-disable-next-line no-console
  console.log('\n📊 Coverage dashboard updated: coverage/dashboard.html\n');
};
