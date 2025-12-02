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

### Profile pictures / avatars

Admins and advisors can now see user profile pictures (avatars) across the app. The upload uses Supabase Storage and stores the object path in the `profiles.avatar_url` column. Key points:

- A migration was added to the project: `supabase/migrations/20251201120000_add_avatar_url_to_profiles.sql` (adds `avatar_url` column to `profiles`).
- Uploads are stored in the `avatars` bucket in Supabase Storage (private bucket recommended). The app stores the object path (e.g. `user-id/avatar_...png`) in `profiles.avatar_url` and uses short-lived signed URLs for display.
- You'll need to create a private storage bucket named `avatars` in your Supabase project (UI or CLI). For best security:
	- Make the bucket private so files are not publicly accessible
	- Add a storage policy so authenticated users can upload/remove files only under their own folder prefix (e.g. `user.id/*`)

Quick commands (Supabase CLI) to create the bucket (example):

```bash
# create a private bucket named avatars
supabase storage bucket create avatars --public false
```

To support uploading and signed URLs you should ensure the app's service role (server side) or RLS policies support updating `profiles.avatar_url` and that storage policies allow the user to manage files only in their own path.

Testing tips:
- During development you can clear/force the avatar by removing `avatar_url` from a profile and deleting the file in the storage bucket.
- The app uses short-lived signed URLs (1 hour) to display avatars; if you need longer or shorter times adjust the createSignedUrl expiration where used.

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