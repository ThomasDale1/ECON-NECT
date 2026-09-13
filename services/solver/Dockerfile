# ECON NECT — microservicio del optimizador (S-A7). Se construye y despliega
# aparte de apps/web (AGENTS.md §4.2): este es el único código Python del
# repositorio. El hosting final se decide en S-TODOS (Paso 0 / decisiones).

FROM python:3.14-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

COPY app ./app

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
