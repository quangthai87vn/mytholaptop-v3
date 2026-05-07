"use client";

import { useRouter } from "next/navigation";
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const CURRENT_USER = {
  name: "Nguyễn Văn Admin",
  email: "admin@mytholaptop.vn",
  role: "Quản trị viên",
  avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
  initials: "AD",
};

interface UserMenuProps {
  /** Trigger button variant: 'ghost' (default in header) or 'link' */
  variant?: "ghost" | "link";
  className?: string;
}

export function UserMenu({ variant = "ghost", className }: UserMenuProps) {
  const router = useRouter();

  const handleSignOut = () => {
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
            <AvatarImage src={CURRENT_USER.avatarUrl} alt={CURRENT_USER.name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {CURRENT_USER.initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden lg:flex flex-col items-start gap-0.5">
            <span className="text-sm font-medium leading-none">{CURRENT_USER.name}</span>
            <span className="text-[11px] text-muted-foreground leading-none">
              {CURRENT_USER.role}
            </span>
          </div>
          <ChevronDown className="hidden lg:block size-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3 px-1 py-1">
            <Avatar className="size-9">
              <AvatarImage src={CURRENT_USER.avatarUrl} alt={CURRENT_USER.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {CURRENT_USER.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="text-sm font-medium leading-none truncate">
                {CURRENT_USER.name}
              </p>
              <p className="text-[11px] text-muted-foreground leading-none truncate">
                {CURRENT_USER.email}
              </p>
            </div>
          </div>
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
