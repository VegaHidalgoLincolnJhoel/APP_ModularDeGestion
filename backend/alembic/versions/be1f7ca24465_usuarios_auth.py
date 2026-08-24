"""usuarios: username, password_hash y negocio_id opcional para admin

Revision ID: be1f7ca24465
Revises: ea7946e19e07
Create Date: 2026-08-24 02:48:27.537071

Habilita login real (ver app/core/auth.py, app/api/v1/auth.py): cada
usuario pasa a tener credenciales propias, y un admin puede existir sin
estar atado a un negocio_id puntual (puede operar sobre cualquiera).

Nota para quien tenga una DB de desarrollo con usuarios ya cargados desde
antes de este cambio: username/password_hash quedan NOT NULL a propósito
(un usuario sin credenciales no puede loguearse, no tendría sentido
dejarlo nullable "por las dudas"). Como todavía no hay datos reales en
producción, no se agregó backfill automático — si esto falla contra una
DB de desarrollo con filas viejas, lo más simple es truncar `usuarios` y
volver a correr el script de seed (`scripts/seed_admin_y_negocios.py`).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'be1f7ca24465'
down_revision: Union[str, None] = 'ea7946e19e07'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # batch_alter_table: en Postgres emite el mismo ALTER TABLE de siempre,
    # pero SQLite no soporta ALTER COLUMN ni agregar unique/check constraint
    # fuera del modo batch (copy-and-move) — mismo motivo que en
    # ea7946e19e07_cola_sync_id_de_cliente_para_.py.
    with op.batch_alter_table('usuarios') as batch_op:
        batch_op.add_column(sa.Column('username', sa.String(length=100), nullable=False))
        batch_op.add_column(sa.Column('password_hash', sa.String(length=255), nullable=False))
        batch_op.alter_column('negocio_id', existing_type=sa.INTEGER(), nullable=True)
        batch_op.create_unique_constraint('uq_usuarios_username', ['username'])
        # Autogenerate no detecta CHECK constraints por default, así que este
        # queda a mano: refuerza a nivel de DB que solo un admin puede tener
        # negocio_id nulo (ver Usuario.__table_args__ en app/models/usuario.py).
        batch_op.create_check_constraint(
            'ck_usuarios_admin_sin_negocio',
            "(rol = 'admin' AND negocio_id IS NULL) OR (rol != 'admin' AND negocio_id IS NOT NULL)",
        )


def downgrade() -> None:
    with op.batch_alter_table('usuarios') as batch_op:
        batch_op.drop_constraint('ck_usuarios_admin_sin_negocio', type_='check')
        batch_op.drop_constraint('uq_usuarios_username', type_='unique')
        batch_op.alter_column('negocio_id', existing_type=sa.INTEGER(), nullable=False)
        batch_op.drop_column('password_hash')
        batch_op.drop_column('username')
