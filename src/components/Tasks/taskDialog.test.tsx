import assert from 'node:assert/strict';
import { createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { restoreTaskDialogFocus } from './TaskDialog';
import { TaskEditorDialog } from './TaskEditorDialog';
import { TaskPreviewPopUp } from './TaskPreviewPopUp';

const noop = () => {};
const details = renderToStaticMarkup(
  <TaskPreviewPopUp
    task={{ id: 'task-1', text: 'Write report', isDone: false, createdAt: 0 }}
    now={new Date(2026, 10, 21)}
    clockFormat="24h"
    returnFocus={null}
    onClose={noop}
    onEdit={noop}
  />,
);

const detailsTitleId = details.match(/<dialog[^>]* aria-labelledby="([^"]+)"/)?.[1];
assert.ok(detailsTitleId, 'Task details use a native dialog with a name');
assert.match(details, /<dialog data-task-dialog="true"/);
assert.ok(details.includes(`<h2 id="${detailsTitleId}"`), 'The dialog name identifies its heading');
assert.match(details, /aria-label="Close task details"/);
assert.match(details, /> Edit task<\/button>/);
assert.doesNotMatch(details, /<(input|select|textarea|form)\b/, 'Details stay read-only');

const renderEstimatedCash = (castleActive: boolean, durationMinutes: number) => renderToStaticMarkup(
  <TaskPreviewPopUp
    task={{ id: 'task-2', text: 'Plan next week', durationMinutes, deadline: '2026-11-21', isDone: false, createdAt: 0 }}
    now={new Date(2026, 10, 21)}
    clockFormat="24h"
    castleActive={castleActive}
    returnFocus={null}
    onClose={noop}
    onEdit={noop}
  />,
);
const activeEstimate = renderEstimatedCash(true, 15);
assert.match(activeEstimate, /Estimated cash value/);
assert.match(activeEstimate, /\$4\.69/);
assert.match(activeEstimate, /Earnings use the actual time you report/);
assert.doesNotMatch(renderEstimatedCash(false, 15), /Estimated cash value/);
assert.doesNotMatch(renderEstimatedCash(true, 0), /Estimated cash value/);

const editorProps = {
  title: 'Write report',
  returnFocus: null,
  fallbackFocus: createRef<HTMLHeadingElement>(),
  onTitleChange: noop,
  onClose: noop,
  onSubmit: noop,
};
const editor = renderToStaticMarkup(
  <TaskEditorDialog {...editorProps} editing>
    <textarea aria-label="Description" />
  </TaskEditorDialog>,
);
const editorTitleId = editor.match(/<dialog[^>]* aria-labelledby="([^"]+)"/)?.[1];
assert.ok(editorTitleId, 'The editor is a native dialog');
assert.match(editor, /<dialog data-task-dialog="true"/);
assert.match(editor, new RegExp(`<h2 id="${editorTitleId}"[^>]*>Edit Task</h2>`));
assert.match(editor, /aria-label="Close task editor"/);
const inputId = editor.match(/<label for="([^"]+)"[^>]*>Task Title/)?.[1];
assert.ok(inputId);
assert.ok(editor.includes(`<input id="${inputId}" type="text" required=""`), 'The required title input is labelled');
assert.match(
  editor,
  /<div class="[^"]*overflow-y-auto[^"]*">.*<textarea[^>]*><\/textarea><\/div><footer class="[^"]*shrink-0[^"]*"><button type="button" class="min-h-11[^"]*">Cancel<\/button><button type="submit" class="min-h-11[^"]*">Save Changes<\/button><\/footer><\/form>/,
  'The footer actions remain in the form outside the scrolling fields',
);
const create = renderToStaticMarkup(<TaskEditorDialog {...editorProps} editing={false} />);
assert.match(create, />Create New Task<\/h2>/);
assert.match(create, /<button type="submit"[^>]*>Create Task<\/button>/);

// Exercise the focus fallback decision without a browser or DOM dependencies.
const documentStub = { activeElement: null as SVGElement | HTMLElement | null };
const radarNode = {
  ownerDocument: documentStub,
  isConnected: true,
  getClientRects: () => [{ width: 24 }],
  focus: () => { documentStub.activeElement = radarNode as unknown as SVGElement; },
};
const heading = {
  focus: () => { documentStub.activeElement = heading as unknown as HTMLElement; },
} as unknown as HTMLElement;
const svgTrigger = radarNode as unknown as SVGElement;

restoreTaskDialogFocus(svgTrigger, heading);
assert.equal(documentStub.activeElement, svgTrigger, 'A visible SVG trigger receives focus');
radarNode.isConnected = false;
restoreTaskDialogFocus(svgTrigger, heading);
assert.equal(documentStub.activeElement, heading, 'An outgoing trigger falls back to the Tasks heading');
radarNode.isConnected = true;
radarNode.getClientRects = () => [];
documentStub.activeElement = null;
restoreTaskDialogFocus(svgTrigger, heading);
assert.equal(documentStub.activeElement, heading, 'A hidden trigger falls back to the Tasks heading');

documentStub.activeElement = null;
restoreTaskDialogFocus(null, heading);
assert.equal(documentStub.activeElement, heading, 'Opening the editor from another view can use the Tasks heading');

console.log('Task dialog markup, form actions, and focus fallback tests passed.');
