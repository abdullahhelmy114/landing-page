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

- Keep scroll choreography in the shared motion hook and CSS; pinned program layouts must fall back to natural document flow on narrow or short screens so content remains readable.
- Regular and intensive course prices live in shared course data; registration derives its pricing and summary from the selected course to prevent cross-course mismatches. There is no timetable or level choice: the form asks only course and group type (Kadın/Erkek), and the academy sets the level after payment. Persist the WhatsApp group ID (gender, with a plus suffix for the intensive course) through the existing registration endpoint.
- Images used on the standalone Coolify deployment retain intentional public/images copies because host-relative Lovable asset URLs are unavailable on that external server.
