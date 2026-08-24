"""Pydantic schemas for inbound Razorpay webhook payloads."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PaymentErrorDetails(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    step: Optional[str] = None
    reason: Optional[str] = None


class RazorpayPaymentEntity(BaseModel):
    id: str
    entity: str = "payment"
    amount: int  # in paise (1 INR = 100 paise)
    currency: str = "INR"
    status: str
    order_id: Optional[str] = None
    invoice_id: Optional[str] = None
    international: Optional[bool] = False
    method: Optional[str] = None
    amount_refunded: Optional[int] = 0
    refund_status: Optional[str] = None
    captured: Optional[bool] = False
    description: Optional[str] = None
    card_id: Optional[str] = None
    bank: Optional[str] = None
    wallet: Optional[str] = None
    vpa: Optional[str] = None
    email: Optional[str] = None
    contact: Optional[str] = None
    notes: Optional[Dict[str, Any]] = None
    fee: Optional[int] = None
    tax: Optional[int] = None
    error_code: Optional[str] = None
    error_description: Optional[str] = None
    error_source: Optional[str] = None
    error_step: Optional[str] = None
    error_reason: Optional[str] = None
    created_at: Optional[int] = None


class RazorpaySubscriptionEntity(BaseModel):
    id: str
    entity: str = "subscription"
    plan_id: str
    customer_id: Optional[str] = None
    status: str  # active, pending, halted, cancelled, completed, authenticated
    current_cycle: Optional[int] = 1
    quantity: Optional[int] = 1
    start_at: Optional[int] = None
    end_at: Optional[int] = None
    charge_at: Optional[int] = None
    total_count: Optional[int] = None
    paid_count: Optional[int] = None
    remaining_count: Optional[int] = None
    customer_notify: Optional[bool] = True
    created_at: Optional[int] = None
    expire_by: Optional[int] = None
    short_url: Optional[str] = None
    has_scheduled_changes: Optional[bool] = False
    change_scheduled_at: Optional[int] = None
    notes: Optional[Dict[str, Any]] = None


class RazorpayPaymentLinkEntity(BaseModel):
    id: str
    entity: str = "payment_link"
    amount: Optional[int] = None
    amount_paid: Optional[int] = None
    currency: str = "INR"
    status: str  # created, partially_paid, paid, cancelled, expired
    order_id: Optional[str] = None
    reference_id: Optional[str] = None
    description: Optional[str] = None
    customer: Optional[Dict[str, Any]] = None
    short_url: Optional[str] = None
    created_at: Optional[int] = None
    notes: Optional[Dict[str, Any]] = None


class WebhookPayloadContainer(BaseModel):
    payment: Optional[Dict[str, Any]] = None
    subscription: Optional[Dict[str, Any]] = None
    payment_link: Optional[Dict[str, Any]] = None
    invoice: Optional[Dict[str, Any]] = None
    order: Optional[Dict[str, Any]] = None


class RazorpayWebhookEnvelope(BaseModel):
    """Outer Razorpay webhook envelope."""
    entity: str = "event"
    account_id: str = Field(..., description="Razorpay merchant account ID")
    event: str = Field(..., description="Webhook event name (e.g. payment.failed)")
    contains: List[str] = Field(default_factory=list)
    payload: Dict[str, Any] = Field(..., description="Entity payloads container")
    created_at: int = Field(..., description="Epoch timestamp of event generation")
