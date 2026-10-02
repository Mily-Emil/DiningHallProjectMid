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

## Project rules

- Auth uses synthetic emails derived from a student's registration number (`<reg>@dining.unklab.app`); a real inbox is never required, so email auto-confirm stays on.
- All dining logic (QR token issuance, scan validation, manual check-in, staff dashboard) lives in `src/lib/dining.functions.ts` as TanStack server functions so validation cannot be bypassed from the browser.
- Roles are stored in the separate `user_roles` table and checked via the `has_role()` security-definer function, never on `profiles`.
- QR tokens are single-use with a 15-second TTL and the student screen rotates them every 10 seconds, so a screenshot cannot be reused.
