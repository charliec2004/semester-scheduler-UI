import { useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { Button } from './button';
import { DialogShell } from './dialog-shell';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h4 className="text-sm font-semibold text-surface-100">{title}</h4>
      <div className="space-y-2 text-[13px] leading-6 text-surface-300">{children}</div>
    </section>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded border border-border bg-surface-800 px-1.5 py-0.5 font-mono text-[12px] text-surface-200">
      {children}
    </code>
  );
}

export function InfoHelpModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="ghost"
        size="sm"
        aria-label="Open software guide"
      >
        <CircleHelp className="h-4 w-4" strokeWidth={1.8} />
        Info
      </Button>

      <DialogShell
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="How To Use Semester Scheduler"
        description="A plain-language guide to what each part of the app does and how to use it."
        widthClassName="max-w-3xl"
        contentClassName="max-h-[min(82vh,760px)] overflow-y-auto"
      >
        <div className="space-y-6">
          <Section title="What This App Does">
            <p>
              Semester Scheduler helps you build a weekly work schedule for student employees. You tell
              the app who can work, what they can do, when they are unavailable, and how many hours
              each department needs. The app then creates a schedule that tries to balance those needs.
            </p>
            <p>
              You can start from imported files, or you can build everything manually inside the app.
              Both approaches work.
            </p>
          </Section>

          <Section title="Different Ways To Start">
            <p>
              There is no single required workflow. Most users will do one of these:
            </p>
            <ul className="space-y-2 pl-5">
              <li>- Open a saved config file, then review and adjust it.</li>
              <li>- Create departments first, then add staff manually.</li>
              <li>- Open a saved project from this device and make small updates.</li>
              <li>- Start with a very simple setup, generate a draft schedule, and refine it from there.</li>
            </ul>
          </Section>

          <Section title="Three Things To Know">
            <ul className="space-y-2 pl-5">
              <li>- A config file is a full exported project file. It includes staff, departments, and Flags & Solve choices together.</li>
              <li>- A saved project is a version already stored on this device. Use the Open Projects button on the Welcome page to search and reopen one.</li>
              <li>- A flag preset only stores the Flags & Solve setup. It does not include staff, departments, or results.</li>
            </ul>
          </Section>

          <Section title="Welcome Page">
            <p>
              Use the Welcome page when you want to open an existing project or continue recent work.
            </p>
            <ul className="space-y-2 pl-5">
              <li>- Open a config file when you have a full project file exported from Semester Scheduler.</li>
              <li>- Use Open Projects to search through the projects already saved on this device.</li>
              <li>- Start from scratch when you want to build departments and staff directly in the app.</li>
              <li>- If a file has a problem, the app will point out what needs to be fixed.</li>
            </ul>
          </Section>

          <Section title="Departments Tab">
            <p>
              Use this tab to define the work areas that need hours during the week.
            </p>
            <ul className="space-y-2 pl-5">
              <li>- Add each custom department that should receive scheduled hours.</li>
              <li>- Set target hours for what you want that department to receive.</li>
              <li>- Set max hours for the highest amount that department should receive.</li>
              <li>- Reorder departments if you want them listed in a specific order in the app and exports.</li>
              <li>- <InlineCode>Front Desk</InlineCode> is managed separately with its own toggle at the top.</li>
            </ul>
          </Section>

          <Section title="Staff Tab">
            <p>
              Use this tab to describe each employee.
            </p>
            <ul className="space-y-2 pl-5">
              <li>- Add the employee’s name, roles, and weekly hour limits.</li>
              <li>- Record times when they cannot work, such as classes or other commitments.</li>
              <li>- Give each person at least one role they are allowed to work.</li>
              <li>- If schedules are hard to generate, this tab is often where the issue starts. Very limited availability or missing roles can block good results.</li>
            </ul>
          </Section>

          <Section title="Front Desk Toggle">
            <p>
              This switch controls whether Front Desk is part of the active schedule.
            </p>
            <ul className="space-y-2 pl-5">
              <li>- When enabled, Front Desk is included in scheduling, validation, and exported reports.</li>
              <li>- When disabled, Front Desk coverage is removed from the current run and the scheduler focuses only on your custom departments.</li>
              <li>- Existing Front Desk preferences are kept in case you turn it back on later.</li>
              <li>- If you turn it off, make sure employees still have at least one non-Front-Desk role so they can still be scheduled.</li>
            </ul>
          </Section>

          <Section title="Flags & Solve Tab">
            <p>
              Use this tab when you want to guide the schedule beyond the basic staff and department setup.
            </p>
            <ul className="space-y-2 pl-5">
              <li>- Add preferences if you want the app to lean toward certain outcomes.</li>
              <li>- Add training pairs or equal-hour relationships when those matter.</li>
              <li>- Add required assignments only when something truly must happen at a specific time.</li>
              <li>- Use Project Configuration to open or save a full config file for the whole project.</li>
              <li>- Save a flag preset if you want to reuse only these solver preferences on another project.</li>
              <li>- If you use too many strict rules, it becomes harder for the app to build a workable schedule.</li>
            </ul>
          </Section>

          <Section title="Results Tab">
            <p>
              This is where you view finished schedules and see whether a run worked.
            </p>
            <ul className="space-y-2 pl-5">
              <li>- Successful schedules are saved in history and can be downloaded as Excel files.</li>
              <li>- If a run fails, the app will explain the likely reason in plain language.</li>
              <li>- You can keep generating new versions after making changes in other tabs.</li>
            </ul>
          </Section>

          <Section title="A Good First Approach">
            <p>
              If you are not sure how much detail to enter, keep it simple at first.
            </p>
            <ul className="space-y-2 pl-5">
              <li>- Add your departments.</li>
              <li>- Add your staff with accurate roles and unavailable times.</li>
              <li>- Generate one draft schedule before adding lots of special rules.</li>
              <li>- Only add extra preferences if the first draft needs improvement.</li>
              <li>- Save a config file or reopen a saved project later if you want to return to a version that was working.</li>
            </ul>
          </Section>
        </div>
      </DialogShell>
    </>
  );
}
