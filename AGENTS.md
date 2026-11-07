<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep task-history month range logic in `src/lib/task-months.ts`, consumed by the Entregables page, so task dates do not change financial month options elsewhere.
- Keep legacy piece accounting in shared pure helpers: untyped work contributes to posts when a breakdown exists, and retain its storage bucket so old task delivery updates remain visible without double-counting.
- Normalize invoice conditions at save and PDF boundaries so supplier documents cannot inherit hidden client terms.
