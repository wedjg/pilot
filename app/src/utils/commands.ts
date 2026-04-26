type UndoFn = () => Promise<void>;
type RedoFn = () => Promise<void>;

interface CommandEntry {
  description: string;
  undo: UndoFn;
  redo: RedoFn;
}

const undoStack: CommandEntry[] = [];
const redoStack: CommandEntry[] = [];
const MAX_HISTORY = 20;

export function pushCommand(description: string, undo: UndoFn, redo: RedoFn) {
  undoStack.push({ description, undo, redo });
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack.length = 0; // clear redo on new action
}

export async function undo(): Promise<string | null> {
  const cmd = undoStack.pop();
  if (!cmd) return null;
  await cmd.undo();
  redoStack.push(cmd);
  return cmd.description;
}

export async function redo(): Promise<string | null> {
  const cmd = redoStack.pop();
  if (!cmd) return null;
  await cmd.redo();
  undoStack.push(cmd);
  return cmd.description;
}

export function clearHistory() {
  undoStack.length = 0;
  redoStack.length = 0;
}
