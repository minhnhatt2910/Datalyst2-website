# Datalyst — Financial Intelligence

Datalyst is a Vietnamese-language financial analysis demo. Deterministic code handles calculations; Datalyst AI explains a small, selected set of CSV facts. The provided data is simulated and is not investment, accounting, audit, or fraud advice.

## Run locally

The frontend and API must use the same origin. Do not open `index.html` with `file://` for the backend-connected experience.

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Set the API key in the current PowerShell session. The secure prompt avoids writing the key into the command history; the key is still available to the local server process through its environment.

```powershell
$secureKey = Read-Host "OpenAI API key (local environment only)" -AsSecureString
$keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try { $env:OPENAI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer) }
$env:OPENAI_MODEL = "gpt-5.5"
python -m uvicorn server:app --host 127.0.0.1 --port 8000
```

Open <http://127.0.0.1:8000>. The default model is `gpt-5.5`; `OPENAI_MODEL` can select another model available to the configured API account. Never paste the key into the website, chat, HTML, JavaScript, CSV, or Git. `/api/health` reports whether a key and SDK are configured, but never returns the key.

Without a configured key or when the backend/API is unavailable, the chatbot uses the existing local rule-based answer and visibly labels the response **Dự phòng cục bộ**. It does not present local fallback as an LLM response. What-if calculations continue to work without an API key.

## API and data handling

- `GET /api/health` returns service status, provider, model, and configuration state.
- `POST /api/chat` accepts a Vietnamese question and a bounded `data_context`. It rejects unrecognized fields, duplicate company-year rows, scope mismatches, oversized bodies, and more than 12 selected records. A single-company trend may include at most five years.
- The backend applies the financial interpretation instructions, calls the OpenAI Responses API with `store=False`, and returns the answer, model, latency, request ID, and a source trace listing the CSV, company/year rows, and fields sent.
- Group means shown by the Dashboard are calculated in JavaScript and passed as deterministic facts to the assistant; other group metrics retain the existing median behavior. The backend checks supplied group and forecast facts against the selected rows before sending them to the model.
- CSV text is treated as untrusted data. Questions, financial values, and full responses are not written to application logs; logs contain only status, model, latency, and request ID.
- What-if uses deterministic arithmetic: `assumed value = CSV value + shock in percentage points`. Null source values remain null. The page does not recalculate risk score, health, severity, or alert tags. Exported audit rows contain the source, scope, fields, assumption, formula, and before/after values. The journal is held in browser memory until exported.
- Alert labels and ratios remain pipeline-provided values; the raw statement files and independent labels needed to verify them are not included in this project.
- The existing chatbot feedback remains in browser `localStorage`; it is not a centralized audit log.

The Responses API integration follows the official OpenAI Python library and Responses API reference. `store=False` is passed explicitly; review applicable organization data controls before sending any sensitive real financial data. [OpenAI Python API library](https://developers.openai.com/api/reference/python) · [Responses create reference](https://developers.openai.com/api/reference/python/resources/responses/methods/create).

## What-if and forecasting

The What-if page supports percentage-point shocks for revenue growth, gross margin, CFO margin, and debt/assets. It creates a downloadable CSV journal and never edits `submission_output.csv`.

Forecasting still uses the existing linear extrapolation. When a series has sufficient history, the page also reports rolling-origin one-step MAE and MAPE against a persistence baseline (the last training observation), the number of evaluated periods, and the last-period holdout error. With only a few annual observations, these figures are descriptive and do not establish general forecast accuracy.

## Tests

```powershell
python -m unittest discover -s tests -v
```

`tests/test_datalyst_core.py` uses the actual schema and synthetic boundary cases without an answer key. `tests/test_server.py` checks API health, missing-key fallback status, bounded validation, source trace, and `store=False`; it requires the dependencies from `requirements.txt`. `tests/chatbot.test.html` is the browser integration harness for current CSV behavior, context selection, fallback labeling, and What-if. Serve it with the same-origin application in a browser to run it.

## Current limitations and deployment

- The repository contains only `submission_output.csv`, not the income statement, balance sheet, cash-flow, or financial-note source tables. The app cannot independently recompute all ratios or substantiate pipeline alerts.
- No independent labeled alert set or calculation answer key is included. Alert precision/recall/F1 and independent metric-cell accuracy are therefore not reported as measured results.
- The demo rate limiter is in-memory, per-process, and allows 20 chat requests per minute per client address. It is suitable only for a single-process local demo.
- The local API is intended for `127.0.0.1`. Before public deployment, add user authentication, HTTPS, a durable rate limit and cost control, trusted proxy/origin configuration, and the organization's data-control review. Do not expose an unauthenticated demo server to the public internet.
- Deploy the frontend and backend on the same origin. The server serves only the known application assets and CSV, not arbitrary repository files.
- The API key must be injected as a server secret/environment variable by the host. Never commit secrets. `.gitignore` excludes `.env`, virtual environments, logs, and Python bytecode.

## Project layout

- `index.html`, `app.js`, `style.css`: existing website and new What-if/chat API client.
- `server.py`: FastAPI endpoints, bounded request handling, rate limit, and Responses API integration.
- `datalyst_core.py`: deterministic context validation, prompt construction, and source trace helpers.
- `submission_output.csv`: supplied summary dataset; kept unchanged.
- `tests/`: standard-library core tests, optional API tests, and browser integration harness.
