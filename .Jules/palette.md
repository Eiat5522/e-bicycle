## 2024-05-24 - Confirm Destructive Actions
**Learning:** Destructive actions like deleting a bicycle were executing immediately upon clicking the button, without any confirmation step. This is a critical UX flaw that can lead to accidental data loss. Even though the delete button had danger styling, users still need a momentary pause to confirm their intent.
**Action:** Always add a confirmation step (e.g., `window.confirm` or a custom dialog modal) to any form submission or button click that results in irreversible data deletion.
