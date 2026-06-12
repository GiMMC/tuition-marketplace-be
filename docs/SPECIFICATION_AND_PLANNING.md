# Tuition Marketplace - Specification & Planning

## 1. System Overview
The Tuition Marketplace backend is a RESTful API built to facilitate connections between **Parents** and **Tutors**. The system handles user authentication, profile management, case creation, tutor invitations, and secure document management.

## 2. Technology Stack
- **Framework**: Next.js 15+ (App Router) acting as a dedicated backend.
- **Language**: TypeScript for end-to-end type safety.
- **Database**: PostgreSQL with Prisma ORM.
- **Caching & Sessions**: Redis (via `ioredis`) for JWT blacklisting and fast session invalidation.
- **Storage**: Supabase Storage Buckets for secure document uploads.
- **Containerization**: Docker & Docker Compose for seamless dev and production environments.
- **Documentation**: Swagger / OpenAPI integration (`next-swagger-doc` & `swagger-ui-react`).

## 3. Data Models (Prisma)
- **User**: Core authentication model. Holds `id`, `email`, `password` (hashed), and `role` (`PARENT` or `TUTOR`).
- **TutorProfile**: Associated 1:1 with a User (if role is TUTOR). Contains `displayName`, `qualifications`, and `experiences`.
- **Case**: A tuition job posted by a Parent. Contains `title`, `subject`, `level`, `location`, `budgetPerHour`, `status`, and relates to the owning Parent.
- **CaseInvitation**: A junction table linking a `Case` and a `TutorProfile`, representing a tutor invited by a parent.
- **Document**: Represents a file uploaded to Supabase. Can be attached to either a `Case` or a `TutorProfile`.

## 4. Authentication & Authorization
- **JWT via HTTP-Only Cookies**: Tokens are generated on login/registration and sent via secure cookies, protecting against XSS attacks.
- **Stateless Verification**: API routes extract the cookie, verify the signature, and attach the user payload to the request lifecycle.
- **Redis Blacklisting**: On logout, the JWT is placed in a Redis blacklist with a TTL matching its expiration time.
- **Granular Access Control**:
  - Tutors can only view cases they have been explicitly invited to.
  - Parents can only edit cases they own.
  - Documents inherit the access control of their parent entity (Case or TutorProfile).

## 5. Deployment Strategy
The application is designed to be deployed to a VPS (Virtual Private Server) using a CI/CD pipeline powered by **GitHub Actions** and **Docker Registries**.

### CI/CD Workflow
1. **Push to Main**: Code pushed to the `main` branch triggers the GitHub Action.
2. **Build Docker Image**: GitHub Action builds the Docker image using the multi-stage `Dockerfile` (`target: runner`).
3. **Push to Registry**: The built image is pushed to a Docker Registry (e.g., GitHub Container Registry (ghcr.io) or Docker Hub).
4. **Deploy to VPS**:
   - The action SSHes into the target VPS.
   - Pulls the latest image from the registry.
   - Restarts the containers using `docker compose up -d`.

### Required VPS Infrastructure
- A Linux VPS (Ubuntu/Debian) with Docker and Docker Compose installed.
- A `.env` file securely stored on the VPS containing database, Redis, and Supabase credentials.
- A `docker-compose.prod.yml` to orchestrate the API, PostgreSQL, and Redis containers on the host.
