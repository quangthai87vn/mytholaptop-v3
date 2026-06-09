"use client";

import { useRouter } from "next/navigation";
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth/store";
import { ROLE_LABELS } from "@/lib/auth/permissions";

interface UserMenuProps {
  /** Trigger button variant: 'ghost' (default in header) or 'link' */
  variant?: "ghost" | "link";
  className?: string;
}

export function UserMenu({ variant = "ghost", className }: UserMenuProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const handleSignOut = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          className={cn(
            "flex items-center gap-2 px-2 h-auto py-1.5 rounded-md hover:bg-accent transition-colors",
            className
          )}
        >
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {user && (
            <div className="hidden lg:flex flex-col items-start gap-0.5">
              <span className="text-sm font-medium leading-none">{user.full_name}</span>
              <span className="text-[11px] text-muted-foreground leading-none">
                {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role}
              </span>
            </div>
          )}
          <ChevronDown className="hidden lg:block size-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          {user ? (
            <div className="flex items-center gap-3 px-1 py-1">
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-sm font-medium leading-none truncate">{user.full_name}</p>
                <p className="text-[11px] text-muted-foreground leading-none truncate">{user.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Chưa đăng nhập</p>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onClick={() => router.push("/profile")}
        >
          <User className="size-4 text-muted-foreground" />
          Thông tin tài khoản
        </DropdownMenuItem>

        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onClick={() => router.push("/settings")}
        >
          <Settings className="size-4 text-muted-foreground" />
          Cài đặt
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="size-4" />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
