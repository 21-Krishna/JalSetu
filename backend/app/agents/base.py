from dataclasses import dataclass, field
from datetime import datetime, timezone
import time
from typing import Any, Dict, Optional


def utcnow_str() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class AgentRunResult:
    agent_name: str
    role: str
    step_order: int
    status: str  # "success" | "failed"
    input_summary: str
    output_data: Dict[str, Any]
    error_details: Optional[str] = None
    started_at: str = field(default_factory=utcnow_str)
    completed_at: str = field(default_factory=utcnow_str)
    duration_ms: float = 0.0


class BaseAgent:
    def __init__(self, name: str, role: str, step_order: int):
        self.name = name
        self.role = role
        self.step_order = step_order

    def execute(self, *args, **kwargs) -> AgentRunResult:
        started = utcnow_str()
        t0 = time.perf_counter()
        input_summary = self._summarize_input(*args, **kwargs)
        try:
            output = self._process(*args, **kwargs)
            duration_ms = round((time.perf_counter() - t0) * 1000, 2)
            completed = utcnow_str()
            return AgentRunResult(
                agent_name=self.name,
                role=self.role,
                step_order=self.step_order,
                status="success",
                input_summary=input_summary,
                output_data=output,
                started_at=started,
                completed_at=completed,
                duration_ms=duration_ms,
            )
        except Exception as e:
            duration_ms = round((time.perf_counter() - t0) * 1000, 2)
            completed = utcnow_str()
            return AgentRunResult(
                agent_name=self.name,
                role=self.role,
                step_order=self.step_order,
                status="failed",
                input_summary=input_summary,
                output_data={},
                error_details=str(e),
                started_at=started,
                completed_at=completed,
                duration_ms=duration_ms,
            )

    def _summarize_input(self, *args, **kwargs) -> str:
        return "Standard execution parameters"

    def _process(self, *args, **kwargs) -> Dict[str, Any]:
        raise NotImplementedError
