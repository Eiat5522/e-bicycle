import { updateUserAction } from "@/app/(admin)/actions";
import { formatAdminDate } from "@/lib/auth";

export interface ManagedUser {
  readonly id: string;
  readonly firstName: string;
  readonly isAdmin: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function UserManagementTable({ users }: { readonly users: ManagedUser[] }) {
  return (
    <section className="rounded-[2rem] bg-[var(--surface)] p-6 shadow-[0_16px_40px_rgba(45,47,47,0.06)]">
      <div className="flex flex-col gap-2 border-b border-black/5 pb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--coral-dark)]">
          User Management
        </p>
        <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
          Manage admin access and profile names.
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-[var(--foreground-muted)]">
          This first pass focuses on profile updates and admin role assignment. Account deletion and
          suspension are intentionally out of scope.
        </p>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-y-3">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
              <th className="px-3 pb-2">First name</th>
              <th className="px-3 pb-2">Admin</th>
              <th className="px-3 pb-2">Created</th>
              <th className="px-3 pb-2">Updated</th>
              <th className="px-3 pb-2">User ID</th>
              <th className="px-3 pb-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr className="rounded-3xl bg-[var(--surface-muted)]" key={user.id}>
                <td className="rounded-l-3xl px-3 py-4 align-top">
                  <form action={updateUserAction} className="grid gap-2 md:grid-cols-[minmax(0,220px)_auto]">
                    <input name="userId" type="hidden" value={user.id} />
                    <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
                      <span>Display name</span>
                      <input
                        className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none ring-0"
                        defaultValue={user.firstName}
                        name="firstName"
                        required
                        type="text"
                      />
                    </label>
                    <div className="flex items-end gap-3">
                      <label className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)]">
                        <input defaultChecked={user.isAdmin} name="isAdmin" type="checkbox" />
                        <span>Admin access</span>
                      </label>
                      <button
                        className="rounded-full bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white"
                        type="submit">
                        Save
                      </button>
                    </div>
                  </form>
                </td>
                <td className="px-3 py-4 text-sm font-semibold text-[var(--foreground)]">
                  {user.isAdmin ? "Admin" : "Standard"}
                </td>
                <td className="px-3 py-4 text-sm text-[var(--foreground-muted)]">
                  {formatAdminDate(user.createdAt)}
                </td>
                <td className="px-3 py-4 text-sm text-[var(--foreground-muted)]">
                  {formatAdminDate(user.updatedAt)}
                </td>
                <td className="px-3 py-4 text-xs text-[var(--foreground-muted)]">{user.id}</td>
                <td className="rounded-r-3xl px-3 py-4 text-xs text-[var(--foreground-muted)]">
                  Profile update
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
