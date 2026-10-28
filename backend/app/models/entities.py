import json
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, Float, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


def utcnow_str() -> str:
    return datetime.now(timezone.utc).isoformat()


class City(Base):
    __tablename__ = "cities"

    id = Column(String(50), primary_key=True, index=True)  # greater_noida | delhi | jaipur | lucknow | bengaluru
    name = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    tanker_fleet = Column(Integer, default=8)
    default_scenario = Column(String(100), nullable=False)


class NetworkAsset(Base):
    __tablename__ = "network_assets"

    id = Column(String(50), primary_key=True, index=True)
    city_id = Column(String(50), default="greater_noida", index=True)
    name = Column(String(100), nullable=False)
    kind = Column(String(50), nullable=False)  # source | treatment | pump
    capacity = Column(Float, nullable=False)  # MLD
    effective_capacity = Column(Float, nullable=False)  # MLD
    status = Column(String(50), default="normal")  # normal | degraded | offline
    factor = Column(Float, default=1.0)  # 1.0 = normal, 0.0 = offline
    metadata_json = Column(Text, default="{}")


class Zone(Base):
    __tablename__ = "zones"

    id = Column(String(50), primary_key=True, index=True)
    city_id = Column(String(50), default="greater_noida", index=True)
    name = Column(String(100), nullable=False)
    population = Column(Integer, nullable=False)
    priority = Column(String(20), nullable=False)  # high | medium | low
    base_demand = Column(Float, nullable=False)  # MLD
    current_demand = Column(Float, nullable=False)  # MLD
    current_pipe_supply = Column(Float, default=0.0)
    current_tanker_supply = Column(Float, default=0.0)


class NetworkLink(Base):
    __tablename__ = "network_links"

    id = Column(String(50), primary_key=True, index=True)
    city_id = Column(String(50), default="greater_noida", index=True)
    from_node = Column(String(50), nullable=False)
    to_node = Column(String(50), nullable=False)
    capacity = Column(Float, nullable=False)  # MLD
    current_flow = Column(Float, default=0.0)


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(50), primary_key=True, index=True)
    city_id = Column(String(50), default="greater_noida", index=True)
    scenario_type = Column(String(100), nullable=False)
    label = Column(String(200), nullable=False)
    severity = Column(String(50), nullable=False)  # LOW | MODERATE | HIGH | CRITICAL
    status = Column(String(50), default="awaiting_approval")  # awaiting_approval | mitigated | all_rejected
    triggered_at = Column(String(50), default=utcnow_str)
    analysis_json = Column(Text, default="{}")
    approved_plan_id = Column(String(50), nullable=True)
    resolved_at = Column(String(50), nullable=True)

    agent_runs = relationship("AgentRun", back_populates="incident", cascade="all, delete-orphan")
    plans = relationship("ResponsePlan", back_populates="incident", cascade="all, delete-orphan")
    allocations = relationship("Allocation", back_populates="incident", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="incident", cascade="all, delete-orphan")


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(String(50), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_name = Column(String(100), nullable=False)
    role = Column(String(150), nullable=False)
    step_order = Column(Integer, nullable=False)
    status = Column(String(50), default="success")  # success | failed | running
    input_summary = Column(Text, default="")
    output_json = Column(Text, default="{}")
    error_details = Column(Text, nullable=True)
    started_at = Column(String(50), default=utcnow_str)
    completed_at = Column(String(50), default=utcnow_str)
    duration_ms = Column(Float, default=0.0)

    incident = relationship("Incident", back_populates="agent_runs")


class ResponsePlan(Base):
    __tablename__ = "response_plans"

    id = Column(String(50), primary_key=True)  # e.g. INC-001-PLAN-A or A
    incident_id = Column(String(50), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_key = Column(String(20), nullable=False)  # A | B | C
    name = Column(String(200), nullable=False)
    strategy = Column(Text, nullable=False)
    allocations_json = Column(Text, nullable=False)  # {zone_id: {pipe: X, tanker: Y}}
    tankers_json = Column(Text, nullable=False)  # {zone_id: count}
    tankers_used = Column(Integer, default=0)
    total_supplied = Column(Float, nullable=False)
    unmet_demand = Column(Float, nullable=False)
    unmet_by_zone_json = Column(Text, nullable=False)
    trade_offs_json = Column(Text, default="[]")
    violations_json = Column(Text, default="[]")
    feasible = Column(Boolean, default=True)
    recommended = Column(Boolean, default=False)
    decision = Column(String(50), default="pending")  # pending | approved | rejected | superseded
    metadata_json = Column(Text, default="{}")
    created_at = Column(String(50), default=utcnow_str)

    incident = relationship("Incident", back_populates="plans")


class Allocation(Base):
    __tablename__ = "allocations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(String(50), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(String(50), nullable=False)
    zone_id = Column(String(50), nullable=False)
    pipe_mld = Column(Float, nullable=False)
    tanker_mld = Column(Float, nullable=False)
    total_mld = Column(Float, nullable=False)
    timestamp = Column(String(50), default=utcnow_str)

    incident = relationship("Incident", back_populates="allocations")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(String(50), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=True, index=True)
    city_id = Column(String(50), default="greater_noida", index=True)
    event_type = Column(String(100), nullable=False)
    actor = Column(String(100), default="System")
    description = Column(Text, nullable=False)
    timestamp = Column(String(50), default=utcnow_str)
    metadata_json = Column(Text, default="{}")

    incident = relationship("Incident", back_populates="audit_events")


class Reservoir(Base):
    __tablename__ = "reservoirs"

    id = Column(String(50), primary_key=True)
    city_id = Column(String(50), default="greater_noida", index=True)
    name = Column(String(100), nullable=False)
    zone = Column(String(100), nullable=False)
    capacity_ml = Column(Float, nullable=False)
    current_ml = Column(Float, nullable=False)
    inflow_mld = Column(Float, nullable=False)
    outflow_mld = Column(Float, nullable=False)
    status = Column(String(50), default="normal")
