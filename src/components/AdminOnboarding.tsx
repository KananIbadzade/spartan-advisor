import { useState } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface AdminOnboardingProps {
  open: boolean;
  onClose: (dontShowAgain?: boolean) => void;
}

const STEPS = [
  {
    title: 'Welcome to the Admin Dashboard',
    description:
      'This space lets you manage users, view their profiles and roles, and perform admin actions. This short walkthrough will point out the main areas.',
  },
  {
    title: 'All Users List',
    description: 'Here you can view every user profile in the system. Use the table to see name, email, roles, and student id.',
  },
  {
    title: 'Expand Profiles',
    description: 'Click the chevron on the left of each row to expand and view full profile details like major, department and catalog year.',
  },
  {
    title: 'Roles & Statuses',
    description: 'Role badges show the current role and status (active, pending, denied). You can review pending users from the admin pages.',
  },
  {
    title: 'You’re Ready!',
    description: 'That’s it — you’re all set. You can re-open this guide anytime by clicking the Help button in the header.',
  },
];

export default function AdminOnboarding({ open, onClose }: AdminOnboardingProps) {
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <AlertDialog open={open} onOpenChange={(val) => { if (!val) onClose(dontShowAgain); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{STEPS[step].title}</AlertDialogTitle>
          <AlertDialogDescription>{STEPS[step].description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <Checkbox id="dont-show-again" checked={dontShowAgain} onCheckedChange={(v) => setDontShowAgain(Boolean(v))} />
            <label htmlFor="dont-show-again" className="text-sm text-muted-foreground">Don't show this again</label>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={back} disabled={step === 0}>Back</Button>
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={next}>Next</Button>
            ) : (
              <Button size="sm" onClick={() => onClose(dontShowAgain)}>Finish</Button>
            )}
          </div>
        </div>

        <AlertDialogFooter />
      </AlertDialogContent>
    </AlertDialog>
  );
}
