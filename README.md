# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/280681ba-5f1b-44c5-a82b-e481b732f12b

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/280681ba-5f1b-44c5-a82b-e481b732f12b) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies for the frontend.
npm i

# Step 4: Start the frontend development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## How to completely install and configure this project

This project uses React (TypeScript) for the frontend, Node.js with Express.js for the backend (located in `/polwel-backend/`), PostgreSQL as the database, and Prisma ORM.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [PostgreSQL](https://www.postgresql.org/) (Ensure it's running and you have credentials)
- [Prisma CLI](https://www.prisma.io/docs/getting-started)

### 1. Clone the repository

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

### 2. Install frontend dependencies

In the root project directory:

```sh
npm install
# or
yarn install
```

### 3. Install backend dependencies

Navigate to the backend directory and install dependencies:

```sh
cd polwel-backend
npm install
# or
yarn install
```

### 4. Configure backend environment variables

In `/polwel-backend/`, copy the example environment file and update it with your settings:

```sh
cp .env.example .env
```

Edit `.env` and set your PostgreSQL connection string, e.g.:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

### 5. Set up the database

In `/polwel-backend/`, run Prisma migrations to set up your database schema:

```sh
npx prisma migrate dev
```

(Optional) Generate Prisma client:

```sh
npx prisma generate
```

### 6. Start the backend server

In `/polwel-backend/`:

```sh
npm run server
# or
yarn server
```

### 7. Start the frontend

Open a new terminal in the root project directory:

```sh
npm run dev
# or
yarn dev
```

The frontend will be available at `http://localhost:5173` (default Vite port), and the backend at `http://localhost:3000` (or as configured).

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Node.js
- Express.js
- PostgreSQL
- Prisma ORM

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/280681ba-5f1b-44c5-a82b-e481b732f12b) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
