from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sure"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "sqlite:///./sure.db" # Defaulting to SQLite for development, switch to postgres later
    
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
