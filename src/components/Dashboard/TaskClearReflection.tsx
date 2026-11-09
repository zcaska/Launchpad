import { useEffect, useRef, useState } from 'react';
import { BookOpenText, CaretLeft, CaretRight, Check, Flag, X } from '@phosphor-icons/react';
import { ConfettiStyle } from '../../types';

const prompts = [
  'What did you accomplish today, and which actions made the greatest difference to the result?',
  'Where did you meet resistance or distraction, and what did your response reveal about your habits?',
  'Which decision or assumption would you reconsider, and what evidence has changed your perspective?',
  'What did you learn about your priorities, energy, or attention, and how will you use that insight?',
  'What specific commitment will you make for your next session, and how will you hold yourself accountable?',
  'Describe a difficult moment today. What emotions did you notice, and what did you do next?',
  'What work mattered most to you today, and how did your choices reflect your longer-term values?',
  'Where did your expectations differ from reality, and what would a more honest plan look like next time?',
  'What support, environment, or boundary helped you move forward, and how can you create it again?',
  'What would you tell your future self about today’s work, including the parts that were uncomfortable?',
];
const words = (value: string) => value.trim().split(/\s+/u).filter(Boolean).length;

export function TaskClearReflection({ onClose, onSubmit }: {
  style?: ConfettiStyle;
  onClose: () => void;
  onSubmit: (questions: string[], answers: string[]) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [questions] = useState(() => {
    const offset = Math.floor(Math.random() * prompts.length);
    return Array.from({ length: 5 }, (_, index) => prompts[(offset + index * 2) % prompts.length]);
  });
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''));
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [confirmClose, setConfirmClose] = useState(false);
  const completedCount = answers.filter((answer) => words(answer) >= 150).length;
  const ready = completedCount === questions.length;
  const currentCount = words(answers[activeQuestion]);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby="task-clear-title" aria-describedby="reflection-description"
      onCancel={(event) => { event.preventDefault(); setConfirmClose(true); }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-y-auto bg-transparent p-3 backdrop:bg-stone-950/65 backdrop:backdrop-blur-sm open:flex open:items-center open:justify-center sm:p-6">
      <form onSubmit={(event) => { event.preventDefault(); if (ready) onSubmit(questions, answers); }}
        className="mx-auto my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-serene-border-light bg-serene-surface-light text-serene-text-primary shadow-2xl dark:border-serene-border-dark dark:bg-serene-surface-dark dark:text-serene-text-darkPrimary sm:max-h-[calc(100dvh-3rem)]">
        <header className="shrink-0 border-b border-serene-border-light px-5 py-5 dark:border-serene-border-dark sm:px-7 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
                <BookOpenText className="h-5 w-5" weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <h2 id="task-clear-title" className="text-lg font-bold tracking-tight sm:text-xl">Reflect on your work</h2>
                <p id="reflection-description" className="mt-1 text-sm leading-relaxed text-serene-text-secondary dark:text-serene-text-darkSecondary">
                  Take a moment to look back before recording your progress.
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setConfirmClose(true)} aria-label="Close reflection"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-serene-text-secondary hover:bg-serene-surfaceAlt-light focus-visible:ring-2 focus-visible:ring-teal-600 dark:text-serene-text-darkSecondary dark:hover:bg-serene-surfaceAlt-dark">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3 text-xs font-semibold">
            <span className="text-serene-text-secondary dark:text-serene-text-darkSecondary">Your reflection</span>
            <span className="text-serene-text-muted dark:text-serene-text-darkMuted">{completedCount} of 5 complete</span>
          </div>
          <div className="mt-2 flex gap-1.5" role="group" aria-label="Reflection questions">
            {questions.map((question, index) => (
              <button key={question} type="button" onClick={() => setActiveQuestion(index)}
                aria-label={'Question ' + (index + 1) + (words(answers[index]) >= 150 ? ', complete' : '')}
                aria-current={activeQuestion === index ? 'step' : undefined}
                className={'h-2 flex-1 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ' +
                  (activeQuestion === index ? 'bg-teal-700 dark:bg-teal-400' : words(answers[index]) >= 150 ? 'bg-teal-400 dark:bg-teal-700' : 'bg-stone-200 dark:bg-stone-700')} />
            ))}
          </div>
          {confirmClose && (
            <div role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="font-semibold">Leave this reflection?</p>
              <p className="mt-1 leading-relaxed">Your answers will be discarded and completed tasks will return to your queue.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setConfirmClose(false)} className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-200 dark:bg-amber-800/50 dark:text-amber-50 dark:hover:bg-amber-800">Keep writing</button>
                <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-semibold underline underline-offset-2">Leave and reset tasks</button>
              </div>
            </div>
          )}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-300">
            <Flag className="h-4 w-4" aria-hidden="true" />
            <span>Question {activeQuestion + 1} of 5</span>
          </div>
          <label htmlFor="reflection-answer" className="block text-base font-bold leading-relaxed text-serene-text-primary dark:text-serene-text-darkPrimary">
            {questions[activeQuestion]}
          </label>
          <p className="mt-1.5 text-sm text-serene-text-secondary dark:text-serene-text-darkSecondary">Write at least 150 words for each question.</p>
          <textarea id="reflection-answer" value={answers[activeQuestion]}
            onPaste={(event) => event.preventDefault()}
            onChange={(event) => setAnswers((current) => current.map((answer, index) => index === activeQuestion ? event.target.value : answer))}
            placeholder="Give yourself space to think and write..."
            className="mt-4 min-h-52 w-full resize-y rounded-xl border border-serene-border-light bg-serene-surfaceAlt-light/60 p-4 text-sm leading-7 text-serene-text-primary placeholder:text-stone-500 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 dark:border-serene-border-dark dark:bg-serene-surfaceAlt-dark dark:text-serene-text-darkPrimary dark:placeholder:text-stone-400 dark:focus:border-teal-400" />
          <div className="mt-2 flex items-center justify-between gap-3 text-xs">
            <span className="text-serene-text-muted dark:text-serene-text-darkMuted">Your answers are saved when you record progress.</span>
            <span className={'flex shrink-0 items-center gap-1 font-semibold ' + (currentCount >= 150 ? 'text-teal-700 dark:text-teal-300' : 'text-serene-text-secondary dark:text-serene-text-darkSecondary')}>
              {currentCount >= 150 && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              {currentCount} / 150 words
            </span>
          </div>

        </div>
        <footer className="shrink-0 border-t border-serene-border-light px-5 py-4 dark:border-serene-border-dark sm:px-7">
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => setActiveQuestion((index) => Math.max(index - 1, 0))} disabled={activeQuestion === 0}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2.5 text-sm font-semibold text-serene-text-secondary hover:bg-serene-surfaceAlt-light disabled:opacity-40 dark:text-serene-text-darkSecondary dark:hover:bg-serene-surfaceAlt-dark">
              <CaretLeft className="h-4 w-4" aria-hidden="true" /> Previous
            </button>
            {activeQuestion < questions.length - 1 ? (
              <button type="button" onClick={() => setActiveQuestion((index) => index + 1)}
                className="inline-flex items-center gap-1 rounded-xl bg-serene-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-serene-primary-hover dark:bg-teal-700 dark:hover:bg-teal-600">
                Next question <CaretRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button type="submit" disabled={!ready}
                className="rounded-xl bg-serene-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-serene-primary-hover disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-700 dark:hover:bg-teal-600">
                Record progress
              </button>
            )}
          </div>
          {!ready && activeQuestion === questions.length - 1 && (
            <p className="mt-2 text-right text-xs text-serene-text-muted dark:text-serene-text-darkMuted">Complete all five answers to record progress.</p>
          )}
        </footer>
      </form>
    </dialog>
  );
}
