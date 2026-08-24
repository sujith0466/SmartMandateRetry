"""Domain entity repositories for Merchant, Policy, Customer, Subscription, Actions, and Evaluation."""

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.models import (
    Customer, EvaluationRun, EvaluationScenarioResult, Merchant,
    RecoveryAction, RecoveryDecision, RecoveryPolicy, Subscription
)
from app.infrastructure.repositories.base import BaseRepository


class MerchantRepository(BaseRepository[Merchant]):
    def __init__(self, session: Session) -> None:
        super().__init__(Merchant, session)

    def find_by_razorpay_account(self, razorpay_account_id: str) -> Optional[Merchant]:
        stmt = select(Merchant).where(Merchant.razorpay_account_id == razorpay_account_id)
        return self.session.scalars(stmt).first()


class RecoveryPolicyRepository(BaseRepository[RecoveryPolicy]):
    def __init__(self, session: Session) -> None:
        super().__init__(RecoveryPolicy, session)

    def find_by_merchant_id(self, merchant_id: str) -> Optional[RecoveryPolicy]:
        stmt = select(RecoveryPolicy).where(RecoveryPolicy.merchant_id == merchant_id)
        return self.session.scalars(stmt).first()


class CustomerRepository(BaseRepository[Customer]):
    def __init__(self, session: Session) -> None:
        super().__init__(Customer, session)

    def find_by_razorpay_id(self, merchant_id: str, razorpay_customer_id: str) -> Optional[Customer]:
        stmt = select(Customer).where(
            Customer.merchant_id == merchant_id,
            Customer.razorpay_customer_id == razorpay_customer_id
        )
        return self.session.scalars(stmt).first()


class SubscriptionRepository(BaseRepository[Subscription]):
    def __init__(self, session: Session) -> None:
        super().__init__(Subscription, session)

    def find_by_razorpay_id(self, razorpay_subscription_id: str) -> Optional[Subscription]:
        stmt = select(Subscription).where(
            Subscription.razorpay_subscription_id == razorpay_subscription_id
        )
        return self.session.scalars(stmt).first()

    def list_by_customer_id(self, customer_id: str) -> List[Subscription]:
        stmt = select(Subscription).where(Subscription.customer_id == customer_id)
        return list(self.session.scalars(stmt).all())


class RecoveryDecisionRepository(BaseRepository[RecoveryDecision]):
    def __init__(self, session: Session) -> None:
        super().__init__(RecoveryDecision, session)

    def list_by_case_id(self, recovery_case_id: str) -> List[RecoveryDecision]:
        stmt = (
            select(RecoveryDecision)
            .where(RecoveryDecision.recovery_case_id == recovery_case_id)
            .order_by(RecoveryDecision.created_at.asc())
        )
        return list(self.session.scalars(stmt).all())


class RecoveryActionRepository(BaseRepository[RecoveryAction]):
    def __init__(self, session: Session) -> None:
        super().__init__(RecoveryAction, session)

    def find_by_idempotency_key(self, idempotency_key: str) -> Optional[RecoveryAction]:
        stmt = select(RecoveryAction).where(RecoveryAction.idempotency_key == idempotency_key)
        return self.session.scalars(stmt).first()

    def list_by_case_id(self, recovery_case_id: str) -> List[RecoveryAction]:
        stmt = (
            select(RecoveryAction)
            .where(RecoveryAction.recovery_case_id == recovery_case_id)
            .order_by(RecoveryAction.executed_at.asc())
        )
        return list(self.session.scalars(stmt).all())


class EvaluationRepository(BaseRepository[EvaluationRun]):
    def __init__(self, session: Session) -> None:
        super().__init__(EvaluationRun, session)

    def get_latest_runs(self, limit: int = 10) -> List[EvaluationRun]:
        stmt = select(EvaluationRun).order_by(EvaluationRun.created_at.desc()).limit(limit)
        return list(self.session.scalars(stmt).all())
