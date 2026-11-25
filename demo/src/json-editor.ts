import { closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { autocompletion } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import {
  bracketMatching, defaultHighlightStyle, HighlightStyle, indentOnInput, syntaxHighlighting,
} from '@codemirror/language';
import { linter, lintGutter } from '@codemirror/lint';
import { EditorState } from '@codemirror/state';
import { drawSelection, EditorView, highlightActiveLine, keymap, lineNumbers } from '@codemirror/view';
import type { CompletionContext } from '@codemirror/autocomplete';
import { tags } from '@lezer/highlight';
import { VISUAL_KINDS } from '../../src/index.js';

const fieldNames = [
  'kind', 'title', 'unit', 'value', 'data', 'categories', 'series', 'x', 'y', 'cells',
  'axes', 'points', 'links', 'columns', 'rows', 'layout', 'minHeight', 'maxHeight', 'aspectRatio',
];

const completionItems = [
  ...VISUAL_KINDS.map((kind) => ({ label: kind, type: 'constant', info: `Use the ${kind} visual` })),
  ...fieldNames.map((field) => ({ label: field, type: 'property', info: `Visual Stack field: ${field}` })),
];

function completeContracts(context: CompletionContext) {
  const word = context.matchBefore(/[A-Za-z][A-Za-z0-9_-]*/);
  if (!word && !context.explicit) return null;
  return {
    from: word?.from ?? context.pos,
    options: completionItems,
  };
}

const theme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'var(--sunk)', color: 'var(--ink)' },
  '.cm-content': { caretColor: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: '12px', lineHeight: '1.65' },
  '.cm-gutters': { backgroundColor: 'var(--sunk)', color: 'var(--subtle)', borderRight: '1px solid var(--rule)' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'rgba(79, 169, 138, .08)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(79, 169, 138, .22)' },
  '.cm-cursor': { borderLeftColor: 'var(--accent)' },
  '.cm-tooltip-autocomplete': { backgroundColor: 'var(--plate)', border: '1px solid var(--strong)', color: 'var(--ink)' },
  '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: 'var(--sunk)', color: 'var(--accent)' },
});

const highlighting = HighlightStyle.define([
  { tag: tags.propertyName, color: '#79c4aa' },
  { tag: tags.string, color: '#c5d86d' },
  { tag: tags.number, color: '#d99460' },
  { tag: tags.bool, color: '#b084ac' },
  { tag: tags.null, color: '#87918e' },
  { tag: tags.punctuation, color: '#a3adaa' },
]);

export interface JsonEditor {
  readonly view: EditorView;
  setValue(value: string): void;
  format(): void;
  destroy(): void;
}

export function createJsonEditor(
  parent: HTMLElement,
  value: string,
  onChange: (value: string) => void,
): JsonEditor {
  const validate = linter((view) => {
    try {
      JSON.parse(view.state.doc.toString());
      return [];
    } catch (error) {
      return [{
        from: 0,
        to: Math.max(1, view.state.doc.length),
        severity: 'error',
        message: error instanceof Error ? error.message : 'Invalid JSON.',
      }];
    }
  });
  const state = EditorState.create({
    doc: value,
    extensions: [
      lineNumbers(), highlightActiveLine(), drawSelection(), history(), indentOnInput(), bracketMatching(),
      closeBrackets(), json(), lintGutter(), validate, autocompletion({
        override: [completeContracts], activateOnTyping: true,
      }), syntaxHighlighting(defaultHighlightStyle), syntaxHighlighting(highlighting), theme,
      keymap.of([...closeBracketsKeymap, ...completionKeymap, ...historyKeymap, indentWithTab, ...defaultKeymap]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChange(update.state.doc.toString());
      }),
      EditorView.contentAttributes.of({
        'aria-label': 'Visualization contract JSON',
        'spellcheck': 'false',
      }),
    ],
  });
  const view = new EditorView({ state, parent });
  return {
    view,
    setValue: (next) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } }),
    format: () => {
      const parsed = JSON.parse(view.state.doc.toString());
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: JSON.stringify(parsed, null, 2) } });
      view.focus();
    },
    destroy: () => view.destroy(),
  };
}
