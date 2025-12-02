# SpartanAdvisor

A comprehensive academic planning and advising platform for SJSU students.

## Project Overview

SpartanAdvisor is designed to help students plan their academic journey, connect with advisors, and manage their course schedules effectively.

## Technologies Used

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase
- React Router

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation
- NOTE: before running the server an environment must be created, please check out env.example for reference on how to create this

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd spartanadvisor

# Install dependencies
npm install


# Start the development server
npm run dev
```

## Features

- User authentication and role management
- Academic planning and course scheduling
- Advisor-student communication
- Transcript management
- Admin dashboard for system management

### Admin onboarding / walkthrough

New admin users will now see a short step-by-step walkthrough when they visit the Admin Dashboard for the first time. The walkthrough can be dismissed, and there is a "Don't show this again" option which persists in localStorage. Admins can re-open the walkthrough using the Help button in the Admin header.

## Development

```sh
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Commit your changes
5. Push to the branch
6. Create a Pull Request

## License

This project is licensed under the MIT License.