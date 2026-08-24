"""cola_sync: id de cliente para idempotencia de sync

Revision ID: ea7946e19e07
Revises: c9cae7be7e10
Create Date: 2026-08-23 15:14:49.904942

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ea7946e19e07'
down_revision: Union[str, None] = 'c9cae7be7e10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # batch_alter_table en vez de op.add_column/op.create_unique_constraint
    # sueltos: en Postgres emite el mismo ALTER TABLE de siempre, pero
    # SQLite no soporta agregar una unique constraint vía ALTER — solo via
    # el modo batch (copy-and-move). Con esto la migración corre en ambos.
    with op.batch_alter_table('cola_sync') as batch_op:
        batch_op.add_column(sa.Column('cliente_id', sa.String(length=64), nullable=False))
        batch_op.create_unique_constraint(
            'uq_cola_sync_negocio_cliente_id', ['negocio_id', 'cliente_id']
        )


def downgrade() -> None:
    with op.batch_alter_table('cola_sync') as batch_op:
        batch_op.drop_constraint('uq_cola_sync_negocio_cliente_id', type_='unique')
        batch_op.drop_column('cliente_id')
