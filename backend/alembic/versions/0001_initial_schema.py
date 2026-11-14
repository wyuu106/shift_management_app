"""初期スキーマ

Revision ID: 0001
Revises:
Create Date: 2026-11-12
"""
from alembic import op
import sqlalchemy as sa


revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


PENDING_ONLY = "status = 'pending'"


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("auth_id", sa.String(length=36), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("auth_id"),
    )

    op.create_table(
        "user_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # 未処理の申請だけを対象にした部分一意インデックス
    op.create_index(
        "uq_pending_request_user_id",
        "user_requests",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text(PENDING_ONLY),
        sqlite_where=sa.text(PENDING_ONLY),
    )
    op.create_index(
        "uq_pending_request_name",
        "user_requests",
        ["name"],
        unique=True,
        postgresql_where=sa.text(PENDING_ONLY),
        sqlite_where=sa.text(PENDING_ONLY),
    )

    op.create_table(
        "shift_periods",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("start", sa.Date(), nullable=False),
        sa.Column("end", sa.Date(), nullable=False),
        sa.Column(
            "shift_version",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "business_dates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("business_date", sa.Date(), nullable=False),
        sa.Column("period_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["period_id"], ["shift_periods.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "shift_request_versions",
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("period_id", sa.Integer(), nullable=False),
        sa.Column(
            "version",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["period_id"],
            ["shift_periods.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", "period_id"),
    )

    op.create_table(
        "shift_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("shift_date", sa.Date(), nullable=False),
        sa.Column("remark", sa.String(), nullable=True),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "shifts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("shift_date", sa.Date(), nullable=False),
        sa.Column("remark", sa.String(), nullable=True),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("shifts")
    op.drop_table("shift_requests")
    op.drop_table("shift_request_versions")
    op.drop_table("business_dates")
    op.drop_table("shift_periods")
    op.drop_index("uq_pending_request_name", table_name="user_requests")
    op.drop_index("uq_pending_request_user_id", table_name="user_requests")
    op.drop_table("user_requests")
    op.drop_table("users")
