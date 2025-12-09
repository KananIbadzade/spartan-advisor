-- Add term, year, and archived fields to advisor_suggestions

-- Add term and year so we know which semester to add the course to
ALTER TABLE public.advisor_suggestions
ADD COLUMN IF NOT EXISTS term TEXT,
ADD COLUMN IF NOT EXISTS year TEXT,
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Create index for archived field for better query performance
CREATE INDEX IF NOT EXISTS idx_advisor_suggestions_archived ON public.advisor_suggestions(archived);

-- Update existing suggestions to have default values
UPDATE public.advisor_suggestions
SET archived = FALSE
WHERE archived IS NULL;
