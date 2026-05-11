import logging
from app.database import SessionLocal, Base, engine
from app.db.seeder import seed_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db() -> None:
    logger.info("Creating initial data")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_db(db)
    db.close()
    logger.info("Initial data created")

if __name__ == "__main__":
    init_db()
