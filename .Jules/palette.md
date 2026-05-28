## 2024-05-05 - Add Confirmation Dialog for Destructive Actions
**Learning:** For destructive actions such as deleting a resource (e.g. deleting a bicycle in `bicycle-management.tsx`), it's a critical UX improvement to add a confirmation prompt. It prevents accidental clicks from destroying data.
**Action:** Always wrap delete form submissions or button clicks with a confirmation dialog (`window.confirm` or a custom modal) to ensure the user actually intended to execute the destructive action.
