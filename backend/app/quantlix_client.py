from __future__ import annotations

from dataclasses import dataclass
import os
from typing import Any

import httpx


class EnforcementBlocked(Exception):
    """Raised when Quantlix gateway blocks the request."""

    def __init__(self, message: str, violations: list[dict[str, Any]]) -> None:
        super().__init__(message)
        self.violations = violations


class QuantlixGatewayUnavailable(Exception):
    """Raised when the backend cannot reach the Quantlix gateway."""


class QuantlixConfigError(Exception):
    """Raised when required Quantlix client configuration is missing."""


@dataclass(frozen=True)
class QuantlixClient:
    base_url: str
    api_key: str
    deployment_id: str
    contract_id: str

    @classmethod
    def from_env(cls) -> "QuantlixClient":
        api_key = os.environ.get("QUANTLIX_API_KEY", "").strip()
        deployment_id = os.environ.get("QUANTLIX_DEPLOYMENT_ID", "").strip()
        if not api_key:
            raise QuantlixConfigError("QUANTLIX_API_KEY is required")
        if not deployment_id:
            raise QuantlixConfigError("QUANTLIX_DEPLOYMENT_ID is required")

        return cls(
            base_url=os.environ.get("QUANTLIX_API_BASE", "http://localhost:8000"),
            api_key=api_key,
            deployment_id=deployment_id,
            contract_id=os.environ.get("QUANTLIX_CONTRACT_ID", "support-bot"),
        )

    async def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Call Quantlix deployment run endpoint."""
        url = f"{self.base_url}/run"
        body = {
            "deployment_id": self.deployment_id,
            "input": payload,
            "metadata": {"contract_id": self.contract_id},
        }
        headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=body, headers=headers)
        except httpx.RequestError as exc:
            raise QuantlixGatewayUnavailable(
                "Unable to reach Quantlix gateway"
            ) from exc

        if 400 <= response.status_code < 500:
            data = response.json()
            detail = data.get("detail", {})
            violations = []
            if isinstance(detail, dict):
                violations = detail.get("violations", [])
            elif isinstance(data.get("violations"), list):
                violations = data["violations"]
            elif detail:
                violations = [
                    {
                        "code": "QUANTLIX_REQUEST_REJECTED",
                        "message": str(detail),
                    }
                ]
            raise EnforcementBlocked("Request blocked by Quantlix", violations)

        response.raise_for_status()
        return response.json()
