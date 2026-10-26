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
const STATE = { rows: [], headers: [], sourceName: 'submission_output.csv', metrics: [], page: 'dashboard', filters: { dashboard: { company: 'all', year: 'all' }, analysis: { companies: 'all', year: 'all' }, comparison: { year: 'all' }, forecast: { company: 'all', year: 'all' }, alerts: { company: 'all', year: 'all' }, data: { company: 'all', year: 'all' } } };
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
const sortedYears = () => [...new Set(STATE.rows.map((row) => {
  const raw = String(row.fiscal_year ?? '').trim();
  const year = Number(raw);
  return raw && Number.isInteger(year) && year > 0 ? year : null;
}).filter((year) => year !== null))].sort((a, b) => a - b);
const sortedCompanies = () => [...new Set(STATE.rows.map((row) => String(row.company_id ?? '').trim()).filter(Boolean))].sort();
const rowFor = (company, year) => STATE.rows.find((row) => row.company_id === company && Number(row.fiscal_year) === Number(year)) || null;
const latestRow = (company, yearLimit = Infinity) => STATE.rows
  .filter((row) => row.company_id === company && Number(row.fiscal_year) <= Number(yearLimit))
  .sort((a, b) => Number(b.fiscal_year) - Number(a.fiscal_year))[0] || null;
const rowsAtYear = (year) => STATE.rows.filter((row) => Number(row.fiscal_year) === Number(year));
const inScope = (row, filters) => (!filters.company || filters.company === 'all' || row.company_id === filters.company) && (!filters.year || filters.year === 'all' || Number(row.fiscal_year) === Number(filters.year));
const scopedRows = (filters) => STATE.rows.filter((row) => inScope(row, filters));
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
    Object.values(STATE.filters).forEach((filter) => {
      if ('company' in filter && filter.company !== 'all' && !companies.includes(filter.company)) filter.company = 'all';
      if ('year' in filter && filter.year !== 'all' && !years.includes(Number(filter.year))) filter.year = 'all';
    });
    if (Array.isArray(STATE.filters.analysis.companies)) STATE.filters.analysis.companies = STATE.filters.analysis.companies.filter((company) => companies.includes(company));
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
  [['dashboardCompany','dashboard'],['forecastCompany','forecast'],['alertCompany','alerts'],['dataCompany','data']].forEach(([id, key]) => populateSelect($(`#${id}`), ['all', ...companies], STATE.filters[key].company, (company) => company === 'all' ? 'Tất cả doanh nghiệp' : company));
  [['dashboardYear','dashboard'],['analysisYear','analysis'],['comparisonYear','comparison'],['forecastYear','forecast'],['alertYear','alerts'],['dataYear','data']].forEach(([id, key]) => populateSelect($(`#${id}`), ['all', ...years], STATE.filters[key].year, (year) => year === 'all' ? 'Tất cả các năm' : `Năm ${year}`));
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
  const analysisCompanies = $('#analysisCompanies');
  const previousCompanies = STATE.filters.analysis.companies;
  analysisCompanies.innerHTML = `<label class="company-option"><input type="checkbox" value="all" ${previousCompanies === 'all' ? 'checked' : ''}>Tất cả doanh nghiệp</label>${companies.map((company) => `<label class="company-option"><input type="checkbox" value="${escapeHtml(company)}" ${previousCompanies === 'all' || previousCompanies.includes(company) ? 'checked' : ''}>${escapeHtml(company)}</label>`).join('')}`;
  $('#analysisCompanySummary').textContent = previousCompanies === 'all' ? 'Tất cả doanh nghiệp' : previousCompanies.length === 1 ? previousCompanies[0] : `${previousCompanies.length} doanh nghiệp đã chọn`;
  const alertTags = [...new Set(STATE.rows.flatMap((row) => riskTagsFor(row)))].sort();
  populateSelect($('#alertTag'), ['all', ...alertTags], $('#alertTag').value || 'all', (tag) => tag === 'all' ? 'Tất cả nhãn' : (TAG_LABELS[tag] || tag));
  renderChatSuggestions();
}

function renderChatSuggestions() {
  const groups = [
    ['Tổng quan', ['Hãy đánh giá tổng quan tình hình tài chính của doanh nghiệp.', 'Những chỉ tiêu nào đang có biến động đáng chú ý?', 'Doanh nghiệp cần theo dõi những rủi ro tài chính nào?']],
    ['Doanh thu và lợi nhuận', ['Doanh thu và lợi nhuận đã thay đổi như thế nào qua các năm?', 'Biên lợi nhuận có xu hướng cải thiện hay suy giảm?', 'Hãy chỉ ra các năm có biến động lợi nhuận đáng chú ý.']],
    ['Dòng tiền, tài sản và nợ', ['Dòng tiền hoạt động có ổn định không?', 'Tình hình nợ và khả năng thanh toán thay đổi như thế nào?', 'Công nợ phải thu và hàng tồn kho có diễn biến gì?']],
    ['So sánh doanh nghiệp', ['Doanh nghiệp nào có biên lợi nhuận cao nhất trong nhóm dữ liệu?', 'Hãy so sánh doanh thu và lợi nhuận giữa các doanh nghiệp.', 'Doanh nghiệp nào có diễn biến tài chính đáng chú ý nhất?']],
    ['Cảnh báo và dự báo', ['Giải thích những cảnh báo rủi ro quan trọng nhất.', 'Những chỉ tiêu nào có nguy cơ suy giảm trong các năm tới?', 'Hãy giải thích kết quả dự báo tài chính hiện tại.']]
  ];
  const available = (key) => STATE.metrics.includes(key);
  $('#chatSuggestions').innerHTML = groups.map(([title, questions]) => {
    const filtered = questions.filter((question) => {
      if (/doanh thu/.test(question)) return available('revenue_growth_pct');
      if (/biên lợi nhuận/.test(question)) return available('gross_margin_pct') || available('operating_margin_pct') || available('net_margin_pct');
      if (/dòng tiền hoạt động/.test(question)) return available('cfo_margin_pct') || available('cfo_to_net_income_x');
      if (/nợ và khả năng thanh toán/.test(question)) return available('debt_to_assets_pct') || available('current_ratio_x');
      if (/phải thu/.test(question)) return available('dso_days');
      if (/tồn kho/.test(question)) return available('inventory_days');
      if (/cảnh báo|rủi ro/.test(question)) return STATE.rows.some((row) => riskTagsFor(row).length);
      if (/dự báo|suy giảm/.test(question)) return STATE.metrics.some((key) => !['risk_score'].includes(key));
      return true;
    });
    return filtered.length ? `<div class="suggestion-group"><strong>${escapeHtml(title)}</strong>${filtered.map((question) => `<button type="button">${escapeHtml(question)}</button>`).join('')}</div>` : '';
  }).join('');
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
    let segment = [];
    const drawSegment = () => {
      if (segment.length < 2) return;
      const path = segment.map((point, pointIndex) => `${pointIndex ? 'L' : 'M'} ${xAt(point.x).toFixed(1)} ${yAt(point.value).toFixed(1)}`).join(' ');
      markup += `<path d="${path}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" ${item.dashed ? 'stroke-dasharray="5 4"' : ''}/>`;
    };
    ordered.forEach((point) => {
      if (segment.length && point.x - segment[segment.length - 1].x > 1) { drawSegment(); segment = []; }
      segment.push(point);
    });
    drawSegment();
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
  const width = Math.max(560, valid.length * 54 + 65);
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
  let markup = `<div class="chart-scroll"><svg style="width:${width}px;max-width:none" viewBox="0 0 ${width} ${height}" role="img" aria-label="Company comparison chart">`;
  markup += `<line x1="${left}" y1="${baseline}" x2="${width - right}" y2="${baseline}" stroke="#dfe7ea"/>`;
  valid.forEach((item, index) => {
    const x = left + slot * index + slot * 0.26;
    const barWidth = slot * 0.48;
    const barHeight = Math.abs(item.value) * scale;
    const y = item.value >= 0 ? baseline - barHeight : baseline;
    const color = item.color || (index === 0 ? '#10988d' : '#91a9b5');
    markup += `<rect x="${x}" y="${y}" width="${barWidth}" height="${Math.max(barHeight, 1)}" rx="4" fill="${color}"><title>${escapeHtml(item.tooltip || item.label)}: ${escapeHtml(metricDisplay(item.metric, item.value))}</title></rect>`;
    markup += `<text x="${x + barWidth / 2}" y="${item.value >= 0 ? Math.max(y - 7, 10) : y + barHeight + 13}" text-anchor="middle" fill="#647680" font-size="9">${escapeHtml(formatNumber(item.value, 1))}</text>`;
    markup += `<text x="${x + barWidth / 2}" y="${height - 12}" text-anchor="middle" fill="#778791" font-size="9">${escapeHtml(item.label)}</text>`;
  });
  markup += '</svg></div>';
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

function renderDashboard() {
  const filters = STATE.filters.dashboard;
  const visibleRows = scopedRows(filters);
  const years = sortedYears().filter((year) => filters.year === 'all' || year === Number(filters.year));
  const latestYear = years[years.length - 1];
  const currentRows = visibleRows.filter((row) => Number(row.fiscal_year) === latestYear);
  const companyRows = filters.company === 'all'
    ? sortedCompanies().map((company) => filters.year === 'all' ? latestRow(company, latestYear) : rowFor(company, latestYear)).filter(Boolean)
    : [filters.year === 'all' ? latestRow(filters.company, latestYear) : rowFor(filters.company, latestYear)].filter(Boolean);
  const selectedRow = companyRows.length === 1 ? companyRows[0] : null;
  const priorRow = selectedRow ? rowFor(selectedRow.company_id, Number(selectedRow.fiscal_year) - 1) : null;
  const currentLabel = filters.company === 'all' ? `Tất cả doanh nghiệp · ${latestYear ?? 'không có kỳ'}` : `${filters.company} · năm ${latestYear ?? 'không có kỳ'}`;
  const groupRows = currentRows;
  const kpis = [];
  kpis.push(kpiCard('Tổng doanh thu', 'Chưa có dữ liệu phù hợp', 'CSV chỉ có tốc độ tăng trưởng', '₫', true));
  kpis.push(kpiCard('Lợi nhuận sau thuế', 'Chưa có dữ liệu phù hợp', 'Không có số tiền lợi nhuận', '₫', true));
  ['net_margin_pct', 'debt_to_assets_pct', 'cfo_to_net_income_x'].forEach((key) => {
    if (!STATE.metrics.includes(key)) return;
    const values = companyRows.map((row) => getNumber(row, key)).filter((value) => value !== null);
    const value = selectedRow ? getNumber(selectedRow, key) : median(values);
    let change = '';
    if (selectedRow) change = changeMarkup(value, getNumber(priorRow, key), key);
    const label = selectedRow ? currentLabel : `Trung vị ${companyRows.length} doanh nghiệp · ${latestYear ?? '—'}`;
    kpis.push(kpiCard(METRICS[key].label, metricDisplay(key, value), label, METRICS[key].icon, value === null, change));
  });
  kpis.push(kpiCard('Tổng tài sản', 'Chưa có dữ liệu phù hợp', 'Không có trường tài sản', '▤', true));
  kpis.push(kpiCard('Tổng nợ / nợ vay', 'Chưa có dữ liệu phù hợp', 'Chỉ có tỷ lệ nợ / tài sản', '⇄', true));
  kpis.push(kpiCard('CFO tuyệt đối', 'Chưa có dữ liệu phù hợp', 'Có biên CFO và tỷ lệ CFO / LNST', '⌁', true));
  if (STATE.metrics.includes('free_cash_flow_vnd_mn')) {
    const values = companyRows.map((row) => getNumber(row, 'free_cash_flow_vnd_mn')).filter((value) => value !== null);
    const value = selectedRow ? getNumber(selectedRow, 'free_cash_flow_vnd_mn') : median(values);
    const change = selectedRow ? changeMarkup(value, getNumber(priorRow, 'free_cash_flow_vnd_mn'), 'free_cash_flow_vnd_mn') : '';
    kpis.push(kpiCard('Dòng tiền tự do (FCF)', metricDisplay('free_cash_flow_vnd_mn', value), selectedRow ? currentLabel : `Trung vị ${companyRows.length} doanh nghiệp · ${latestYear ?? '—'}`, '₫', value === null, change));
  }
  const flaggedCount = (selectedRow ? [selectedRow] : groupRows)
    .filter((row) => riskTagsFor(row).length && ['HIGH', 'CRITICAL', 'MEDIUM'].includes(row.predicted_severity)).length;
  kpis.push(kpiCard('Cảnh báo rủi ro', String(flaggedCount), `${currentLabel} · mức từ trung bình (CSV)`, '!', false));
  kpis.push(kpiCard('Doanh nghiệp có dữ liệu', String(new Set(groupRows.map((row) => row.company_id)).size), `Trên ${groupRows.length} bản ghi tại kỳ ${latestYear ?? '—'}`, '▦', false));
  $('#kpiGrid').innerHTML = kpis.join('');
  $('#scopeNote').textContent = `Phạm vi Dashboard: ${filters.company === 'all' ? 'tất cả doanh nghiệp' : filters.company} · ${filters.year === 'all' ? 'tất cả các năm' : `năm ${filters.year}`}. Biểu đồ tỷ lệ dùng trung vị theo kỳ; dữ liệu thiếu không được coi là 0.`;
  const series = ['gross_margin_pct', 'operating_margin_pct', 'net_margin_pct'].filter((key) => STATE.metrics.includes(key)).map((key, index) => ({
    metric: key, name: METRICS[key].label, color: ['#168f86', '#6f91a6', '#d19543'][index],
    points: years.map((year) => {
      const rows = STATE.rows.filter((row) => (filters.company === 'all' || row.company_id === filters.company) && Number(row.fiscal_year) === year);
      const value = filters.company === 'all' ? median(rows.map((row) => getNumber(row, key)).filter((v) => v !== null)) : getNumber(rowFor(filters.company, year), key);
      return { x: year, value, label: `${filters.company === 'all' ? 'Trung vị các doanh nghiệp' : filters.company} · ${year}: ${metricDisplay(key, value)}` };
    }).filter((point) => point.value !== null)
  }));
  $('#dashboardChart').innerHTML = lineChart(series, '%', { aria: `Biên lợi nhuận · ${filters.company}` });
  const row = selectedRow;
  const riskTags = riskTagsFor(row);
  const summary = [
    `<div class="insight-item"><span class="insight-bullet">✓</span><span><strong>${escapeHtml(currentLabel)}</strong><br>${row ? `Mức phân loại nguồn: ${escapeHtml(severityLabel(row.predicted_severity))}; điểm rủi ro ${escapeHtml(metricDisplay('risk_score', getNumber(row, 'risk_score')))}.` : filters.company === 'all' ? `${currentRows.length} bản ghi trong kỳ; các tỷ lệ được trình bày bằng trung vị, không cộng gộp.` : 'Không có bản ghi cho kỳ đang chọn.'}</span></div>`,
    `<div class="insight-item"><span class="insight-bullet">↗</span><span><strong>Chỉ tiêu có thể phân tích</strong><br>${STATE.metrics.length} trường số được nhận diện; thiếu giá trị được giữ trống, không quy về 0.</span></div>`,
    `<div class="insight-item"><span class="insight-bullet">!</span><span><strong>Nhãn rủi ro do tệp cung cấp</strong><br>${riskTags.length ? riskTags.map((tag) => escapeHtml(TAG_LABELS[tag] || tag)).join(', ') : 'Không có nhãn rủi ro trong bản ghi được chọn.'}</span></div>`,
    `<div class="insight-item"><span class="insight-bullet">i</span><span><strong>Thiếu trường cơ bản</strong><br>Không có tên doanh nghiệp, ngành, doanh thu tuyệt đối hoặc báo cáo tài chính gốc.</span></div>`
  ];
  $('#dashboardInsight').innerHTML = summary.join('');
}

function renderAnalysis() {
  const metric = $('#analysisMetric').value;
  const filters = STATE.filters.analysis;
  const years = sortedYears().filter((year) => filters.year === 'all' || year === Number(filters.year));
  const companies = filters.companies === 'all' ? sortedCompanies() : filters.companies;
  const palette = ['#108f86','#527f9b','#d28a39','#8067aa','#c45f69','#4e9b64','#ba6c37','#4582b7','#9b8b37','#bb568e','#4a9b9b','#777f8a'];
  const series = companies.map((company, index) => ({ metric, name: company, color: palette[index % palette.length], points: years.map((year) => {
    const row = rowFor(company, year); const value = getNumber(row, metric);
    return { x: year, value, label: `${company} · ${year}: ${metricDisplay(metric, value)}` };
  }).filter((point) => point.value !== null) })).filter((item) => item.points.length);
  const omitted = companies.length - series.length;
  $('#analysisChartTitle').textContent = `${METRICS[metric]?.label || 'Chỉ tiêu'} · ${series.length} doanh nghiệp có dữ liệu`;
  $('#analysisUnit').textContent = METRICS[metric]?.unit || '';
  $('#analysisChart').innerHTML = lineChart(series, METRICS[metric]?.unit, { aria: `Xu hướng ${METRICS[metric]?.label || metric}` });
  $('#analysisSource').textContent = `Nguồn: ${STATE.sourceName} · cột ${metric}. ${years.length} năm trong phạm vi; ${omitted ? `${omitted} doanh nghiệp không có giá trị hợp lệ và đã được bỏ qua. ` : ''}Đơn vị: ${METRICS[metric]?.unit || 'chưa xác định'}.`;
}

function renderComparison() {
  const metric = $('#comparisonMetric').value;
  const year = STATE.filters.comparison.year;
  const companies = sortedCompanies();
  const items = companies.map((company) => {
    const row = year === 'all' ? latestRow(company) : rowFor(company, year);
    return { label: company, tooltip: `${company} · năm ${row?.fiscal_year ?? '—'}`, value: getNumber(row, metric), metric };
  }).filter((item) => item.value !== null);
  $('#comparisonNotice').textContent = `Không có trường ngành trong CSV. So sánh các doanh nghiệp có dữ liệu${year === 'all' ? ' tại kỳ gần nhất có sẵn của từng doanh nghiệp' : ` trong năm ${year}`}; không đại diện nhóm cùng ngành.`;
  $('#comparisonChart').innerHTML = barChart(items, METRICS[metric]?.unit);
  $('#comparisonCounts').textContent = `${items.length} doanh nghiệp có giá trị cho ${METRICS[metric]?.label}. Đơn vị chung: ${METRICS[metric]?.unit}; khi chọn tất cả năm, mỗi doanh nghiệp dùng kỳ gần nhất của chính mình.`;
  const body = STATE.metrics.filter((key) => ['revenue_growth_pct', 'gross_margin_pct', 'operating_margin_pct', 'net_margin_pct', 'debt_to_assets_pct', 'cfo_margin_pct', 'cfo_to_net_income_x', 'free_cash_flow_vnd_mn', 'dso_days', 'inventory_days', 'interest_coverage_x'].includes(key))
    .map((key) => {
      const values = companies.map((company) => getNumber(year === 'all' ? latestRow(company) : rowFor(company, year), key)).filter((value) => value !== null);
      return `<tr><td>${escapeHtml(METRICS[key].label)}</td><td>${escapeHtml(metricDisplay(key, median(values)))}</td><td>${values.length}</td></tr>`;
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
  const filters = STATE.filters.forecast;
  const company = filters.company;
  if (company === 'all') {
    $('#forecastTitle').textContent = `${METRICS[metric]?.label || 'Chỉ tiêu'} · chọn một doanh nghiệp`;
    $('#forecastResult').innerHTML = '<strong>Dự báo cần một doanh nghiệp cụ thể.</strong> Hãy chọn doanh nghiệp trong bộ lọc của màn hình này.';
    $('#forecastDetails').textContent = 'Không tạo dự báo tổng hợp từ chuỗi lịch sử của nhiều doanh nghiệp.';
    $('#forecastChart').innerHTML = '<div class="chart-empty">Chọn một doanh nghiệp để xem chuỗi thực tế và kỳ dự báo.</div>';
    return;
  }
  const years = sortedYears().filter((year) => filters.year === 'all' || year <= Number(filters.year));
  const points = years.map((year) => ({ x: year, value: getNumber(rowFor(company, year), metric) })).filter((point) => point.value !== null);
  const consecutive = points.every((point, index) => index === 0 || point.x - points[index - 1].x === 1);
  const nextYear = Math.max(...points.map((point) => point.x)) + 1;
  $('#forecastTitle').textContent = `${METRICS[metric]?.label || 'Chỉ tiêu'} · ${company}`;
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
  const changePct = last.value === 0 ? null : ((predicted - last.value) / Math.abs(last.value)) * 100;
  const direction = Math.abs(predicted - last.value) <= Math.max(Math.abs(last.value) * 0.01, 10 ** -(METRICS[metric]?.decimals ?? 1)) ? 'đi ngang tương đối' : predicted > last.value ? 'tăng' : 'giảm';
  $('#forecastResult').innerHTML = `<strong>Nhận định dự báo · ${escapeHtml(company)} · ${escapeHtml(METRICS[metric]?.label || metric)} · năm ${nextYear}</strong><br>Xu hướng ngoại suy ${direction}. Năm ${nextYear}: <span class="forecast-number">${escapeHtml(metricDisplay(metric, predicted))}</span>${changePct === null ? ' (không tính phần trăm thay đổi vì kỳ gần nhất bằng 0).' : `; thay đổi ${changePct > 0 ? '+' : ''}${formatNumber(changePct, 1)}% so với năm ${last.x}.`} Phương pháp hồi quy tuyến tính trên ${points.length} kỳ thực tế.`;
  $('#forecastDetails').textContent = `Kiểm tra giữ lại 1 kỳ: sai số tuyệt đối tại ${last.x} là ${holdoutError === null ? 'không tính được' : metricDisplay(metric, holdoutError)}. Ngoại suy giả định xu hướng tuyến tính tiếp tục; chỉ 1 kỳ kiểm tra không đủ để khẳng định độ chính xác. Giá trị sau năm ${last.x} là dự báo, không phải số liệu thực tế. Nguồn lịch sử: ${STATE.sourceName}, cột ${metric}, ${company}.`;
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
  const selectedYear = STATE.filters.alerts.year;
  const flagged = STATE.rows.filter((row) => (selectedYear === 'all' || Number(row.fiscal_year) === Number(selectedYear)) && (selectedCompany === 'all' || row.company_id === selectedCompany))
    .map((row) => ({ row, tags: riskTagsFor(row) }))
    .filter(({ row, tags }) => tags.length &&
      (selectedTag === 'all' || tags.includes(selectedTag)) &&
      (selectedSeverity === 'all' || (selectedSeverity === 'HIGH' ? ['HIGH', 'CRITICAL'].includes(row.predicted_severity) : row.predicted_severity === selectedSeverity)))
    .sort((a, b) => (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].indexOf(a.row.predicted_severity) - ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].indexOf(b.row.predicted_severity)) || (getNumber(b.row, 'risk_score') || 0) - (getNumber(a.row, 'risk_score') || 0));
  $('#alertCount').textContent = `${flagged.length} bản ghi có nhãn rủi ro trong phạm vi`;
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
  const filters = STATE.filters.data;
  const filteredRows = scopedRows(filters);
  const pairs = filteredRows.map((row) => `${row.company_id}|${row.fiscal_year}`);
  const duplicatePairs = pairs.length - new Set(pairs).size;
  const missingColumns = STATE.headers.filter((header) => filteredRows.some((row) => !String(row[header] ?? '').trim()));
  const invalidYears = filteredRows.filter((row) => !Number.isInteger(Number(row.fiscal_year))).length;
  const numericKeys = STATE.metrics;
  const dataStats = [
    ['Tệp đang sử dụng', STATE.sourceName],
    ['Số bản ghi trong phạm vi', String(filteredRows.length)],
    ['Doanh nghiệp trong phạm vi', String(new Set(filteredRows.map((row) => row.company_id)).size)],
    ['Kỳ báo cáo trong phạm vi', filteredRows.length ? `${Math.min(...filteredRows.map((row) => Number(row.fiscal_year)))}–${Math.max(...filteredRows.map((row) => Number(row.fiscal_year)))}` : 'Chưa có']
  ];
  $('#dataOverview').innerHTML = dataStats.map(([label, value]) => `<div class="data-stat"><span>${escapeHtml(label)}</span><strong title="${escapeHtml(value)}">${escapeHtml(value)}</strong></div>`).join('');
  $('#fieldCount').textContent = `${STATE.headers.length} trường`;
  $('#fieldTable').innerHTML = STATE.headers.map((header) => {
    const values = filteredRows.map((row) => String(row[header] ?? '').trim());
    const present = values.filter(Boolean);
    const numeric = present.length > 0 && present.every((value) => Number.isFinite(Number(value)));
    const type = numeric ? 'Số' : 'Văn bản';
    const unit = METRICS[header]?.unit || (header === 'fiscal_year' ? 'năm' : '—');
    const missing = values.length - present.length;
    const dataStatus = missing ? `${present.length}/${values.length} giá trị · thiếu ${missing}` : `${present.length}/${values.length} giá trị`;
    return `<tr><td><code>${escapeHtml(header)}</code></td><td>${type} · ${escapeHtml(unit)}</td><td>${dataStatus}</td><td>${escapeHtml(fieldDescription(header))}</td></tr>`;
  }).join('');
  const checks = [
    { ok: true, text: `${filteredRows.length} dòng trong phạm vi bộ lọc, ${STATE.headers.length} cột được nhận diện.` },
    { ok: true, text: `${new Set(filteredRows.map((row) => row.company_id)).size} mã doanh nghiệp trong phạm vi; tổng dữ liệu có ${companies.length} mã, ${years.length ? `${years[0]}–${years[years.length - 1]}` : 'không có'}; chưa có cột tên doanh nghiệp hoặc ngành.` },
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
  const requestedCompany = text.match(/\bc\s*0?(\d{1,3})\b/i);
  const mentionedCompanies = [...text.matchAll(/\bc\s*0?(\d{1,3})\b/gi)].map((match) => `C${String(Number(match[1])).padStart(3, '0')}`);
  const context = STATE.page === 'forecast' ? STATE.filters.forecast : STATE.page === 'analysis' ? STATE.filters.analysis : STATE.page === 'alerts' ? STATE.filters.alerts : STATE.page === 'comparison' ? STATE.filters.comparison : STATE.page === 'data' ? STATE.filters.data : STATE.filters.dashboard;
  const activeCompany = context.company || (Array.isArray(context.companies) && context.companies.length === 1 ? context.companies[0] : 'all');
  const company = requestedCompany ? `C${String(Number(requestedCompany[1])).padStart(3, '0')}` : activeCompany;
  const yearMatch = text.match(/\b(20\d{2})\b/);
  const endYear = yearMatch ? Number(yearMatch[1]) : context.year && context.year !== 'all' ? Number(context.year) : Infinity;
  const dataRows = STATE.rows.filter((row) => (!requestedCompany && company === 'all' || row.company_id === company) && Number(row.fiscal_year) <= endYear).sort((a, b) => Number(a.fiscal_year) - Number(b.fiscal_year));
  const scopedRows = dataRows;
  const yearsLabel = scopedRows.length ? `${scopedRows[0].fiscal_year}–${scopedRows[scopedRows.length - 1].fiscal_year}` : `đến năm ${Number.isFinite(endYear) ? endYear : 'mới nhất'}`;
  const trends = /qua các năm|xu hướng|thay đổi|diễn biến|biến động|cải thiện|suy giảm/.test(text);
  const compare = /so sánh|doanh nghiệp nào|cao nhất|nhóm dữ liệu/.test(text);
  const riskIntent = /cảnh báo|rủi ro|nguy cơ/.test(text);
  const forecastIntent = /dự báo|dự đoán|năm tới|các năm tới/.test(text);
  const metricAliases = [
    ['revenue_growth_pct', /tăng trưởng doanh thu|tăng trưởng/], ['gross_margin_pct', /biên lợi nhuận gộp|biên gộp/],
    ['operating_margin_pct', /biên lợi nhuận hoạt động|biên hoạt động/], ['net_margin_pct', /biên lợi nhuận ròng|biên lợi nhuận(?! gộp| hoạt động)|lợi nhuận/],
    ['cfo_to_net_income_x', /cfo\s*\/|cfo\s*và\s*lợi nhuận/], ['cfo_margin_pct', /dòng tiền hoạt động|\bcfo\b/],
    ['free_cash_flow_vnd_mn', /dòng tiền tự do|\bfcf\b/], ['debt_to_assets_pct', /nợ.*tài sản|đòn bẩy/],
    ['debt_to_equity_x', /nợ.*vốn chủ/], ['current_ratio_x', /thanh toán hiện hành|khả năng thanh toán/],
    ['quick_ratio_x', /thanh toán nhanh/], ['dso_days', /phải thu|công nợ/], ['inventory_days', /tồn kho|hàng tồn/],
    ['interest_coverage_x', /trả lãi|lãi vay/], ['risk_score', /điểm rủi ro/], ['roa_pct', /\broa\b/], ['roe_pct', /\broe\b/]
  ];
  const asksAbsoluteRevenue = /doanh thu.*(bao nhiêu|giá trị|số tiền|đạt bao nhiêu)/.test(text) && !/tăng trưởng|tăng.*doanh thu|doanh thu.*tăng/.test(text);
  if (asksAbsoluteRevenue) return `CSV hiện chỉ có chỉ tiêu tăng trưởng doanh thu (revenue_growth_pct), không có số tiền doanh thu tuyệt đối. Hãy hỏi về tăng trưởng doanh thu; nguồn: ${STATE.sourceName}.`;
  const asksAbsoluteProfit = /lợi nhuận.*(bao nhiêu|giá trị|số tiền|đạt bao nhiêu)/.test(text) && !/biên lợi nhuận/.test(text);
  if (asksAbsoluteProfit) return `CSV hiện có các tỷ lệ biên lợi nhuận nhưng không có số tiền lợi nhuận tuyệt đối. Hãy hỏi về biên lợi nhuận; nguồn: ${STATE.sourceName}.`;
  const asksAbsoluteCfo = /(\bcfo\b|dòng tiền hoạt động)/.test(text) && !/(biên|margin|tỷ lệ|cfo\s*\/)/.test(text);
  if (asksAbsoluteCfo) return `CSV có biên CFO (cfo_margin_pct) và tỷ lệ CFO/lợi nhuận ròng (cfo_to_net_income_x), nhưng không có số tiền CFO tuyệt đối. Nguồn: ${STATE.sourceName}.`;
  const metric = metricAliases.find(([key, pattern]) => STATE.metrics.includes(key) && pattern.test(text))?.[0];
  if (riskIntent) {
    const alertRows = yearMatch ? STATE.rows.filter((row) => Number(row.fiscal_year) === endYear && (company === 'all' || row.company_id === company)) : scopedRows;
    const flagged = alertRows.filter((row) => riskTagsFor(row).length).map((row) => {
      const tags = riskTagsFor(row);
      const evidence = evidenceForAlert(row, tags).filter((item) => item.value !== null).map((item) => `${item.label}: ${metricDisplay(item.key, item.value)}`);
      const sourceRule = String(row.evidence_fields || '').split(' || ').filter((entry) => tags.some((tag) => entry.startsWith(`${tag}:`))).map((entry) => entry.split('|').slice(-1)[0].trim()).filter(Boolean);
      return `${row.company_id} năm ${row.fiscal_year}: ${tags.map((tag) => TAG_LABELS[tag] || tag).join(', ')}; mức ${severityLabel(row.predicted_severity)}, điểm ${metricDisplay('risk_score', getNumber(row, 'risk_score'))}${evidence.length ? `; số liệu kèm theo: ${evidence.join(', ')}` : ''}${sourceRule.length ? `; điều kiện được CSV mô tả: ${[...new Set(sourceRule)].join('; ')}` : ''}`;
    }).slice(-8);
    const alertYearsLabel = yearMatch ? String(endYear) : yearsLabel;
    return flagged.length ? `Nhãn cảnh báo trong dữ liệu${company === 'all' ? '' : ` của ${company}`} (${alertYearsLabel}):\n${flagged.join('\n')}\nĐiều kiện và nhãn là thông tin do CSV cung cấp, chưa được xác minh từ báo cáo nguồn; không phải kết luận kiểm toán hay quan hệ nhân quả.` : `Không có nhãn rủi ro trong phạm vi dữ liệu${company === 'all' ? '' : ` của ${company}`} (${alertYearsLabel}). Điều này không chứng minh không có rủi ro.`;
  }
  if (compare) {
    const compareMetrics = [...new Set(metricAliases.filter(([key, pattern]) => STATE.metrics.includes(key) && pattern.test(text)).map(([key]) => key))];
    if (!compareMetrics.length) return 'Bạn muốn so sánh chỉ tiêu nào (ví dụ biên lợi nhuận, tăng trưởng doanh thu hay nợ/tài sản)? CSV không có trường ngành nên chỉ có thể so sánh toàn bộ nhóm dữ liệu.';
    const compareYear = Number.isFinite(endYear) ? endYear : Math.max(...sortedYears());
    if (mentionedCompanies.length >= 2) {
      const [leftId, rightId] = mentionedCompanies;
      const leftRow = rowFor(leftId, compareYear);
      const rightRow = rowFor(rightId, compareYear);
      const comparisons = compareMetrics.map((key) => {
        const left = getNumber(leftRow, key);
        const right = getNumber(rightRow, key);
        if (left === null || right === null) return `${METRICS[key].label}: không đủ dữ liệu cùng kỳ cho ${leftId} và ${rightId} trong năm ${compareYear}.`;
        const delta = METRICS[key].unit === '%' ? `${formatNumber(left - right, METRICS[key].decimals)} điểm phần trăm` : metricDisplay(key, left - right);
        return `${METRICS[key].label} năm ${compareYear}: ${leftId} ${metricDisplay(key, left)}; ${rightId} ${metricDisplay(key, right)}; chênh lệch ${leftId} − ${rightId} là ${delta}.`;
      });
      return `Đối chiếu cùng kỳ từ ${STATE.sourceName}: ${comparisons.join(' ')} Chênh lệch là phép trừ hai giá trị; điều này chỉ so sánh chỉ tiêu được hỏi, không đánh giá toàn diện doanh nghiệp.`;
    }
    const comparisons = compareMetrics.map((key) => {
      const ranked = sortedCompanies().map((id) => ({ id, value: getNumber(rowFor(id, compareYear), key) })).filter((item) => item.value !== null).sort((a, b) => b.value - a.value);
      return ranked.length ? `${METRICS[key].label}: ${ranked.slice(0, 4).map((item) => `${item.id} ${metricDisplay(key, item.value)}`).join('; ')}${ranked.length > 4 ? `; … ${ranked.length} doanh nghiệp có dữ liệu` : ''}. Cao nhất: ${ranked[0].id}.` : `${METRICS[key].label}: không có giá trị hợp lệ.`;
    });
    return `So sánh năm ${compareYear}: ${comparisons.join(' ')} CSV không có trường ngành nên đây không phải so sánh cùng ngành. Chỉ tiêu tăng trưởng doanh thu và biên lợi nhuận không phải số tiền doanh thu/lợi nhuận.`;
  }
  if (forecastIntent) {
    const forecastCompany = requestedCompany ? `C${String(Number(requestedCompany[1])).padStart(3, '0')}` : STATE.filters.forecast.company;
    if (forecastCompany === 'all') return 'Chưa có doanh nghiệp được chọn trong màn hình Dự đoán tài chính. Chọn một doanh nghiệp rồi hỏi lại để truy vấn đúng chuỗi.';
    const forecastEnd = STATE.filters.forecast.year === 'all' ? Infinity : Number(STATE.filters.forecast.year);
    const forecastMetrics = /những chỉ tiêu|chỉ tiêu nào/.test(text) ? STATE.metrics.filter((key) => key !== 'risk_score') : [metric || $('#forecastMetric').value];
    const estimates = forecastMetrics.map((forecastMetric) => {
      const history = sortedYears().filter((year) => year <= forecastEnd).map((year) => ({ x: year, value: getNumber(rowFor(forecastCompany, year), forecastMetric) })).filter((point) => point.value !== null);
      if (history.length < 4 || !history.every((point, index) => index === 0 || point.x - history[index - 1].x === 1)) return { metric: forecastMetric, unavailable: true };
      const fit = linearFit(history); const lastPoint = history[history.length - 1]; const nextYear = lastPoint.x + 1; const prediction = fit?.predict(nextYear);
      if (!Number.isFinite(prediction)) return { metric: forecastMetric, unavailable: true };
      return { metric: forecastMetric, history, lastPoint, nextYear, prediction };
    });
    const available = estimates.filter((item) => !item.unavailable);
    if (!available.length) return `Chưa đủ ít nhất 4 kỳ liên tiếp có dữ liệu phù hợp để ngoại suy cho ${forecastCompany}; chatbot không tạo số dự báo.`;
    if (/những chỉ tiêu|chỉ tiêu nào/.test(text)) {
      const declining = available.filter((item) => item.prediction < item.lastPoint.value);
      const description = declining.length ? declining.map((item) => `${METRICS[item.metric].label}: ${metricDisplay(item.metric, item.lastPoint.value)} (${item.lastPoint.x}) → ${metricDisplay(item.metric, item.prediction)} (ngoại suy ${item.nextYear})`).join('; ') : 'Không có chỉ tiêu đủ dữ liệu mà ngoại suy cho thấy mức năm tới thấp hơn kỳ gần nhất.';
      return `Ngoại suy tuyến tính của ${forecastCompany} cho thấy: ${description}. Đây chỉ là sàng lọc xu hướng, không phải xác suất rủi ro hay kết luận chắc chắn. ${available.length} chỉ tiêu đủ 4 kỳ liên tiếp; ${estimates.length - available.length} chỉ tiêu thiếu điều kiện.`;
    }
    const estimate = available[0];
    const change = estimate.lastPoint.value === 0 ? null : (estimate.prediction - estimate.lastPoint.value) / Math.abs(estimate.lastPoint.value) * 100;
    return `${METRICS[estimate.metric].label} của ${forecastCompany}: hồi quy tuyến tính trên ${estimate.history.length} kỳ liên tiếp ngoại suy năm ${estimate.nextYear} ở mức ${metricDisplay(estimate.metric, estimate.prediction)} (${estimate.prediction > estimate.lastPoint.value ? 'cao hơn' : estimate.prediction < estimate.lastPoint.value ? 'thấp hơn' : 'bằng'} năm ${estimate.lastPoint.x}${change === null ? '' : ` khoảng ${formatNumber(Math.abs(change), 1)}%`}). Đây là ngoại suy thử nghiệm, không phải kết quả chắc chắn; dữ liệu lịch sử kết thúc ở ${estimate.lastPoint.x}.`;
  }
  if (text.includes('ý nghĩa') || text.includes('là gì') || text.includes('giải thích')) {
    if (metric) return `${METRICS[metric].label} (${METRICS[metric].unit}) là chỉ tiêu được cung cấp sẵn trong CSV. Giá trị hiển thị không được tính lại từ báo cáo gốc vì thư mục chỉ có bảng chỉ tiêu tổng hợp.`;
  }
  if (!metric && (/tổng quan|tình hình tài chính|chỉ tiêu nào|theo dõi/.test(text))) {
    const targetRows = company === 'all' ? sortedCompanies().map((id) => latestRow(id, endYear)).filter(Boolean) : [latestRow(company, endYear)].filter(Boolean);
    if (!targetRows.length) return `Không tìm thấy bản ghi trong dữ liệu ${yearsLabel}.`;
    const latest = targetRows[0].fiscal_year;
    const summaryKeys = ['revenue_growth_pct','operating_margin_pct','net_margin_pct','current_ratio_x','debt_to_assets_pct','cfo_margin_pct'];
    const evidence = summaryKeys.filter((key) => STATE.metrics.includes(key)).map((key) => {
      const values = targetRows.map((row) => getNumber(rowFor(row.company_id, latest), key)).filter((value) => value !== null);
      return `${METRICS[key].label}: ${metricDisplay(key, values.length === 1 ? values[0] : median(values))}`;
    });
    const flaggedCount = targetRows.filter((row) => riskTagsFor(row).length && ['HIGH','CRITICAL','MEDIUM'].includes(row.predicted_severity)).length;
    return `${company === 'all' ? `Tổng quan ${targetRows.length} doanh nghiệp` : `Tổng quan ${company}`} tại ${latest}${company === 'all' ? ' (các tỷ lệ dùng trung vị)' : ''}: ${evidence.join('; ')}. Có ${flaggedCount} bản ghi gắn nhãn rủi ro từ trung bình trở lên. Đây là mô tả dữ liệu, không xác định nguyên nhân.`;
  }
  if (metric) {
    if (yearMatch && !trends) {
      if (company === 'all') return 'Câu hỏi thiếu mã doanh nghiệp. Hãy nêu mã như C001 hoặc chọn một doanh nghiệp trong bộ lọc hiện tại.';
      const exactRow = rowFor(company, endYear);
      if (!exactRow) return `Không có bản ghi cho ${company} trong năm ${endYear} ở ${STATE.sourceName}; không dùng số liệu năm khác thay thế.`;
      const exactValue = getNumber(exactRow, metric);
      if (exactValue === null) return `Trường ${metric} không có giá trị hợp lệ cho ${company} năm ${endYear} trong ${STATE.sourceName}.`;
      return `${METRICS[metric].label} của ${company}, năm ${endYear}: ${metricDisplay(metric, exactValue)}. Nguồn: ${STATE.sourceName}, cột ${metric}; giá trị được cung cấp sẵn trong CSV.`;
    }
    if (company === 'all' && !trends) return 'Câu hỏi thiếu mã doanh nghiệp. Hãy nêu mã như C001 hoặc chọn một doanh nghiệp trong bộ lọc hiện tại.';
    if (!scopedRows.length) return `Không tìm thấy bản ghi cho ${company === 'all' ? 'nhóm doanh nghiệp' : company} ${yearsLabel}.`;
    const valid = scopedRows.map((row) => ({ year: Number(row.fiscal_year), value: getNumber(row, metric) })).filter((point) => point.value !== null);
    if (!valid.length) return `Trường ${metric} có trong cấu trúc dữ liệu nhưng không có giá trị hợp lệ trong phạm vi ${yearsLabel}.`;
    if (company === 'all' && !compare) {
      const latestYear = Math.max(...valid.map((point) => point.year));
      const values = STATE.rows.filter((row) => Number(row.fiscal_year) === latestYear).map((row) => getNumber(row, metric)).filter((value) => value !== null);
      return `Trung vị ${METRICS[metric].label} của ${values.length} doanh nghiệp năm ${latestYear} là ${metricDisplay(metric, median(values))}. Phạm vi lịch sử có ${valid.length} giá trị hợp lệ; chọn một doanh nghiệp trong màn hình Dashboard để xem chuỗi riêng.`;
    }
    const latest = valid[valid.length - 1];
    if (trends && valid.length > 1) {
      const first = valid[0]; const delta = latest.value - first.value;
      const direction = delta > 0 ? 'tăng' : delta < 0 ? 'giảm' : 'không đổi';
      const absoluteChange = (value) => METRICS[metric].unit === '%'
        ? `${formatNumber(value, METRICS[metric].decimals)} điểm phần trăm`
        : metricDisplay(metric, value);
      const relativeChange = first.value === 0 ? null : delta / Math.abs(first.value) * 100;
      const changes = valid.slice(1).map((point, index) => ({ from: valid[index], to: point, amount: Math.abs(point.value - valid[index].value) })).sort((a, b) => b.amount - a.amount);
      const sequence = valid.map((point) => `${point.year}: ${metricDisplay(metric, point.value)}`).join('; ');
      const largest = changes[0];
      return `${METRICS[metric].label} của ${company}, ${first.year}–${latest.year}: ${sequence}. Tổng thể ${direction} ${absoluteChange(delta)}${relativeChange === null ? '' : ` (${relativeChange > 0 ? '+' : ''}${formatNumber(relativeChange, 1)}% tương đối)`}; biến động tuyệt đối lớn nhất là ${largest.from.year}–${largest.to.year} (${absoluteChange(largest.amount)}). Chuỗi có ${valid.length} kỳ hợp lệ; các khoảng thiếu bị bỏ trống. Diễn biến này không tự chứng minh nguyên nhân.`;
    }
    return `${METRICS[metric].label} của ${company}, năm ${latest.year}: ${metricDisplay(metric, latest.value)}. Nguồn: ${STATE.sourceName}, cột ${metric}.`;
  }
  return `Mình có thể truy vấn ${STATE.metrics.length} chỉ tiêu số trong CSV. Hãy hỏi về doanh thu, biên lợi nhuận, dòng tiền, thanh khoản, nợ, phải thu, tồn kho hoặc cảnh báo. Trợ lý hiện chạy bằng quy tắc cục bộ, chưa kết nối mô hình AI.`;
}

function addChatMessage(text, type) {
  const message = document.createElement('div');
  message.className = `chat-message ${type}`;
  message.textContent = text;
  $('#chatMessages').append(message);
  $('#chatMessages').scrollTop = $('#chatMessages').scrollHeight;
}

const CHAT_FEEDBACK_KEY = 'datalyst_chat_feedback_v1';
let chatResponseSequence = 0;

function readChatFeedback() {
  try {
    const saved = localStorage.getItem(CHAT_FEEDBACK_KEY);
    const records = saved ? JSON.parse(saved) : [];
    return Array.isArray(records) ? records : [];
  } catch (_) {
    return null;
  }
}

function addChatResponse(question, answer) {
  const message = document.createElement('article');
  const responseId = `chat-response-${Date.now()}-${chatResponseSequence++}`;
  message.className = 'chat-message system chat-response';
  message.dataset.responseId = responseId;
  message.dataset.question = question;

  const body = document.createElement('div');
  body.className = 'chat-answer';
  body.textContent = answer;
  message.append(body);

  const scope = document.createElement('div');
  scope.className = 'chat-evidence';
  const company = question.match(/\bc\s*0?(\d{1,3})\b/i)?.[0]?.replace(/\s+/g, '').toUpperCase();
  const year = question.match(/\b20\d{2}\b/)?.[0];
  const fields = STATE.metrics.filter((key) => answer.includes(key) || answer.includes(METRICS[key]?.label || key));
  scope.textContent = `Nguồn kiểm tra: ${STATE.sourceName}${fields.length ? ` · cột ${fields.join(', ')}` : ''}${company ? ` · mã được hỏi ${company}` : ''}${year ? ` · kỳ được hỏi ${year}` : ''}. Nội dung truy xuất cục bộ từ CSV; trường không nêu ở đây chưa được xác minh độc lập với báo cáo gốc.`;
  message.append(scope);

  const controls = document.createElement('div');
  controls.className = 'chat-feedback';
  controls.setAttribute('aria-label', 'Đánh giá câu trả lời');
  [
    ['useful', 'Xác nhận hữu ích'],
    ['review', 'Cần kiểm tra thêm'],
    ['disagree', 'Không đồng ý']
  ].forEach(([value, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.feedback = value;
    button.textContent = label;
    controls.append(button);
  });
  const status = document.createElement('div');
  status.className = 'chat-feedback-status';
  status.setAttribute('aria-live', 'polite');
  controls.append(status);
  message.append(controls);
  $('#chatMessages').append(message);
  $('#chatMessages').scrollTop = $('#chatMessages').scrollHeight;
}

function recordChatFeedback(button) {
  const message = button.closest('.chat-response');
  if (!message) return;
  const controls = message.querySelector('.chat-feedback');
  const status = controls.querySelector('.chat-feedback-status');
  const labels = { useful: 'Xác nhận hữu ích', review: 'Cần kiểm tra thêm', disagree: 'Không đồng ý' };
  const feedback = button.dataset.feedback;
  const records = readChatFeedback();
  if (!records) {
    status.textContent = 'Không thể lưu cục bộ trong trình duyệt này.';
    return;
  }
  const record = {
    id: message.dataset.responseId,
    question: message.dataset.question || '',
    answer: message.querySelector('.chat-answer')?.textContent || '',
    company: message.querySelector('.chat-evidence')?.textContent.match(/mã được hỏi ([^·.]+)/)?.[1]?.trim() || null,
    period: message.querySelector('.chat-evidence')?.textContent.match(/kỳ được hỏi (\d{4})/)?.[1] || null,
    feedback,
    timestamp: new Date().toISOString()
  };
  const prior = records.findIndex((item) => item.id === record.id);
  if (prior >= 0) records[prior] = record;
  else records.push(record);
  try {
    localStorage.setItem(CHAT_FEEDBACK_KEY, JSON.stringify(records.slice(-100)));
    controls.querySelectorAll('button').forEach((item) => {
      item.disabled = true;
      item.classList.toggle('selected', item === button);
    });
    status.textContent = `${labels[feedback]} · đã lưu trên trình duyệt này.`;
  } catch (_) {
    status.textContent = 'Không thể lưu cục bộ (bộ nhớ bị chặn hoặc đã đầy).';
  }
}

function updateVietnamClock() {
  const clock = $('#vietClock');
  if (!clock) return;
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: '2-digit', month: '2-digit',
    year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  clock.textContent = `${values.weekday}, ${values.day}/${values.month}/${values.year} | ${values.hour}:${values.minute} (GMT+7)`;
}

function startVietnamClock() {
  updateVietnamClock();
  const now = new Date();
  const delay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
  window.setTimeout(() => {
    updateVietnamClock();
    window.setInterval(updateVietnamClock, 60_000);
  }, delay);
}

function setChatOpen(open) {
  $('#chatWindow').classList.toggle('hidden', !open);
  $('#chatWindow').setAttribute('aria-hidden', String(!open));
  $('#chatToggle').setAttribute('aria-expanded', String(open));
  $('#chatToggle').setAttribute('aria-label', open ? 'Đóng Datalyst AI' : 'Mở Datalyst AI');
  if (open) $('#chatInput').focus();
}

function initInteractions() {
  [['dashboardCompany','dashboard','company',renderDashboard],['dashboardYear','dashboard','year',renderDashboard],['analysisYear','analysis','year',renderAnalysis],['comparisonYear','comparison','year',renderComparison],['forecastCompany','forecast','company',renderForecast],['forecastYear','forecast','year',renderForecast],['alertCompany','alerts','company',renderAlerts],['alertYear','alerts','year',renderAlerts],['dataCompany','data','company',renderData],['dataYear','data','year',renderData]].forEach(([id, screen, field, callback]) => $(`#${id}`).addEventListener('change', (event) => { STATE.filters[screen][field] = event.target.value; callback(); }));
  $('#analysisMetric').addEventListener('change', renderAnalysis);
  $('#analysisYear').addEventListener('change', renderAnalysis);
  $('#analysisCompanies').addEventListener('change', (event) => {
    const value = event.target.value;
    const prior = STATE.filters.analysis.companies;
    if (value === 'all') STATE.filters.analysis.companies = event.target.checked ? 'all' : [];
    else {
      const selected = prior === 'all' ? sortedCompanies() : [...prior];
      const next = event.target.checked ? [...new Set([...selected, value])] : selected.filter((company) => company !== value);
      STATE.filters.analysis.companies = next.length === sortedCompanies().length ? 'all' : next;
    }
    configureSelectors(); renderAnalysis();
  });
  $('#comparisonMetric').addEventListener('change', renderComparison);
  $('#forecastMetric').addEventListener('change', renderForecast);
  $('#alertSeverity').addEventListener('change', renderAlerts);
  $('#alertTag').addEventListener('change', renderAlerts);
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
      let answer;
      try { answer = answerChat(question); }
      catch (error) { answer = `Không thể hoàn tất tra cứu: ${error.message || 'Lỗi xử lý dữ liệu.'} Hãy thử câu hỏi khác hoặc kiểm tra CSV.`; }
      pending.remove();
      addChatResponse(question, answer);
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
  $('#chatMessages').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-feedback]');
    if (button) recordChatFeedback(button);
  });
  $('#menuButton').addEventListener('click', () => {
    $('#sidebar').classList.add('open');
    $('#sidebarScrim').classList.add('open');
  });
  $('#sidebarScrim').addEventListener('click', () => {
    $('#sidebar').classList.remove('open');
    $('#sidebarScrim').classList.remove('open');
  });
  const showPage = (page, updateHash = false) => {
    const validPage = document.getElementById(page)?.classList.contains('page-section') ? page : 'dashboard';
    STATE.page = validPage;
    document.querySelectorAll('.page-section').forEach((section) => {
      const active = section.id === validPage;
      section.classList.toggle('active-page', active);
      section.setAttribute('aria-hidden', String(!active));
    });
    document.querySelectorAll('.nav-link').forEach((link) => {
      const active = link.hash === `#${validPage}`;
      link.classList.toggle('active', active);
      if (active) $('#currentSection').textContent = link.textContent.trim();
    });
    if (updateHash && location.hash !== `#${validPage}`) history.pushState(null, '', `#${validPage}`);
    $('#sidebar').classList.remove('open'); $('#sidebarScrim').classList.remove('open');
  };
  document.querySelectorAll('.nav-link, .brand').forEach((link) => link.addEventListener('click', (event) => {
    const page = link.hash.slice(1); if (!document.getElementById(page)) return;
    event.preventDefault(); showPage(page, true);
  }));
  window.addEventListener('hashchange', () => showPage(location.hash.slice(1)));
  window.addEventListener('popstate', () => showPage(location.hash.slice(1)));
  showPage(location.hash.slice(1) || 'dashboard');
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.csv,text/csv';
  fileInput.hidden = true;
  fileInput.addEventListener('change', () => { if (fileInput.files?.[0]) loadCsv(fileInput.files[0]); });
  document.body.append(fileInput);
  $('#chooseFileButton').addEventListener('click', () => fileInput.click());
}

document.addEventListener('DOMContentLoaded', () => {
  startVietnamClock();
  initInteractions();
  loadCsv();
});
