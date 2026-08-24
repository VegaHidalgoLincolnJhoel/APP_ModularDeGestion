"""movimientos: campo monto_capital para costeo y cierres de caja

Revision ID: f1d2c3e4b5a6
Revises: bb34c6033f2f
Create Date: 2026-08-24 18:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1d2c3e4b5a6'
down_revision: Union[str, None] = 'bb34c6033f2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'movimientos',
        sa.Column('monto_capital', sa.Numeric(10, 2), nullable=False, server_default='0'),
    )
    op.alter_column('movimientos', 'monto_capital', server_default=None)


def downgrade() -> None:
    op.drop_column('movimientos', 'monto_capital')
