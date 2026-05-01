# Sure - Python Backend

This is the Python backend for the Sure application.

## Legal & Compliance

This project is an open-source port of the Sure application (originally a fork of Maybe Finance). 
It is licensed under the **AGPLv3** license. 

By contributing to or using this repository, you agree to the terms of the AGPLv3. This ensures that any modified, network-accessible versions of this software remain open source.

Note: This project is the "Python version of the product Sure".

## Setup

```bash
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```
