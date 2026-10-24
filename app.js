'use strict';

const METRICS = {
  revenue_growth_pct: { label: 'Tăng trưởng doanh thu', unit: '%', icon: '↗', decimals: 1 },
  gross_margin_pct: { label: 'Biên lợi nhuận gộp', unit: '%', icon: '◒', decimals: 1 },
  operating_margin_pct: { label: 'Biên lợi nhuận hoạt động', unit: '%', icon: '⌁', decimals: 1 },
  net_margin_pct: { label: 'Biên lợi nhuận ròng', unit: '%', icon: '◉', decimals: 1 },
  current_ratio_x: { label: 'Hệ số thanh toán hiện hành', unit: 'x', icon: '◫', decimals: 2 },
  quick_ratio_x: { label: 'Hệ số thanh toán nhanh', unit: 'x', icon: '◫', decimals: 2 },
  debt_to_assets_pct: { label: 'Nợ / tài sản', unit: '%', icon: '⇄', decimals: 1 },
  debt_to_equity_x: { label: 'Nợ / vốn chủ sở hữu', unit: 'x', icon: '⇄', decimals: 2 },
  roa_pct: { label: 'ROA', unit: '%', icon: '◒', decimals: 1 },
  roe_pct: { label: 'ROE', unit: '%', icon: '◒', decimals: 1 },
  cfo_margin_pct: { label: 'Biên CFO', unit: '%', icon: '⌁', decimals: 1 },
  cfo_to_net_income_x: { label: 'CFO / lợi nhuận ròng', unit: 'x', icon: '⇆', decimals: 2 },
  free_cash_flow_vnd_mn: { label: 'Dòng tiền tự do (FCF)', unit: 'triệu VND', icon: '₫', decimals: 0 },
  dso_days: { label: 'Số ngày phải thu (DSO)', unit: 'ngày', icon: '◷', decimals: 1 },
  inventory_days: { label: 'Số ngày tồn kho', unit: 'ngày', icon: '▤', decimals: 1 },
  dpo_days: { label: 'Số ngày phải trả (DPO)', unit: 'ngày', icon: '◷', decimals: 1 },
  interest_coverage_x: { label: 'Khả năng trả lãi', unit: 'x', icon: '↗', decimals: 2 },
  working_capital_vnd_mn: { label: 'Vốn lưu động', unit: 'triệu VND', icon: '₫', decimals: 0 },
  risk_score: { label: 'Điểm rủi ro do nguồn cung cấp', unit: 'điểm / 1', icon: '!', decimals: 2 }
};

const TAG_LABELS = {
  CFO_PRESSURE: 'Áp lực dòng tiền',
  CFO_WEAKNESS: 'Dòng tiền hoạt động yếu',
  HIGH_LEVERAGE: 'Đòn bẩy cao',
  LEVERAGE_RISK: 'Rủi ro đòn bẩy',
  INTEREST_BURDEN: 'Gánh nặng lãi vay',
  RECEIVABLES_RISK: 'Rủi ro phải thu',
  INVENTORY_RISK: 'Rủi ro hàng tồn kho',
  GROSS_MARGIN_DECLINE: 'Biên gộp suy giảm',
  MARGIN_DETERIORATION: 'Biên lợi nhuận suy giảm',
  PROFITABILITY_PRESSURE: 'Áp lực sinh lời',
  REVENUE_GROWTH_WEAK_CASH: 'Tăng trưởng và tiền mặt lệch pha',
  STRONG_LIQUIDITY: 'Thanh khoản tốt',
  LOW_LEVERAGE: 'Đòn bẩy thấp',
  STRONG_GROWTH: 'Tăng trưởng mạnh',
  DELEVERAGING: 'Giảm đòn bẩy',
  MARGIN_IMPROVEMENT: 'Biên lợi nhuận cải thiện',
  MARGIN_RECOVERY: 'Biên lợi nhuận phục hồi',
  WORKING_CAPITAL_IMPROVEMENT: 'Vốn lưu động cải thiện'
};
const RISK_TAGS = new Set([
  'CFO_PRESSURE', 'CFO_WEAKNESS', 'HIGH_LEVERAGE', 'LEVERAGE_RISK', 'INTEREST_BURDEN',
  'RECEIVABLES_RISK', 'INVENTORY_RISK', 'GROSS_MARGIN_DECLINE', 'MARGIN_DETERIORATION',
  'PROFITABILITY_PRESSURE', 'REVENUE_GROWTH_WEAK_CASH'
]);
const STATE = { rows: [], headers: [], sourceName: 'submission_output.csv', scope: 'company', company: '', year: '', metrics: [] };
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const getNumber = (row, key) => {
  if (!row || !Object.prototype.hasOwnProperty.call(row, key)) return null;
  const raw = String(row[key] ?? '').trim();
  if (!raw) return null;
  const value = Number(raw.replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
};
const formatNumber = (value, decimals = 1) => value === null || !Number.isFinite(value)
  ? 'Chưa có dữ liệu phù hợp'
  : new Intl.NumberFormat('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
const metricDisplay = (key, value) => {
  if (value === null || !Number.isFinite(value)) return 'Chưa có dữ liệu phù hợp';
  const metric = METRICS[key];
  return `${formatNumber(value, metric?.decimals ?? 1)}${metric?.unit === '%' ? '%' : metric?.unit ? ` ${metric.unit}` : ''}`;
};
const sortedYears = () => [...new Set(STATE.rows.map((row) => Number(row.fiscal_year)).filter(Number.isFinite))].sort((a, b) => a - b);
const sortedCompanies = () => [...new Set(STATE.rows.map((row) => String(row.company_id ?? '').trim()).filter(Boolean))].sort();
const rowFor = (company, year) => STATE.rows.find((row) => row.company_id === company && Number(row.fiscal_year) === Number(year)) || null;
const latestRow = (company, yearLimit = Infinity) => STATE.rows
  .filter((row) => row.company_id === company && Number(row.fiscal_year) <= Number(yearLimit))
  .sort((a, b) => Number(b.fiscal_year) - Number(a.fiscal_year))[0] || null;
const rowsAtYear = (year) => STATE.rows.filter((row) => Number(row.fiscal_year) === Number(year));
const median = (values) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const severityLabel = (severity) => ({ CRITICAL: 'Nghiêm trọng', HIGH: 'Cao', MEDIUM: 'Trung bình', LOW: 'Thấp' })[severity] || 'Chưa phân loại';
const riskTagsFor = (row) => String(row?.alert_tags || '').split(';').map((tag) => tag.trim()).filter((tag) => RISK_TAGS.has(tag));

function parseCsv(text) {
  const records = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell.length === 0) quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n') { row.push(cell.replace(/\r$/, '')); records.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (quoted) throw new Error('CSV có dấu ngoặc kép chưa được đóng.');
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, '')); records.push(row); }
  while (records.length && records[records.length - 1].every((value) => value.trim() === '')) records.pop();
  if (records.length < 2) throw new Error('Tệp CSV không có bản ghi dữ liệu.');
  const headers = records[0].map((value, index) => (index === 0 ? value.replace(/^\uFEFF/, '') : value).trim());
  if (headers.some((header) => !header)) throw new Error('Tệp CSV có tên cột trống.');
  if (new Set(headers).size !== headers.length) throw new Error('Tệp CSV có tên cột bị trùng.');
  const rows = [];
  const malformed = [];
  for (let index = 1; index < records.length; index += 1) {
    const values = records[index];
    if (values.length !== headers.length) { malformed.push(index + 1); continue; }
    const parsed = {};
    headers.forEach((header, column) => { parsed[header] = values[column].trim(); });
    rows.push(parsed);
  }
  if (!headers.includes('company_id') || !headers.includes('fiscal_year')) {
    throw new Error('Thiếu trường bắt buộc company_id hoặc fiscal_year để nhận diện doanh nghiệp và kỳ báo cáo.');
  }
  if (!rows.length) throw new Error('Không tìm thấy bản ghi nào có đủ số cột.');
  return { headers, rows, malformed };
}

function findNumericMetrics() {
  return Object.keys(METRICS).filter((key) => STATE.headers.includes(key) &&
    STATE.rows.some((row) => getNumber(row, key) !== null));
}

function setError(message) {
  $('#loadError').textContent = message;
  $('#loadError').classList.remove('hidden');
  $('#appContent').classList.add('hidden');
  $('#sidebarStatus').textContent = 'Không tải được dữ liệu';
}

async function loadCsv(file) {
  try {
    const text = file ? await file.text() : await fetch('./submission_output.csv', { cache: 'no-store' }).then((response) => {
      if (!response.ok) throw new Error(`Không thể đọc submission_output.csv (HTTP ${response.status}). Hãy mở thư mục bằng VS Code Live Server.`);
      return response.text();
    });
    const parsed = parseCsv(text);
    STATE.rows = parsed.rows;
    STATE.headers = parsed.headers;
    STATE.sourceName = file?.name || 'submission_output.csv';
    STATE.metrics = findNumericMetrics();
    const companies = sortedCompanies();
    const years = sortedYears();
    if (!companies.length || !years.length) throw new Error('Không có mã doanh nghiệp hoặc năm tài chính hợp lệ trong CSV.');
    STATE.company = companies.includes(STATE.company) ? STATE.company : companies[0];
    STATE.year = years.includes(Number(STATE.year)) ? Number(STATE.year) : years[years.length - 1];
    $('#loadError').classList.add('hidden');
    $('#appContent').classList.remove('hidden');
    $('#sidebarStatus').textContent = `${STATE.rows.length} bản ghi đã nạp`;
    render();
    if (parsed.malformed.length) {
      $('#loadError').textContent = `${parsed.malformed.length} dòng bị bỏ qua do số trường không khớp (dòng CSV: ${parsed.malformed.join(', ')}). Các dòng hợp lệ vẫn được hiển thị.`;
      $('#loadError').classList.remove('hidden');
    }
  } catch (error) {
    setError(`Không thể nạp dữ liệu: ${error.message || 'Lỗi không xác định.'} Kiểm tra tên cột, định dạng CSV và chạy trang qua Live Server thay vì mở trực tiếp bằng file://.`);
  }
}

function populateSelect(select, items, selected, labelFn = (item) => item) {
  if (!select) return;
  select.replaceChildren(...items.map((item) => {
    const option = document.createElement('option');
    option.value = String(item);
    option.textContent = labelFn(item);
    option.selected = String(item) === String(selected);
    return option;
  }));
}

function configureSelectors() {
  const companies = sortedCompanies();
  const years = sortedYears();
  populateSelect($('#companyFilter'), companies, STATE.company, (company) => company);
  populateSelect($('#yearFilter'), years, STATE.year, (year) => `Năm ${year}`);
  populateSelect($('#alertCompany'), ['all', ...companies], $('#alertCompany').value || 'all', (company) => company === 'all' ? 'Tất cả doanh nghiệp' : company);
  const metricChoices = STATE.metrics.filter((key) => key !== 'risk_score');
  const options = metricChoices.map((key) => ({ key, label: METRICS[key].label }));
  ['analysisMetric', 'comparisonMetric', 'forecastMetric'].forEach((selector, index) => {
    const element = $( `#${selector}` );
    if (!element) return;
    const previous = element.value;
    element.replaceChildren(...options.map(({ key, label }) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = label;
      option.selected = key === previous || (!previous && key === ({
        analysisMetric: 'net_margin_pct', comparisonMetric: 'net_margin_pct', forecastMetric: 'net_margin_pct'
      })[selector]);
      return option;
    }));
    if (!options.some((option) => option.key === element.value)) element.value = options[0]?.key || '';
  });
  const analysisYears = ['all', ...years];
  populateSelect($('#analysisYear'), analysisYears, $('#analysisYear').value || 'all', (year) => year === 'all' ? 'Tất cả kỳ' : `Đến năm ${year}`);
  const alertTags = [...new Set(STATE.rows.flatMap((row) => riskTagsFor(row)))].sort();
  populateSelect($('#alertTag'), ['all', ...alertTags], $('#alertTag').value || 'all', (tag) => tag === 'all' ? 'Tất cả nhãn' : (TAG_LABELS[tag] || tag));
}

function lineChart(series, unit, labels = {}) {
  const points = series.flatMap((item) => item.points);
  if (!points.length) return '<div class="chart-empty">Chưa có dữ liệu phù hợp cho lựa chọn hiện tại.</div>';
  const width = 720;
  const height = 220;
  const left = 50;
  const right = 18;
  const top = 17;
  const bottom = 37;
  const values = points.map((point) => point.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { min -= Math.abs(min * 0.1) || 1; max += Math.abs(max * 0.1) || 1; }
  const padding = (max - min) * 0.12;
  min -= padding;
  max += padding;
  const allX = [...new Set(points.map((point) => point.x))].sort((a, b) => a - b);
  const xAt = (value) => allX.length === 1 ? (left + width - right) / 2 : left + ((value - allX[0]) / (allX[allX.length - 1] - allX[0])) * (width - left - right);
  const yAt = (value) => top + ((max - value) / (max - min)) * (height - top - bottom);
  const ticks = 4;
  let markup = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(labels.aria || 'Biểu đồ xu hướng')}">`;
  for (let i = 0; i <= ticks; i += 1) {
    const y = top + (height - top - bottom) * (i / ticks);
    const tick = max - (max - min) * (i / ticks);
    markup += `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="#e9eff1" stroke-width="1"/>`;
    markup += `<text x="${left - 8}" y="${y + 3}" text-anchor="end" fill="#89969e" font-size="9">${escapeHtml(formatNumber(tick, 1))}</text>`;
  }
  allX.forEach((x) => {
    const label = labels.xLabels?.[x] ?? x;
    markup += `<text x="${xAt(x)}" y="${height - 12}" text-anchor="middle" fill="#84919a" font-size="9">${escapeHtml(label)}</text>`;
  });
  const palette = ['#119c90', '#63839a', '#d19543', '#8a75b4'];
  series.forEach((item, index) => {
    const color = item.color || palette[index % palette.length];
    const ordered = [...item.points].sort((a, b) => a.x - b.x);
    const path = ordered.map((point, pointIndex) => `${pointIndex ? 'L' : 'M'} ${xAt(point.x).toFixed(1)} ${yAt(point.value).toFixed(1)}`).join(' ');
    if (ordered.length > 1) markup += `<path d="${path}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" ${item.dashed ? 'stroke-dasharray="5 4"' : ''}/>`;
    ordered.forEach((point) => {
      markup += `<circle cx="${xAt(point.x)}" cy="${yAt(point.value)}" r="3.8" fill="${item.hollow ? '#fff' : color}" stroke="${color}" stroke-width="2"><title>${escapeHtml(point.label || `${point.x}: ${metricDisplay(item.metric, point.value)}`)}</title></circle>`;
    });
  });
  markup += '</svg>';
  if (series.length > 1 || series.some((item) => item.name)) {
    markup += `<div class="chart-legend">${series.map((item, index) => `<span><i style="background:${item.color || palette[index % palette.length]}"></i>${escapeHtml(item.name || '')}</span>`).join('')}</div>`;
  }
  return markup;
}

function barChart(items, unit) {
  const valid = items.filter((item) => Number.isFinite(item.value));
  if (!valid.length) return '<div class="chart-empty">Chưa có dữ liệu phù hợp trong cùng kỳ để so sánh.</div>';
  const width = 560;
  const height = 205;
  const left = 45;
  const right = 20;
  const top = 16;
  const bottom = 44;
  const maxAbs = Math.max(...valid.map((item) => Math.abs(item.value)), 1);
  const maximum = Math.max(...valid.map((item) => item.value), 0);
  const minimumMagnitude = Math.abs(Math.min(...valid.map((item) => item.value), 0));
  const baseline = top + (height - top - bottom) * (valid.some((item) => item.value < 0) ? maximum / (maximum + minimumMagnitude) : 1);
  const scale = (height - top - bottom) / (maxAbs * (valid.some((item) => item.value < 0) ? 2 : 1));
  const slot = (width - left - right) / valid.length;
  let markup = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Biểu đồ cột so sánh cùng kỳ">`;
  markup += `<line x1="${left}" y1="${baseline}" x2="${width - right}" y2="${baseline}" stroke="#dfe7ea"/>`;
  valid.forEach((item, index) => {
    const x = left + slot * index + slot * 0.26;
    const barWidth = slot * 0.48;
    const barHeight = Math.abs(item.value) * scale;
    const y = item.value >= 0 ? baseline - barHeight : baseline;
    const color = item.color || (index === 0 ? '#10988d' : '#91a9b5');
    markup += `<rect x="${x}" y="${y}" width="${barWidth}" height="${Math.max(barHeight, 1)}" rx="4" fill="${color}"><title>${escapeHtml(item.label)}: ${escapeHtml(metricDisplay(item.metric, item.value))}</title></rect>`;
    markup += `<text x="${x + barWidth / 2}" y="${item.value >= 0 ? Math.max(y - 7, 10) : y + barHeight + 13}" text-anchor="middle" fill="#647680" font-size="9">${escapeHtml(formatNumber(item.value, 1))}</text>`;
    markup += `<text x="${x + barWidth / 2}" y="${height - 12}" text-anchor="middle" fill="#778791" font-size="9">${escapeHtml(item.label)}</text>`;
  });
  markup += '</svg>';
  return markup;
}

function kpiCard(title, value, meta, icon, unavailable = false, change = '') {
  return `<article class="kpi-card${unavailable ? ' unavailable' : ''}">
    <div class="kpi-top"><span>${escapeHtml(title)}</span><span class="kpi-icon">${escapeHtml(icon)}</span></div>
    <div class="kpi-value">${escapeHtml(value)}</div><div class="kpi-meta">${escapeHtml(meta)}${change}</div>
  </article>`;
}

function changeMarkup(current, previous, metricKey) {
  if (current === null || previous === null || previous === 0) return '';
  const difference = current - previous;
  const decimals = metricKey === 'free_cash_flow_vnd_mn' || metricKey === 'working_capital_vnd_mn' ? 0 : (METRICS[metricKey]?.decimals ?? 1);
  if (Number(difference.toFixed(decimals)) === 0) return '';
  const unit = METRICS[metricKey]?.unit === '%' ? ' điểm %' : METRICS[metricKey]?.unit === 'triệu VND' ? ' triệu VND' : METRICS[metricKey]?.unit ? ` ${METRICS[metricKey].unit}` : '';
  const favorableWhenPositive = !['debt_to_assets_pct', 'debt_to_equity_x', 'dso_days', 'inventory_days', 'dpo_days', 'risk_score'].includes(metricKey);
  const positive = (difference >= 0) === favorableWhenPositive;
  return `<span class="kpi-change ${positive ? 'change-positive' : 'change-negative'}">${difference > 0 ? '+' : ''}${escapeHtml(formatNumber(difference, decimals))}${escapeHtml(unit)}</span>`;
}

function currentMetricValue(metric, selectedRow) {
  if (STATE.scope === 'company') return getNumber(selectedRow, metric);
  return median(rowsAtYear(STATE.year).map((row) => getNumber(row, metric)).filter((value) => value !== null));
}

function renderDashboard() {
  const selectedRow = rowFor(STATE.company, STATE.year);
  const priorRow = rowFor(STATE.company, Number(STATE.year) - 1);
  const currentLabel = `${STATE.company} · năm ${STATE.year}`;
  const groupRows = rowsAtYear(STATE.year);
  const kpis = [];
  kpis.push(kpiCard('Tổng doanh thu', 'Chưa có dữ liệu phù hợp', 'CSV chỉ có tốc độ tăng trưởng', '₫', true));
  kpis.push(kpiCard('Lợi nhuận sau thuế', 'Chưa có dữ liệu phù hợp', 'Không có số tiền lợi nhuận', '₫', true));
  ['net_margin_pct', 'debt_to_assets_pct', 'cfo_to_net_income_x'].forEach((key) => {
    if (!STATE.metrics.includes(key)) return;
    const value = currentMetricValue(key, selectedRow);
    let change = '';
    if (STATE.scope === 'company') change = changeMarkup(value, getNumber(priorRow, key), key);
    const label = STATE.scope === 'company' ? currentLabel : `Trung vị năm ${STATE.year}`;
    kpis.push(kpiCard(METRICS[key].label, metricDisplay(key, value), label, METRICS[key].icon, value === null, change));
  });
  kpis.push(kpiCard('Tổng tài sản', 'Chưa có dữ liệu phù hợp', 'Không có trường tài sản', '▤', true));
  kpis.push(kpiCard('Tổng nợ / nợ vay', 'Chưa có dữ liệu phù hợp', 'Chỉ có tỷ lệ nợ / tài sản', '⇄', true));
  kpis.push(kpiCard('CFO tuyệt đối', 'Chưa có dữ liệu phù hợp', 'Có biên CFO và tỷ lệ CFO / LNST', '⌁', true));
  if (STATE.metrics.includes('free_cash_flow_vnd_mn')) {
    const value = currentMetricValue('free_cash_flow_vnd_mn', selectedRow);
    const change = STATE.scope === 'company' ? changeMarkup(value, getNumber(priorRow, 'free_cash_flow_vnd_mn'), 'free_cash_flow_vnd_mn') : '';
    kpis.push(kpiCard('Dòng tiền tự do (FCF)', metricDisplay('free_cash_flow_vnd_mn', value), STATE.scope === 'company' ? currentLabel : `Trung vị năm ${STATE.year}`, '₫', value === null, change));
  }
  const flaggedCount = (STATE.scope === 'company' ? (selectedRow ? [selectedRow] : []) : groupRows)
    .filter((row) => riskTagsFor(row).length && ['HIGH', 'CRITICAL', 'MEDIUM'].includes(row.predicted_severity)).length;
  kpis.push(kpiCard('Cảnh báo rủi ro', String(flaggedCount), STATE.scope === 'company' ? `${currentLabel} · mức từ trung bình (CSV)` : `Dữ liệu năm ${STATE.year} · mức từ trung bình (CSV)`, '!', false));
  kpis.push(kpiCard('Doanh nghiệp có dữ liệu', STATE.scope === 'company' ? (selectedRow ? '1' : '0') : String(new Set(groupRows.map((row) => row.company_id)).size), `Trên ${groupRows.length} bản ghi năm ${STATE.year}`, '▦', false));
  $('#kpiGrid').innerHTML = kpis.join('');
  $('#scopeNote').textContent = STATE.scope === 'company'
    ? `Phạm vi: ${currentLabel}. Chỉ số thay đổi chỉ hiển thị khi có dữ liệu ở kỳ liền trước; không có dữ liệu được coi là 0.`
    : `Phạm vi: trung vị các doanh nghiệp có giá trị tại năm ${STATE.year} (tối đa ${groupRows.length} bản ghi). Không cộng gộp tỷ lệ; các trường tuyệt đối không có trong CSV vẫn không khả dụng.`;
  const years = sortedYears().filter((year) => year <= Number(STATE.year));
  const series = ['gross_margin_pct', 'operating_margin_pct', 'net_margin_pct'].filter((key) => STATE.metrics.includes(key)).map((key, index) => ({
    metric: key,
    name: METRICS[key].label,
    color: ['#168f86', '#6f91a6', '#d19543'][index],
    points: years.map((year) => ({ x: year, value: getNumber(rowFor(STATE.company, year), key), label: `${STATE.company} · ${year}: ${metricDisplay(key, getNumber(rowFor(STATE.company, year), key))}` })).filter((point) => point.value !== null)
  }));
  $('#dashboardChart').innerHTML = lineChart(series, '%', { aria: `Biên lợi nhuận ${STATE.company}` });
  const row = selectedRow;
  const riskTags = riskTagsFor(row);
  const summary = [
    `<div class="insight-item"><span class="insight-bullet">✓</span><span><strong>${escapeHtml(currentLabel)}</strong><br>${row ? `Mức phân loại nguồn: ${escapeHtml(severityLabel(row.predicted_severity))}; điểm rủi ro ${escapeHtml(metricDisplay('risk_score', getNumber(row, 'risk_score')))}.` : 'Không có bản ghi cho kỳ đang chọn.'}</span></div>`,
    `<div class="insight-item"><span class="insight-bullet">↗</span><span><strong>Chỉ tiêu có thể phân tích</strong><br>${STATE.metrics.length} trường số được nhận diện; thiếu giá trị được giữ trống, không quy về 0.</span></div>`,
    `<div class="insight-item"><span class="insight-bullet">!</span><span><strong>Nhãn rủi ro do tệp cung cấp</strong><br>${riskTags.length ? riskTags.map((tag) => escapeHtml(TAG_LABELS[tag] || tag)).join(', ') : 'Không có nhãn rủi ro trong bản ghi được chọn.'}</span></div>`,
    `<div class="insight-item"><span class="insight-bullet">i</span><span><strong>Thiếu trường cơ bản</strong><br>Không có tên doanh nghiệp, ngành, doanh thu tuyệt đối hoặc báo cáo tài chính gốc.</span></div>`
  ];
  $('#dashboardInsight').innerHTML = summary.join('');
}

function renderAnalysis() {
  const metric = $('#analysisMetric').value;
  const endYear = $('#analysisYear').value === 'all' ? Number(STATE.year) : Number($('#analysisYear').value);
  const years = sortedYears().filter((year) => year <= endYear);
  const points = years.map((year) => {
    const row = rowFor(STATE.company, year);
    return { x: year, value: getNumber(row, metric), label: `${STATE.company} · ${year}: ${metricDisplay(metric, getNumber(row, metric))}` };
  }).filter((point) => point.value !== null);
  $('#analysisChartTitle').textContent = `${METRICS[metric]?.label || 'Chỉ tiêu'} · ${STATE.company}`;
  $('#analysisUnit').textContent = METRICS[metric]?.unit || '';
  $('#analysisChart').innerHTML = lineChart([{ metric, name: METRICS[metric]?.label, points }], METRICS[metric]?.unit, { aria: `Xu hướng ${METRICS[metric]?.label || metric}` });
  const omitted = years.length - points.length;
  $('#analysisSource').textContent = `Nguồn: ${STATE.sourceName} · cột ${metric} · mã ${STATE.company}. ${points.length} kỳ có giá trị${omitted ? `; ${omitted} kỳ thiếu dữ liệu đã loại khỏi biểu đồ` : ''}. Đơn vị theo tên trường nguồn (${METRICS[metric]?.unit || 'chưa xác định'}).`;
}

function renderComparison() {
  const metric = $('#comparisonMetric').value;
  const current = rowFor(STATE.company, STATE.year);
  const values = rowsAtYear(STATE.year).map((row) => getNumber(row, metric)).filter((value) => value !== null);
  const reference = median(values);
  const companyValue = getNumber(current, metric);
  const peers = values.length - (companyValue === null ? 0 : 1);
  $('#comparisonNotice').textContent = `Không có trường ngành trong CSV. Mốc là trung vị trên ${values.length} doanh nghiệp có giá trị cùng kỳ ${STATE.year} (không phải nhóm cùng ngành); ${companyValue === null ? 'doanh nghiệp đang chọn thiếu chỉ tiêu này.' : `có ${peers} doanh nghiệp khác trong nhóm tham chiếu.`}`;
  const items = [
    { label: STATE.company, value: companyValue, color: '#10988d', metric },
    { label: 'Trung vị dữ liệu', value: reference, color: '#94aab5', metric }
  ];
  $('#comparisonChart').innerHTML = barChart(items, METRICS[metric]?.unit);
  $('#comparisonCounts').textContent = `Đưa vào trung vị: ${values.length}/${rowsAtYear(STATE.year).length} bản ghi cùng kỳ có giá trị cho ${METRICS[metric]?.label}. Không sử dụng phép so sánh ngành.`;
  const body = STATE.metrics.filter((key) => ['revenue_growth_pct', 'gross_margin_pct', 'operating_margin_pct', 'net_margin_pct', 'debt_to_assets_pct', 'cfo_margin_pct', 'cfo_to_net_income_x', 'free_cash_flow_vnd_mn', 'dso_days', 'inventory_days', 'interest_coverage_x'].includes(key))
    .map((key) => {
      const selected = getNumber(current, key);
      const groupValues = rowsAtYear(STATE.year).map((row) => getNumber(row, key)).filter((value) => value !== null);
      return `<tr><td>${escapeHtml(METRICS[key].label)}</td><td>${escapeHtml(metricDisplay(key, selected))}</td><td>${escapeHtml(metricDisplay(key, median(groupValues)))}</td></tr>`;
    }).join('');
  $('#comparisonTable').innerHTML = body || '<tr><td class="table-empty" colspan="3">Chưa có chỉ tiêu phù hợp để đối chiếu.</td></tr>';
}

function linearFit(points) {
  const n = points.length;
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / n;
  const meanY = points.reduce((sum, point) => sum + point.value, 0) / n;
  const numerator = points.reduce((sum, point) => sum + (point.x - meanX) * (point.value - meanY), 0);
  const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  if (!denominator) return null;
  const slope = numerator / denominator;
  return { slope, intercept: meanY - slope * meanX, predict: (year) => (meanY - slope * meanX) + slope * year };
}

function renderForecast() {
  const metric = $('#forecastMetric').value;
  const years = sortedYears().filter((year) => year <= Number(STATE.year));
  const points = years.map((year) => ({ x: year, value: getNumber(rowFor(STATE.company, year), metric) })).filter((point) => point.value !== null);
  const consecutive = points.every((point, index) => index === 0 || point.x - points[index - 1].x === 1);
  const nextYear = Number(STATE.year) + 1;
  $('#forecastTitle').textContent = `${METRICS[metric]?.label || 'Chỉ tiêu'} · ${STATE.company}`;
  $('#forecastUnit').textContent = METRICS[metric]?.unit || '';
  if (points.length < 4 || !consecutive) {
    $('#forecastResult').innerHTML = `<strong>Chưa đủ điều kiện để dự đoán.</strong> Cần tối thiểu 4 kỳ liên tục có dữ liệu; hiện có ${points.length} kỳ hợp lệ${consecutive ? '' : ', chuỗi có khoảng trống'}.`;
    $('#forecastDetails').textContent = 'Không tạo giá trị dự báo khi dữ liệu lịch sử không đáp ứng điều kiện.';
    $('#forecastChart').innerHTML = lineChart([{ metric, name: 'Lịch sử', points }], METRICS[metric]?.unit, { aria: 'Dữ liệu lịch sử' });
    return;
  }
  const fit = linearFit(points);
  if (!fit || !Number.isFinite(fit.predict(nextYear))) {
    $('#forecastResult').textContent = 'Chưa thể ước tính với chuỗi dữ liệu này.';
    $('#forecastDetails').textContent = 'Phép hồi quy không tạo được kết quả hữu hạn.';
    $('#forecastChart').innerHTML = '<div class="chart-empty">Chưa có dự báo phù hợp.</div>';
    return;
  }
  const holdoutFit = linearFit(points.slice(0, -1));
  const last = points[points.length - 1];
  const holdoutError = holdoutFit ? Math.abs(holdoutFit.predict(last.x) - last.value) : null;
  const predicted = fit.predict(nextYear);
  const forecastPoints = [...points, { x: nextYear, value: predicted, label: `Ước tính ${nextYear}: ${metricDisplay(metric, predicted)}` }];
  const actualSeries = { metric, name: 'Lịch sử thực tế', color: '#168f86', points };
  const forecastSeries = {
    metric, name: 'Ngoại suy tuyến tính', color: '#d19543', dashed: true,
    points: [{ ...last, label: `Thực tế ${last.x}: ${metricDisplay(metric, last.value)}` }, forecastPoints[forecastPoints.length - 1]]
  };
  $('#forecastResult').innerHTML = `Ước tính cho năm ${nextYear}: <span class="forecast-number">${escapeHtml(metricDisplay(metric, predicted))}</span><br>Phương pháp: hồi quy tuyến tính bình phương tối thiểu trên ${points.length} kỳ liên tiếp.`;
  $('#forecastDetails').textContent = `Kiểm tra giữ lại 1 kỳ: sai số tuyệt đối tại ${last.x} là ${holdoutError === null ? 'không tính được' : metricDisplay(metric, holdoutError)}. Ngoại suy giả định xu hướng tuyến tính tiếp tục; chỉ 1 kỳ kiểm tra không đủ để khẳng định độ chính xác. Nguồn lịch sử: ${STATE.sourceName}, cột ${metric}, ${STATE.company}.`;
  $('#forecastChart').innerHTML = lineChart([actualSeries, forecastSeries], METRICS[metric]?.unit, { aria: 'Lịch sử và ước tính tuyến tính' });
}

function evidenceForAlert(row, tags) {
  const fields = new Set();
  if (tags.some((tag) => tag.includes('CFO') || tag === 'REVENUE_GROWTH_WEAK_CASH')) ['cfo_margin_pct', 'cfo_to_net_income_x', 'free_cash_flow_vnd_mn'].forEach((key) => fields.add(key));
  if (tags.includes('RECEIVABLES_RISK')) ['dso_days', 'revenue_growth_pct'].forEach((key) => fields.add(key));
  if (tags.includes('INVENTORY_RISK')) ['inventory_days', 'revenue_growth_pct'].forEach((key) => fields.add(key));
  if (tags.some((tag) => tag.includes('LEVERAGE') || tag === 'HIGH_LEVERAGE' || tag === 'INTEREST_BURDEN')) ['debt_to_assets_pct', 'debt_to_equity_x', 'interest_coverage_x'].forEach((key) => fields.add(key));
  if (tags.some((tag) => tag.includes('MARGIN') || tag === 'PROFITABILITY_PRESSURE')) ['gross_margin_pct', 'operating_margin_pct', 'net_margin_pct'].forEach((key) => fields.add(key));
  const out = [...fields].filter((key) => STATE.headers.includes(key)).map((key) => ({
    key, value: getNumber(row, key), label: METRICS[key]?.label || key
  }));
  return out;
}

function renderAlerts() {
  const selectedTag = $('#alertTag').value || 'all';
  const selectedSeverity = $('#alertSeverity').value || 'all';
  const selectedCompany = $('#alertCompany').value || 'all';
  const selectedYear = Number(STATE.year);
  const flagged = STATE.rows.filter((row) => Number(row.fiscal_year) === selectedYear)
    .map((row) => ({ row, tags: riskTagsFor(row) }))
    .filter(({ row, tags }) => tags.length && (selectedCompany === 'all' || row.company_id === selectedCompany) &&
      (selectedTag === 'all' || tags.includes(selectedTag)) &&
      (selectedSeverity === 'all' || (selectedSeverity === 'HIGH' ? ['HIGH', 'CRITICAL'].includes(row.predicted_severity) : row.predicted_severity === selectedSeverity)))
    .sort((a, b) => (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].indexOf(a.row.predicted_severity) - ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].indexOf(b.row.predicted_severity)) || (getNumber(b.row, 'risk_score') || 0) - (getNumber(a.row, 'risk_score') || 0));
  $('#alertCount').textContent = `${flagged.length} bản ghi có nhãn rủi ro`;
  if (!flagged.length) {
    $('#alertsList').innerHTML = '<div class="no-alerts">Không có bản ghi phù hợp với bộ lọc trong kỳ này. Điều này không đồng nghĩa doanh nghiệp không có rủi ro.</div>';
    return;
  }
  $('#alertsList').innerHTML = flagged.map(({ row, tags }) => {
    const severity = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(row.predicted_severity) ? row.predicted_severity : 'LOW';
    const evidence = evidenceForAlert(row, tags);
    const evidenceMarkup = evidence.length
      ? evidence.map(({ key, value, label }) => `<div class="evidence-chip"><span>${escapeHtml(label)}</span><strong>${escapeHtml(metricDisplay(key, value))}</strong></div>`).join('')
      : '<div class="evidence-chip"><span>Chỉ số hỗ trợ</span><strong>Chưa có dữ liệu phù hợp</strong></div>';
    const reason = row.alert_reason ? `<p class="chart-footnote">${escapeHtml(row.alert_reason)}</p>` : '';
    return `<article class="alert-card severity-${severity}">
      <div class="alert-title-row"><div><h3>${escapeHtml(tags.map((tag) => TAG_LABELS[tag] || tag).join(' · '))}</h3><div class="alert-subtitle">${escapeHtml(row.company_id)} · Năm ${escapeHtml(row.fiscal_year)} · Điểm nguồn ${escapeHtml(metricDisplay('risk_score', getNumber(row, 'risk_score')))}</div></div><span class="severity-badge severity-${severity}">${escapeHtml(severityLabel(severity))}</span></div>
      <div class="alert-tags">${tags.map((tag) => `<span class="alert-tag">${escapeHtml(TAG_LABELS[tag] || tag)}</span>`).join('')}</div>
      <div class="alert-evidence">${evidenceMarkup}</div>
      ${reason}
      <div class="trace-line">Nguồn xác nhận được: ${escapeHtml(STATE.sourceName)} · cột alert_tags, predicted_severity, risk_score${evidence.length ? `, ${evidence.map(({ key }) => key).join(', ')}` : ''} · mã ${escapeHtml(row.company_id)} · năm ${escapeHtml(row.fiscal_year)}. Nhãn/mức độ là kết quả được cung cấp trong CSV; các chỉ số kèm theo chỉ là dữ liệu hỗ trợ, không khẳng định công thức kích hoạt.</div>
    </article>`;
  }).join('');
}

function fieldDescription(header) {
  if (METRICS[header]) return `${METRICS[header].label}; đơn vị suy ra từ hậu tố trường.`;
  const descriptions = {
    company_id: 'Mã doanh nghiệp trong dữ liệu; không có tên pháp lý.',
    fiscal_year: 'Năm tài chính.',
    risk_score: 'Điểm rủi ro do nguồn cung cấp; thang đo theo dữ liệu (quan sát trong khoảng 0–1).',
    predicted_primary_scenario: 'Nhãn kịch bản do nguồn cung cấp, không phải dự báo định lượng.',
    predicted_severity: 'Mức độ phân loại do nguồn cung cấp.',
    predicted_overall_health: 'Nhãn sức khỏe tổng thể do nguồn cung cấp.',
    alert_tags: 'Các nhãn phân loại rủi ro/điểm tích cực có trong bản ghi.',
    alert_reason: 'Mô tả đi kèm kết quả phân loại nguồn.',
    evidence_fields: 'Mô tả tham chiếu trường/tệp do nguồn cung cấp; một số tệp tham chiếu không có trong thư mục.',
    priority_rank: 'Thứ hạng ưu tiên do nguồn cung cấp.',
    confidence: 'Độ tin cậy do nguồn cung cấp; không có tài liệu hiệu chuẩn.',
    model_name: 'Tên bộ quy tắc/mô hình do nguồn cung cấp.',
    processing_time_ms: 'Thời gian xử lý được ghi trong bản ghi.'
  };
  return descriptions[header] || 'Trường văn bản nguồn; chưa ánh xạ vào chỉ tiêu hiển thị.';
}

function renderData() {
  const years = sortedYears();
  const companies = sortedCompanies();
  const pairs = STATE.rows.map((row) => `${row.company_id}|${row.fiscal_year}`);
  const duplicatePairs = pairs.length - new Set(pairs).size;
  const missingColumns = STATE.headers.filter((header) => STATE.rows.some((row) => !String(row[header] ?? '').trim()));
  const invalidYears = STATE.rows.filter((row) => !Number.isInteger(Number(row.fiscal_year))).length;
  const numericKeys = STATE.metrics;
  const dataStats = [
    ['Tệp đang sử dụng', STATE.sourceName],
    ['Số bản ghi', String(STATE.rows.length)],
    ['Doanh nghiệp', String(companies.length)],
    ['Kỳ báo cáo', years.length ? `${years[0]}–${years[years.length - 1]}` : 'Chưa có']
  ];
  $('#dataOverview').innerHTML = dataStats.map(([label, value]) => `<div class="data-stat"><span>${escapeHtml(label)}</span><strong title="${escapeHtml(value)}">${escapeHtml(value)}</strong></div>`).join('');
  $('#fieldCount').textContent = `${STATE.headers.length} trường`;
  $('#fieldTable').innerHTML = STATE.headers.map((header) => {
    const values = STATE.rows.map((row) => String(row[header] ?? '').trim());
    const present = values.filter(Boolean);
    const numeric = present.length > 0 && present.every((value) => Number.isFinite(Number(value)));
    const type = numeric ? 'Số' : 'Văn bản';
    const unit = METRICS[header]?.unit || (header === 'fiscal_year' ? 'năm' : '—');
    const missing = values.length - present.length;
    const dataStatus = missing ? `${present.length}/${values.length} giá trị · thiếu ${missing}` : `${present.length}/${values.length} giá trị`;
    return `<tr><td><code>${escapeHtml(header)}</code></td><td>${type} · ${escapeHtml(unit)}</td><td>${dataStatus}</td><td>${escapeHtml(fieldDescription(header))}</td></tr>`;
  }).join('');
  const checks = [
    { ok: true, text: `${STATE.rows.length} dòng hợp lệ được nạp, ${STATE.headers.length} cột được nhận diện.` },
    { ok: true, text: `${companies.length} mã doanh nghiệp, ${years.length ? `${years[0]}–${years[years.length - 1]}` : 'không có'}; chưa có cột tên doanh nghiệp hoặc ngành.` },
    { ok: duplicatePairs === 0, text: duplicatePairs ? `Có ${duplicatePairs} khóa doanh nghiệp-năm bị trùng; lựa chọn kỳ có thể không duy nhất.` : 'Không có khóa company_id + fiscal_year bị trùng.' },
    { ok: missingColumns.length === 0, text: missingColumns.length ? `Có ô trống ở: ${missingColumns.join(', ')}. Ô trống không được coi là 0.` : 'Không phát hiện ô trống.' },
    { ok: invalidYears === 0, text: invalidYears ? `${invalidYears} dòng có năm tài chính không hợp lệ.` : 'Năm tài chính đọc được dưới dạng số.' },
    { ok: true, text: `${numericKeys.length} chỉ tiêu số được ánh xạ; hậu tố %, _x, _days và _vnd_mn xác định đơn vị.` },
    { ok: false, text: 'Trường evidence_fields nhắc đến balance_sheet.csv, income_statement.csv, cashflow.csv và financial_notes.csv; các tệp này không có trong thư mục nên không được xác minh.' }
  ];
  $('#qualityChecks').innerHTML = checks.map((item) => `<div class="quality-item"><span class="check${item.ok ? '' : ' warn'}">${item.ok ? '✓' : '!'}</span><span>${escapeHtml(item.text)}</span></div>`).join('');
}

function render() {
  configureSelectors();
  renderDashboard();
  renderAnalysis();
  renderComparison();
  renderForecast();
  renderAlerts();
  renderData();
}

function answerChat(question) {
  const text = question.toLocaleLowerCase('vi');
  const row = rowFor(STATE.company, STATE.year);
  const current = latestRow(STATE.company, STATE.year);
  const riskTags = riskTagsFor(row);
  if (/cảnh báo|rủi ro|alert/.test(text)) {
    return row && riskTags.length
      ? `${STATE.company} năm ${STATE.year}: CSV gắn nhãn ${riskTags.map((tag) => TAG_LABELS[tag] || tag).join(', ')}; mức độ nguồn là ${severityLabel(row.predicted_severity)}, điểm ${metricDisplay('risk_score', getNumber(row, 'risk_score'))}. Đây là phân loại có sẵn trong tệp, không phải kết luận gian lận.`
      : `Không có nhãn rủi ro trong bản ghi ${STATE.company} năm ${STATE.year}. Việc không có nhãn không chứng minh doanh nghiệp không có rủi ro.`;
  }
  if (/so sánh|trung vị|ngành|benchmark/.test(text)) {
    return `Không có trường ngành trong CSV nên không thể so sánh cùng ngành. Có thể tham khảo trung vị của toàn bộ bản ghi năm ${STATE.year}, nhưng đây không phải nhóm đối chứng ngành.`;
  }
  if (/công thức|tính như|formula/.test(text)) {
    return 'Các trường tỷ lệ và công thức đã được cung cấp sẵn trong CSV; tệp này không có số liệu báo cáo gốc để tính lại. Ví dụ cfo_to_net_income_x là tỷ lệ CFO / lợi nhuận ròng theo tên trường, nhưng thiếu trường tiền CFO và lợi nhuận tuyệt đối để xác minh phép tính.';
  }
  if (/\bcfo\b|dòng tiền hoạt động/.test(text)) {
    const value = getNumber(current, 'cfo_margin_pct');
    const ratio = getNumber(current, 'cfo_to_net_income_x');
    return value === null && ratio === null
      ? `Không có số liệu CFO phù hợp cho ${STATE.company} ở kỳ gần nhất đến năm ${STATE.year}.`
      : `Kỳ ${current.fiscal_year} của ${STATE.company}: biên CFO ${metricDisplay('cfo_margin_pct', value)}; CFO / lợi nhuận ròng ${metricDisplay('cfo_to_net_income_x', ratio)}. CSV không có số tiền CFO tuyệt đối để đối chiếu.`;
  }
  if (/\broa\b/.test(text)) return metricAnswer('roa_pct', current);
  if (/\broe\b/.test(text)) return metricAnswer('roe_pct', current);
  const matchedMetric = STATE.metrics.find((key) => {
    const words = METRICS[key].label.toLocaleLowerCase('vi').split(/\s+/).filter((word) => word.length > 3);
    return words.some((word) => text.includes(word)) || text.includes(key.replace(/_/g, ' '));
  });
  if (matchedMetric) {
    const value = getNumber(current, matchedMetric);
    return value === null
      ? `${METRICS[matchedMetric].label} của ${STATE.company} ở kỳ gần nhất có trong dữ liệu (năm ${current?.fiscal_year || STATE.year}) đang thiếu. Không thay giá trị thiếu bằng 0.`
      : `${METRICS[matchedMetric].label} của ${STATE.company} năm ${current.fiscal_year}: ${metricDisplay(matchedMetric, value)}. Nguồn: ${STATE.sourceName}, cột ${matchedMetric}.`;
  }
  if (current) {
    return `Mình có thể tra cứu chỉ tiêu trong CSV cho ${STATE.company} (kỳ gần nhất đến năm ${current.fiscal_year}). Hãy hỏi về biên lợi nhuận, nợ/tài sản, CFO, số ngày phải thu, hàng tồn kho hoặc nhãn cảnh báo. Đây là chatbot thử nghiệm theo quy tắc cục bộ, chưa kết nối AI thật.`;
  }
  return `Chưa có dữ liệu cho ${STATE.company} đến năm ${STATE.year}. Hãy chọn doanh nghiệp hoặc kỳ có bản ghi.`;
}

function metricAnswer(metric, current) {
  const value = getNumber(current, metric);
  return value === null
    ? `${METRICS[metric].label} của ${STATE.company} ở kỳ gần nhất có trong dữ liệu đang thiếu. Không thay giá trị thiếu bằng 0.`
    : `${METRICS[metric].label} của ${STATE.company} năm ${current.fiscal_year}: ${metricDisplay(metric, value)}. Nguồn: ${STATE.sourceName}, cột ${metric}.`;
}

function addChatMessage(text, type) {
  const message = document.createElement('div');
  message.className = `chat-message ${type}`;
  message.textContent = text;
  $('#chatMessages').append(message);
  $('#chatMessages').scrollTop = $('#chatMessages').scrollHeight;
}

function setChatOpen(open) {
  $('#chatWindow').classList.toggle('hidden', !open);
  $('#chatWindow').setAttribute('aria-hidden', String(!open));
  $('#chatToggle').setAttribute('aria-expanded', String(open));
  $('#chatToggle').setAttribute('aria-label', open ? 'Đóng Datalyst AI' : 'Mở Datalyst AI');
  if (open) $('#chatInput').focus();
}

function initInteractions() {
  $('#companyFilter').addEventListener('change', (event) => { STATE.company = event.target.value; render(); });
  $('#yearFilter').addEventListener('change', (event) => { STATE.year = Number(event.target.value); render(); });
  $('#analysisMetric').addEventListener('change', renderAnalysis);
  $('#analysisYear').addEventListener('change', renderAnalysis);
  $('#comparisonMetric').addEventListener('change', renderComparison);
  $('#forecastMetric').addEventListener('change', renderForecast);
  $('#alertSeverity').addEventListener('change', renderAlerts);
  $('#alertTag').addEventListener('change', renderAlerts);
  $('#alertCompany').addEventListener('change', renderAlerts);
  document.querySelectorAll('.scope-button').forEach((button) => button.addEventListener('click', () => {
    STATE.scope = button.dataset.scope;
    document.querySelectorAll('.scope-button').forEach((item) => item.classList.toggle('active', item === button));
    renderDashboard();
  }));
  $('#reloadButton').addEventListener('click', () => loadCsv());
  $('#chatToggle').addEventListener('click', () => setChatOpen($('#chatWindow').classList.contains('hidden')));
  $('#chatClose').addEventListener('click', () => setChatOpen(false));
  $('#chatForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = $('#chatInput');
    const question = input.value.trim();
    if (!question) return;
    addChatMessage(question, 'user');
    input.value = '';
    addChatMessage('Đang tra cứu dữ liệu…', 'system');
    const pending = $('#chatMessages').lastElementChild;
    window.setTimeout(() => {
      pending.textContent = answerChat(question);
      $('#chatMessages').scrollTop = $('#chatMessages').scrollHeight;
    }, 220);
  });
  $('#chatInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      $('#chatForm').requestSubmit();
    }
  });
  $('#chatSuggestions').addEventListener('click', (event) => {
    if (event.target.matches('button')) {
      $('#chatInput').value = event.target.textContent;
      $('#chatForm').requestSubmit();
    }
  });
  $('#menuButton').addEventListener('click', () => {
    $('#sidebar').classList.add('open');
    $('#sidebarScrim').classList.add('open');
  });
  $('#sidebarScrim').addEventListener('click', () => {
    $('#sidebar').classList.remove('open');
    $('#sidebarScrim').classList.remove('open');
  });
  document.querySelectorAll('.nav-link').forEach((link) => link.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach((item) => item.classList.toggle('active', item === link));
    $('#currentSection').textContent = link.textContent.trim();
    $('#sidebar').classList.remove('open');
    $('#sidebarScrim').classList.remove('open');
  }));
  const sections = [...document.querySelectorAll('.page-section')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const active = document.querySelector(`.nav-link[href="#${visible.target.id}"]`);
      if (active) {
        document.querySelectorAll('.nav-link').forEach((item) => item.classList.toggle('active', item === active));
        $('#currentSection').textContent = active.textContent.trim();
      }
    }, { rootMargin: '-15% 0px -70% 0px', threshold: [0, .1, .4] });
    sections.forEach((section) => observer.observe(section));
  }
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.csv,text/csv';
  fileInput.hidden = true;
  fileInput.addEventListener('change', () => { if (fileInput.files?.[0]) loadCsv(fileInput.files[0]); });
  document.body.append(fileInput);
  $('#chooseFileButton').addEventListener('click', () => fileInput.click());
}

document.addEventListener('DOMContentLoaded', () => {
  initInteractions();
  loadCsv();
});
