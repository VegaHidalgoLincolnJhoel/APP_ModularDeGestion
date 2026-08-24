from sqlalchemy import Boolean, CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = (
        # Un admin no está atado a un negocio (negocio_id null); cualquier
        # otro rol sí tiene que estarlo. Se refuerza a nivel de DB y no solo
        # en el endpoint de login, para que un dato mal cargado a mano no
        # pueda dejar un usuario "negocio" huérfano de negocio_id.
        CheckConstraint(
            "(rol = 'admin' AND negocio_id IS NULL) OR (rol != 'admin' AND negocio_id IS NOT NULL)",
            name="ck_usuarios_admin_sin_negocio",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int | None] = mapped_column(ForeignKey("negocios.id"), nullable=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    rol: Mapped[str] = mapped_column(String(50), nullable=False)
    username: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    # Para "revocar" un acceso sin perder el historial: un movimiento viejo
    # sigue apuntando a este usuario_id aunque ya no pueda loguearse más.
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    negocio: Mapped["Negocio"] = relationship(back_populates="usuarios")
