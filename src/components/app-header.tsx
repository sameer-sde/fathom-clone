import SearchBar from "@/app/meetings/search-bar";
import { Wordmark } from "@/components/ui";

export default function AppHeader({ email }: { email?: string | null }) {
  return (
    <header className="sticky top-0 z-20 border-b border-rule bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Wordmark />
        <div className="ml-auto flex items-center gap-3 sm:gap-5">
          <SearchBar />
          {email && <span className="hidden text-[13px] text-muted md:inline">{email}</span>}
          <form action="/auth/signout" method="post">
            <button className="whitespace-nowrap text-[13px] text-ink-2 underline decoration-rule-strong underline-offset-4 hover:text-ink hover:decoration-ink">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
