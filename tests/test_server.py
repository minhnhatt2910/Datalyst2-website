import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

try:
    import httpx  # noqa: F401
    from fastapi.testclient import TestClient
    import server
except ImportError:
    server = None


@unittest.skipIf(server is None, "Install requirements.txt to run API tests")
class ApiTests(unittest.TestCase):
    def setUp(self):
        server._request_times.clear()
        self.client = TestClient(server.app)

    def payload(self):
        return {
            "question": "Giải thích biên lợi nhuận",
            "data_context": {
                "source_file": "submission_output.csv",
                "scope": {"company_id": "C001", "fiscal_year": 2025},
                "records": [{"company_id": "C001", "fiscal_year": 2025, "net_margin_pct": 8.25}],
            },
        }

    def test_health_does_not_expose_secret(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("OPENAI_API_KEY", response.text)
        self.assertEqual(response.json()["provider"], "openai")

    def test_missing_key_returns_explicit_fallback_code(self):
        with patch.object(server, "_client", None), patch.object(server, "API_KEY", ""):
            response = self.client.post("/api/chat", json=self.payload())
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"]["code"], "missing_api_key")

    def test_llm_success_includes_source_trace_and_non_storage(self):
        create = AsyncMock(return_value=SimpleNamespace(output_text="Quan sát: ...", model="gpt-5.5", _request_id="req_test"))
        fake_client = SimpleNamespace(responses=SimpleNamespace(create=create))
        with patch.object(server, "_client", fake_client):
            response = self.client.post("/api/chat", json=self.payload())
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "llm")
        self.assertEqual(body["source_trace"]["fields_sent"], ["net_margin_pct"])
        self.assertEqual(body["source_trace"]["records"][0]["company_id"], "C001")
        self.assertIs(create.await_args.kwargs["store"], False)
        self.assertEqual(create.await_args.kwargs["model"], server.MODEL)

    def test_invalid_context_is_rejected_before_model_call(self):
        create = AsyncMock()
        fake_client = SimpleNamespace(responses=SimpleNamespace(create=create))
        payload = self.payload()
        payload["data_context"]["records"].append(payload["data_context"]["records"][0])
        with patch.object(server, "_client", fake_client):
            response = self.client.post("/api/chat", json=payload)
        self.assertEqual(response.status_code, 422)
        create.assert_not_awaited()

    def test_timeout_is_returned_as_a_labeled_backend_error(self):
        class FakeTimeout(Exception):
            pass
        create = AsyncMock(side_effect=FakeTimeout())
        fake_client = SimpleNamespace(responses=SimpleNamespace(create=create))
        with patch.object(server, "_client", fake_client), patch.object(server, "APITimeoutError", FakeTimeout):
            response = self.client.post("/api/chat", json=self.payload())
        self.assertEqual(response.status_code, 504)
        self.assertEqual(response.json()["detail"]["code"], "upstream_timeout")

    def test_upstream_status_error_is_not_returned_as_an_llm_answer(self):
        class FakeConnectionError(Exception):
            pass
        create = AsyncMock(side_effect=FakeConnectionError())
        fake_client = SimpleNamespace(responses=SimpleNamespace(create=create))
        with patch.object(server, "_client", fake_client), patch.object(server, "APIConnectionError", FakeConnectionError):
            response = self.client.post("/api/chat", json=self.payload())
        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json()["detail"]["code"], "upstream_error")

    def test_cross_origin_and_oversized_requests_are_rejected(self):
        cross_origin = self.client.post("/api/chat", json=self.payload(), headers={"Origin": "https://attacker.example"})
        self.assertEqual(cross_origin.status_code, 403)
        large_context = {"records": [], "extra": "x" * 65_000}
        oversized = self.client.post("/api/chat", json={"question": "test", "data_context": large_context})
        self.assertEqual(oversized.status_code, 413)


if __name__ == "__main__":
    unittest.main()
