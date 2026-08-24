"""usuarios: campo activo para revocar acceso sin borrar

Revision ID: bb34c6033f2f
Revises: be1f7ca24465
Create Date: 2026-08-24 03:04:52.064795

A diferencia de la migración anterior (username/password_hash NOT NULL
sin default, aceptable ahí porque todavía no había ningún login real),
esta sí necesita un server_default: para cuando corra, auth ya está en
producción y puede haber usuarios reales cargados. Todos arrancan activos
— nadie queda desconectado por una migración.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bb34c6033f2f'
down_revision: Union[str, None] = 'be1f7ca24465'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'usuarios',
        sa.Column('activo', sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    # El server_default solo hacía falta para completar las filas
    # existentes en el momento del ALTER; de acá en más, quien maneja el
    # valor por defecto de una fila nueva es la app (Usuario.activo en el
    # modelo), no la DB — se lo saca para no tener la regla en dos lugares.
    op.alter_column('usuarios', 'activo', server_default=None)


def downgrade() -> None:
    op.drop_column('usuarios', 'activo')
