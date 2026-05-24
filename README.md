# Medical Asset & Maintenance Management System

A comprehensive web application designed for hospitals to manage medical equipment inventory and streamline the maintenance workflow.

## 🚀 Overview

This system provides a robust platform for tracking medical assets, reporting equipment failures, and managing the repair lifecycle. It features a role-based access control system tailored for healthcare environments.

### Key Features
- **Asset Management**: Track all medical equipment with unique codes and statuses.
- **Maintenance Workflow**:
    - **Doctors**: Report equipment failures with detailed descriptions.
    - **Engineers**: View pending repairs, track part usage from inventory, and log resolution details.
- **Inventory Tracking**: Manage spare parts and automatically deduct stock upon repair completion.
- **Dashboard & Analytics**: Real-time overview of asset health and maintenance activities.
- **Automated Seeding**: System automatically resets and seeds fresh test data on every startup.

## 🛠 Tech Stack

### Backend
- **Framework**: Spring Boot 3.2.5
- **Language**: Java 21
- **Database**: MySQL (with JPA/Hibernate)
- **Security**: Spring Security + JWT
- **Lombok**: For boilerplate reduction
- **MapStruct**: For efficient DTO mapping

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Form Management**: React Hook Form + Zod
- **Icons**: Lucide React
- **UI Components**: Shadcn UI (Radix UI)

## ⚙️ Installation & Setup

### Prerequisites
- Java 21 JDK
- Node.js 18+ & npm
- MySQL Server 8.0+

### Environment Variables
The project uses environment variables for sensitive configurations. 
1. Copy the example file to create your own `.env` file at the root:
   ```bash
   cp .env.example .env
   ```
2. Adjust the values in `.env` (e.g., `SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET`).

### Backend Setup
1. Create a MySQL database named `medical_system`.
2. (Optional) Customize settings in your `.env` file.

3. Navigate to the backend directory:
   ```bash
   cd backend
   ```
4. Run the application:
   ```bash
   mvn spring-boot:run
   ```
   By default the API runs on `http://localhost:8080`. If that port is already used,
   override it locally:
   ```bash
   mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=8081
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *Note: The frontend uses `API_URL` and `NEXT_PUBLIC_API_URL` when set, otherwise it defaults to `http://localhost:8080/api`. If your backend runs on another port, create `frontend/.env.local` and set both values, for example:*
   ```env
   API_URL=http://localhost:8081/api
   NEXT_PUBLIC_API_URL=http://localhost:8081/api
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Monitoring Setup (Prometheus & Grafana)
The project includes a monitoring stack to track backend health and metrics.
1. Ensure Docker and Docker Compose are installed on your machine.
2. The backend must be running (see Backend Setup) because Prometheus will scrape metrics from it at `host.docker.internal:8080`.
3. Open a new terminal and navigate to the root directory.
4. Start the monitoring stack:
   ```bash
   docker-compose -f monitoring/docker-compose.yml up -d
   ```
5. Access the tools:
   - **Prometheus**: [http://localhost:9090](http://localhost:9090)
   - **Grafana**: [http://localhost:3001](http://localhost:3001) (Default login: `admin` / `admin`)
   - Go to Grafana -> Dashboards -> Import, and import a Spring Boot dashboard (e.g. ID `4701` or `11378`) to visualize the metrics.


## 👥 Default Accounts (Seed Data)
Every time the backend starts, the database is reset with these default accounts:

| Role | Username | Password |
| :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` |
| **Doctor** | `doctor` | `doctor123` |
| **Engineer** | `engineer` | `engineer123` |

## 📐 Architecture
The project follows a modern decoupled architecture:
- **RESTful API**: Stateless communication between frontend and backend.
- **Relational Integrity**: Structured entities for Service Logs and Part Usage to ensure data consistency.
- **Server Actions**: Next.js Server Actions for secure and efficient form submissions.
