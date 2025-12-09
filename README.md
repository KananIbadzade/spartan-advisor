# SJSU MyPlanner (SpartanAdvisor)

**Your academic planning companion for SJSU students and advisors.**

Plan courses, upload transcripts, get AI-powered recommendations, and connect with your advisor—all in one place.

---

## What is This?

SJSU MyPlanner helps students map out their degree journey and advisors guide them along the way. Think of it as your personalized academic GPS.

**For Students:**

- Build and visualize your course plan semester by semester
- Upload your transcript and auto-import completed classes
- Get course suggestions based on your progress
- Chat with your assigned advisor about your plan

**For Advisors:**

- Review and approve student course plans
- Leave notes and suggestions for students
- Track student progress across semesters

**For Admins:**

- Manage users, approve advisor accounts, and oversee the platform

---

## 🛠️ Tech Stack

built this with modern, battle-tested tools:

- **Frontend:** React + TypeScript + Vite (fast dev server, quick builds)
- **UI:** Tailwind CSS + shadcn-ui (clean, accessible components)
- **Backend:** Supabase (PostgreSQL database + authentication + file storage)
- **Routing:** React Router v6
- **AI:** OpenAI API (for the chatbot assistant)

**Why these tools?**  
They're fast, well-documented, and scale effortlessly. Supabase handles auth, database, and storage so we can focus on features instead of infrastructure.

---

## Quick Start

### Prerequisites

- **Node.js 18+** and **npm** installed ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- A **Supabase account** (free tier works fine: [supabase.com](https://supabase.com))
- (Optional) An **OpenAI API key** if you want the chatbot to work

### Installation

1. **Clone the repo:**

   ```sh
   git clone <YOUR_GIT_URL>
   cd spartanadvisor
   ```

2. **Install dependencies:**

   ```sh
   npm install
   ```

3. **Set up your environment:**

   - Copy `env.example` to `.env`:
     ```sh
     cp env.example .env
     ```
   - Open `.env` and fill in your Supabase credentials:
     ```dotenv
     VITE_SUPABASE_URL=https://your-project-id.supabase.co
     VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
     VITE_OPENAI_API_KEY=sk-proj-your-openai-key (optional)
     ```
   - Get these from your [Supabase project settings](https://app.supabase.com) → **API** section.

4. **Run database migrations:**

   - In your Supabase dashboard, go to **SQL Editor** and run all the migration files in `supabase/migrations/` in order (or use the Supabase CLI if you have it installed).

5. **Start the dev server:**

   ```sh
   npm run dev
   ```

   - Open [http://localhost:8080](http://localhost:8080) (default Vite port in this project)

6. **Create an account:**
   - Sign up with an `@sjsu.edu` email (email verification is optional—you can disable it in Supabase → **Auth** → **Providers** → **Email** → turn off "Confirm email")
   - Pick your role (Student or Advisor)
   - Start planning!

---

---

## Project Structure

```
spartanadvisor/
├── src/
│   ├── pages/          # Main app pages (Auth, Dashboard, Planner, etc.)
│   ├── components/     # Reusable UI components
│   ├── lib/            # Utilities, API calls, services
│   ├── integrations/   # Supabase client + generated types
│   └── hooks/          # Custom React hooks
├── supabase/
│   ├── migrations/     # Database schema + migrations
│   └── functions/      # Edge functions (serverless backend)
├── public/             # Static assets
└── .env                # Your secrets (DO NOT commit this!)
```

**Import alias:** Use `@/` instead of `../../` everywhere (e.g., `import { supabase } from "@/integrations/supabase/client"`).

---

## 🔧 Development Commands

```sh
# Start dev server (runs on port 8080)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Lint your code
npm run lint
```

---

## 🎓 How It Works

### The Flow (Student Perspective)

1. **Sign up** with your SJSU email → pick "Student" role
2. **Upload your transcript** (PDF) → system parses it and extracts completed courses
3. **Go to Planner** → click "Import from Transcript" to auto-add your classes
4. **Drag courses** into future semesters to build your plan
5. **(Coming soon)** Submit your plan → your advisor reviews and approves it
6. **Get suggestions** from your advisor or the AI chatbot

### The Flow (Advisor Perspective)

1. **Sign up** → pick "Advisor" role → wait for admin approval
2. **View assigned students** and their course plans
3. **Leave notes/suggestions** on plans
4. **(Coming soon)** Approve or reject submitted plans with feedback

### The Flow (Admin Perspective)

1. **Approve advisor requests** from the Pending Advisors page
2. **Manage users** (view roles, delete accounts, etc.)
3. **Monitor the platform** from the Admin Dashboard

---

## 🧪 Testing Tips

- **Disable email verification** for faster testing: Supabase Dashboard → **Auth** → **Providers** → **Email** → turn off "Confirm email"
- **Create test accounts** with different roles to see the full flow
- **Check browser console** for helpful debug logs (especially in the Planner and Transcript pages)
- **Use Supabase SQL Editor** to inspect/modify data directly if needed

---

## 📦 Supabase Setup Checklist

Make sure you've done these in your Supabase project:

- [ ] Run all migrations from `supabase/migrations/` (or use Supabase CLI)
- [ ] Create a **private storage bucket** named `transcripts` (for transcript PDFs)
- [ ] Create a **private storage bucket** named `avatars` (for profile pictures)
- [ ] Add **storage policies** so users can only access their own files:
  ```sql
  -- Example: Allow users to upload/view their own transcripts
  CREATE POLICY "Users can upload own transcripts"
  ON storage.objects FOR INSERT
  TO authenticated
  USING (bucket_id = 'transcripts' AND auth.uid()::text = (storage.foldername(name))[1]);
  ```
- [ ] (Optional) Seed the `courses` and `departments` tables with real SJSU data for better testing

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. **Fork** the repo
2. **Create a feature branch:** `git checkout -b feature/your-feature-name`
3. **Make your changes** and commit: `git commit -m "Add cool feature"`
4. **Push** to your branch: `git push origin feature/your-feature-name`
5. **Open a Pull Request** on GitHub

**Code Style:** We use ESLint + Prettier. Run `npm run lint` before committing.

---

## 📄 License

This project is licensed under the **MIT License**. Feel free to use it, modify it, and share it!

---

## 🆘 Need Help?

- **Bug?** Open an issue on GitHub
- **Question?** Check the code comments or ask in Discussions
- **Stuck on Supabase?** Check their [docs](https://supabase.com/docs) or our migration files for examples

**Happy planning! 🎉**
