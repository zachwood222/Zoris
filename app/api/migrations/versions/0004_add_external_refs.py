"""Add external reference columns for imported documents."""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0004_add_external_refs"
down_revision = "0003_incoming_trucks"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sale", sa.Column("external_ref", sa.String(length=100), nullable=True))
    op.add_column("po", sa.Column("external_ref", sa.String(length=100), nullable=True))
    op.add_column("receiving", sa.Column("external_ref", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("receiving", "external_ref")
    op.drop_column("po", "external_ref")
    op.drop_column("sale", "external_ref")
