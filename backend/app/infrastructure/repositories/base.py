"""Generic base repository for SQLAlchemy 2.0 entities."""

from typing import Any, Generic, List, Optional, Type, TypeVar
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.models import Base

T = TypeVar("T", bound=Base)


class BaseRepository(Generic[T]):
    """Generic repository providing standardized CRUD operations."""

    def __init__(self, model_cls: Type[T], session: Session) -> None:
        self.model_cls = model_cls
        self.session = session

    def get_by_id(self, entity_id: str) -> Optional[T]:
        """Fetch entity by primary key."""
        return self.session.get(self.model_cls, entity_id)

    def add(self, entity: T) -> T:
        """Add new entity to session."""
        self.session.add(entity)
        return entity

    def add_all(self, entities: List[T]) -> List[T]:
        """Add multiple entities to session."""
        self.session.add_all(entities)
        return entities

    def delete(self, entity: T) -> None:
        """Mark entity for deletion."""
        self.session.delete(entity)

    def list_all(self, limit: int = 100, offset: int = 0) -> List[T]:
        """List entities with pagination."""
        stmt = select(self.model_cls).limit(limit).offset(offset)
        return list(self.session.scalars(stmt).all())

    def count(self) -> int:
        """Count total entities."""
        stmt = select(func.count()).select_from(self.model_cls)
        return self.session.scalar(stmt) or 0
