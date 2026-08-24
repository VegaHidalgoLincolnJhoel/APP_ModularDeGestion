from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración de la app, cargada desde variables de entorno / .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = (
        "postgresql+psycopg2://postgres:postgres@localhost:5432/app_modulardegestion"
    )
    env: str = "development"
    cors_origins: str = "http://localhost:5173"

    # Clave de firma de los JWT de sesión. El default solo sirve para
    # desarrollo local — en producción se pisa por variable de entorno;
    # si algún día queda sin pisar en prod, todos los tokens firmados con
    # este valor público serían falsificables por cualquiera que lea el
    # repo, así que no es opcional en el deploy real (ver docs/DEPLOY.md).
    jwt_secret_key: str = "dev-secret-no-usar-en-produccion"
    jwt_algorithm: str = "HS256"
    jwt_expira_minutos: int = 60 * 24 * 7  # 7 días, sin refresh token por ahora

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
