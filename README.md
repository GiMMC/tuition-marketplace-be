# Tuition Marketplace Backend

A robust Next.js (App Router) RESTful backend built for the Tuition Marketplace take-home assignment. It serves as a secure, fast API integrating PostgreSQL, Redis, and Supabase Storage.

## Features
- **Next.js API Routes** (`/api/*`)
- **JWT + Redis Session Management**
- **Supabase Document Uploads & Signed Downloads**
- **Prisma ORM**
- **Swagger / OpenAPI Documentation**
- **Docker Compose & Multi-stage Docker Builds**

---

## 1. Local Development

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose (for Postgres and Redis)
- A Supabase Project (for storage bucket)

### Setup Instructions

1. **Clone the Repository** and install dependencies:
   ```bash
   npm install
   ```

2. **Prepare Environment Variables**:
   Copy `.env.example` to `.env` (or create a `.env` file) and fill in your values.
   ```env
   # Database & Redis (Matches local docker-compose configuration)
   DATABASE_URL="postgresql://postgres:password@localhost:5432/tuition_db?schema=public"
   REDIS_URL="redis://localhost:6379"

   # JWT Config
   JWT_SECRET="your_super_secret_jwt_key_here"

   # Supabase Storage Configuration
   NEXT_PUBLIC_SUPABASE_URL="https://[YOUR-REF].supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="eyJhbG..."
   SUPABASE_STORAGE_BUCKET="documents"
   ```
   *Note: For the Database URL when running locally OUTSIDE Docker, use `localhost`. When running INSIDE Docker, use the service name `db` (e.g. `postgresql://postgres:password@db:5432...`).*

3. **Start the Infrastructure (DB + Redis)**:
   ```bash
   docker compose up db redis -d
   ```

4. **Initialize the Database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the API Development Server**:
   ```bash
   npm run dev
   ```

6. **View Swagger Documentation**:
   Navigate to [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

---

## 2. Production Deployment (VPS + GitHub Actions)

The repository is configured for seamless CI/CD to a Virtual Private Server (VPS) via GitHub Actions. The pipeline builds the Docker image, pushes it to GitHub Container Registry (ghcr.io), and SSHes into your VPS to deploy it using Docker Compose.

### VPS Preparation
1. **Provision VPS**: You need an Ubuntu/Debian server with Docker and Docker Compose installed.
2. **Setup App Directory**: Create a folder on your VPS (e.g., `/opt/tuition-marketplace`).
3. **Upload Files**: Copy the `docker-compose.yml` and your production `.env` file into that folder. Ensure the `.env` uses the internal Docker network names:
   ```env
   DATABASE_URL=postgresql://postgres:password@db:5432/tuition_db?schema=public
   REDIS_URL=redis://redis:6379
   ```

### GitHub Secrets Required
In your GitHub repository settings, configure the following **Actions Secrets**:
- `VPS_HOST`: The IP address of your VPS.
- `VPS_USERNAME`: The SSH user (e.g., `root` or `ubuntu`).
- `VPS_SSH_KEY`: The private SSH key used to access the VPS.

### Deployment Workflow
The workflow is located in `.github/workflows/deploy.yml`.
1. Make a commit to the `main` branch.
2. GitHub Actions will build the `runner` target from the Dockerfile.
3. The image is published to `ghcr.io/yourusername/tuition-marketplace-be`.
4. The Action connects to your VPS, pulls the updated image, and runs `docker compose up -d` to restart the containers with zero-downtime recreation.

## Documentation
For more details on the architecture, data models, and specifications, please refer to the [SPECIFICATION_AND_PLANNING.md](./docs/SPECIFICATION_AND_PLANNING.md).
