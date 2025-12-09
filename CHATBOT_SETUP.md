# Chatbot Setup Guide

This guide explains how to set up the AI-powered chatbot with SJSU course data and roadmap integration.

## Overview

The chatbot now integrates with:
- **OpenAI API** for natural language responses
- **Supabase** for storing and retrieving SJSU course information and major roadmaps

### Course Information
When a student asks about a course (e.g., "What are the prerequisites for CMPE 133?"), the chatbot:
1. Extracts course codes from the question
2. Fetches course data from Supabase
3. Sends the data to OpenAI as context
4. Returns an informed response

### Major Roadmaps
When a student asks about a major (e.g., "Show me the Software Engineering roadmap"), the chatbot:
1. Extracts major keywords from the question
2. Fetches the roadmap from Supabase
3. Sends the 4-year plan to OpenAI as context
4. Returns detailed roadmap information

---

## Setup Steps

### 1. Create the Courses Table in Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project (`fsejffceikmzgwolzwpw`)
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of `supabase/migrations/create_courses_table.sql`
6. Paste into the SQL editor
7. Click **Run** to execute

This will:
- Create the `courses` table
- Add sample SJSU courses (CMPE, CS, MATH)
- Set up indexes for fast searching
- Enable Row Level Security (anyone can read, authenticated users can write)

### 2. Create the Roadmaps Table in Supabase

1. In the same Supabase dashboard, click **SQL Editor** again
2. Click **New Query**
3. Copy the contents of `supabase/migrations/create_roadmaps_table.sql`
4. Paste into the SQL editor
5. Click **Run** to execute

This will:
- Create the `roadmaps` table with JSONB structure
- Add the Software Engineering, BS roadmap (4-year plan)
- Set up indexes for keyword searching
- Enable Row Level Security

### 3. Verify the Tables

1. In Supabase dashboard, click **Table Editor**
2. You should see:
   - `courses` table with 15 sample courses
   - `roadmaps` table with 1 Software Engineering roadmap
3. Try viewing the data to confirm it loaded

### 4. Test the Integration

1. Go to http://localhost:8080/planner
2. Click the floating chat icon in the bottom right
3. Try these test queries:

**Course Queries:**
   - "What are the prerequisites for CMPE 133?"
   - "Tell me about CMPE 50"
   - "What courses do I need before taking CMPE 126?"
   - "Explain the difference between CS 46A and CMPE 30"

**Roadmap Queries:**
   - "Show me the Software Engineering roadmap"
   - "What courses do I take in Year 3 for Software Engineering?"
   - "What's the 4-year plan for Software Engineering?"
   - "How many units is the Software Engineering major?"

The chatbot should now give informed responses using actual course and roadmap data!

---

## How It Works

### Flow Diagrams

**Course Query Flow:**
```
User asks: "What are the prerequisites for CMPE 133?"
    ↓
Extract course codes: ["CMPE 133"]
    ↓
Query Supabase: SELECT * FROM courses WHERE code IN ('CMPE 133')
    ↓
Build context:
  "CMPE 133 - Software Engineering II
   Prerequisites: CMPE 30, CMPE 50
   Description: Advanced software engineering..."
    ↓
Enhanced Prompt:
  "Context: [course data]
   Student Question: What are the prerequisites for CMPE 133?"
    ↓
Send to OpenAI
    ↓
Get response with accurate prerequisite information
    ↓
Display to user
```

**Roadmap Query Flow:**
```
User asks: "Show me the Software Engineering roadmap"
    ↓
Extract major keywords: ["software engineering"]
    ↓
Query Supabase: SELECT * FROM roadmaps WHERE keywords @> ARRAY['software engineering']
    ↓
Build context:
  "SJSU Software Engineering, BS - 4-Year Roadmap
   Year 1 Fall (16 units)
     - CS 46A: Introduction to Programming (4 units)
     - ENGR 10: Introduction to Engineering (3 units)
   ..."
    ↓
Enhanced Prompt:
  "Context: [roadmap data]
   Student Question: Show me the Software Engineering roadmap"
    ↓
Send to OpenAI
    ↓
Get response with year-by-year course plan
    ↓
Display to user
```

**Combined Query Flow:**
```
User asks: "What's CMPE 133 and when do I take it in Software Engineering?"
    ↓
Extract both course codes AND major keywords
    ↓
Query Supabase for BOTH courses AND roadmap
    ↓
Build combined context with course info + roadmap
    ↓
Send to OpenAI with full context
    ↓
Get comprehensive response
    ↓
Display to user
```

### Code Structure

- **`src/lib/supabase-queries.ts`** - Database query functions

  **Course Functions:**
  - `getCourseInfo()` - Get a single course by code
  - `searchCourses()` - Search courses by keyword
  - `getCoursesByCodes()` - Get multiple courses
  - `extractCourseCodes()` - Parse course codes from text
  - `buildCourseContext()` - Format course data for AI

  **Roadmap Functions:**
  - `searchRoadmaps()` - Search roadmaps by keyword
  - `getRoadmapByMajor()` - Get roadmap by exact major name
  - `extractMajorKeywords()` - Parse major keywords from text
  - `buildRoadmapContext()` - Format roadmap data for AI

- **`src/components/ChatbotWidget.tsx`** - Main chatbot UI
  - Extracts course codes and major keywords from user messages
  - Fetches course data and roadmaps from Supabase
  - Enhances prompts with course/roadmap context
  - Calls OpenAI API
  - Displays responses

- **`src/lib/api.ts`** - OpenAI API integration
  - `callOpenAI()` - Send prompt to OpenAI
  - `callOpenAIWithHistory()` - Conversation with history

---

## Adding More Courses

### Option 1: Manually via Supabase Dashboard

1. Go to **Table Editor** → **courses**
2. Click **Insert** → **Insert row**
3. Fill in the fields:
   - `code`: "CMPE 130"
   - `name`: "Advanced Algorithms"
   - `units`: 3
   - `description`: "..."
   - `prerequisites`: ["CMPE 126"] (use array syntax)
4. Click **Save**

### Option 2: Bulk Insert via SQL

```sql
INSERT INTO courses (code, name, units, description, prerequisites) VALUES
  ('CMPE 130', 'Advanced Algorithms', 3, 'Advanced algorithm design...', ARRAY['CMPE 126']),
  ('CMPE 152', 'Compiler Design', 3, 'Theory and practice...', ARRAY['CMPE 126']),
  ('CMPE 172', 'Enterprise Software', 3, 'Large-scale systems...', ARRAY['CMPE 131'])
ON CONFLICT (code) DO NOTHING;
```

### Option 3: Import from CSV

1. Prepare a CSV file with columns: `code, name, units, description, prerequisites`
2. In Supabase dashboard → **Table Editor** → **courses**
3. Click **Import data via spreadsheet**
4. Upload your CSV

---

## Adding More Roadmaps

### Manually via SQL Editor

To add additional major roadmaps (Computer Science, Electrical Engineering, etc.):

1. Go to **SQL Editor** in Supabase dashboard
2. Use this template:

```sql
INSERT INTO roadmaps (
  major_name,
  degree_type,
  keywords,
  description,
  roadmap_data,
  notes,
  gpa_requirements,
  total_units
) VALUES (
  'Computer Science',  -- Major name
  'BS',                -- Degree type
  ARRAY['computer science', 'cs', 'comp sci'],  -- Search keywords
  'Sample 4-year roadmap for Computer Science',
  '{
    "year1": {
      "fall": {
        "semester": "Year 1 Fall",
        "total_units": 16,
        "courses": [
          {"code": "CS 46A", "name": "Introduction to Programming", "units": 4},
          {"code": "MATH 30", "name": "Calculus I", "units": 3}
        ]
      },
      "spring": {
        "semester": "Year 1 Spring",
        "total_units": 15,
        "courses": [
          {"code": "CS 46B", "name": "Introduction to Data Structures", "units": 4}
        ]
      }
    }
  }'::jsonb,
  'Important notes about the roadmap...',
  'Minimum 2.0 GPA required...',
  120
);
```

**Important:** The `roadmap_data` field must be valid JSON with this structure:
- `year1`, `year2`, `year3`, `year4` (top level)
- Each year has `fall` and `spring` objects
- Each semester has: `semester`, `total_units`, `courses` array
- Each course has: `code`, `name`, `units`, optional `ge`, `note`, `flexible`

### Parsing Existing Roadmap Files

If you have roadmap text files like `course-roadmap-data.txt`, you can:

1. **Manual Parsing** - Copy the structure above and fill in course data by hand
2. **Script It** - Write a Python/Node script to parse the text file and generate SQL INSERT statements
3. **Use ChatGPT** - Paste your roadmap text and ask it to convert to the JSON format above

---

## Customizing the AI Behavior

Edit the system message in `src/lib/api.ts`:

```typescript
export async function callOpenAI(
  prompt: string,
  systemMessage: string = "You are a helpful assistant for SJSU students..."
) {
  // Customize this message to change AI personality/behavior
}
```

Example customizations:
- Make it more formal: "You are a professional academic advisor..."
- Add specific rules: "Always suggest students talk to an advisor for official requirements."
- Change personality: "You are a friendly peer mentor helping SJSU students..."

---

## Troubleshooting

### "No response from OpenAI"
- Check that `VITE_OPENAI_API_KEY` is set in `.env`
- Verify your OpenAI API key is valid
- Check you have credits in your OpenAI account

### "Error fetching course"
- Verify the `courses` table exists in Supabase
- Check RLS policies are set correctly
- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are correct

### Course data not showing up in responses
- Open browser console and check for errors
- Verify course codes are being extracted (check console logs)
- Test Supabase query directly in the SQL editor

### Chatbot not appearing
- The ChatbotWidget is only on the `/planner` page
- Check browser console for errors
- Verify the component is imported in `Planner.tsx`

---

## Future Enhancements

Ideas for improving the chatbot:

1. **Add more course data**
   - Import full SJSU catalog
   - Add professor information
   - Include class schedules

2. **Semantic search**
   - Use embeddings for better search
   - Find courses by topic, not just code

3. **Conversation memory**
   - Remember previous messages in conversation
   - Build up context over multiple questions

4. **User context**
   - Access student's current plan
   - Personalize recommendations
   - Track completed courses

5. **Advanced features**
   - Suggest course sequences
   - Check prerequisite chains
   - Warn about conflicts

---

## Cost Considerations

### OpenAI Costs
- GPT-3.5-turbo: ~$0.002 per conversation
- GPT-4: ~$0.06 per conversation
- Estimate: 1000 messages/month = ~$2-60/month

### Supabase Costs
- Free tier: 500 MB database (plenty for course data)
- Course data: ~10-25 MB for all SJSU courses
- **Cost: $0** (stays within free tier)

### Total Monthly Cost
- Development: ~$5-20/month
- Production (1000 users): ~$25-100/month

---

## Security Notes

- OpenAI API key is in `.env` (never commit to git!)
- Supabase RLS is enabled (anyone can read courses, authenticated users can modify)
- Client-side API calls use `dangerouslyAllowBrowser: true` (acceptable for this use case)
- Consider moving to serverless functions for production

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review code comments in the source files
3. Check Supabase logs in the dashboard
4. Test with the `/test-api` page first
