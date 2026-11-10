import { test } from "node:test";
import assert from "node:assert/strict";
import { validateTaskFiles, TASK_ATTACHMENT_TTL } from "./task-attachments";

test("máximo 10 MB por archivo, inclusive", () => {
  assert.equal(validateTaskFiles([{ name: "foto.jpg", size: 10485760 }], 0), null);
  assert.match(validateTaskFiles([{ name: "foto.jpg", size: 10485761 }], 0) ?? "", /10 MB/);
});
test("máximo 10 archivos por tarea, incluidos los existentes", () => {
  assert.equal(validateTaskFiles([{ name: "referencia.pdf", size: 42 }], 9), null);
  assert.match(validateTaskFiles([{ name: "referencia.pdf", size: 42 }], 10) ?? "", /10 archivos/);
});
test("permite imágenes, PDF, Word, Excel, PowerPoint y ZIP, no ejecutables", () => {
  for (const ext of ["jpg", "png", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip"]) {
    assert.equal(validateTaskFiles([{ name: `ref.${ext}`, size: 42 }], 0), null);
  }
  assert.match(validateTaskFiles([{ name: "programa.exe", size: 42 }], 0) ?? "", /no permitido/);
});
test("las referencias firmadas duran una hora", () => {
  assert.equal(TASK_ATTACHMENT_TTL, 3600);
});