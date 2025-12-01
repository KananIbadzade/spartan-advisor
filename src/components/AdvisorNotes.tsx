import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AdvisorNote {
  id: string;
  content: string;
  created_at: string;
  advisor_id?: string;
}

interface AdvisorSuggestion {
  id: string;
  content: string;
  category?: string;
  created_at: string;
  advisor_id?: string;
  status?: string;
}

export const DisplayNotes: React.FC<{ notes: AdvisorNote[]; emptyMessage?: string }> = ({ notes, emptyMessage }) => {
  if (!notes.length) return <Card className="p-4 text-sm text-muted-foreground">{emptyMessage || 'No notes'}</Card>;
  return (
    <Card className="p-4 space-y-3">
      <h4 className="text-sm font-semibold">Advisor Notes</h4>
      {notes.map(n => (
        <div key={n.id} className="text-sm border rounded p-2 bg-muted/40">
          <div className="flex justify-between mb-1">
            <Badge variant="outline">{new Date(n.created_at).toLocaleDateString()}</Badge>
            {n.advisor_id && <span className="text-xs text-muted-foreground">{n.advisor_id}</span>}
          </div>
          <p>{n.content}</p>
        </div>
      ))}
    </Card>
  );
};

export const DisplaySuggestions: React.FC<{ suggestions: AdvisorSuggestion[]; emptyMessage?: string }> = ({ suggestions, emptyMessage }) => {
  if (!suggestions.length) return <Card className="p-4 text-sm text-muted-foreground">{emptyMessage || 'No suggestions'}</Card>;
  return (
    <Card className="p-4 space-y-3">
      <h4 className="text-sm font-semibold">Advisor Suggestions</h4>
      {suggestions.map(s => (
        <div key={s.id} className="text-sm border rounded p-2 bg-muted/40">
          <div className="flex justify-between mb-1">
            <Badge variant="secondary">{s.category || 'General'}</Badge>
            <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
          </div>
          <p>{s.content}</p>
        </div>
      ))}
    </Card>
  );
};