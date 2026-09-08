"""movimientos: campo cantidad para ventas y servicios de multiples unidades

Revision ID: a7b8c9d0e1f2
Revises: f1d2c3e4b5a6
Create Date: 2026-09-07 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, None] = 'f1d2c3e4b5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'movimientos',
        sa.Column('cantidad', sa.Integer(), nullable=False, server_default='1'),
    )
    op.alter_column('movimientos', 'cantidad', server_default=None)


def downgrade() -> None:
    op.drop_column('movimientos', 'cantidad')
