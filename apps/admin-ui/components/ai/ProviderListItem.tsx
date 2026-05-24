"use client";

import { WifiOff, XCircle, Star } from "lucide-react";
import type { ProviderCard } from "@/types/ai-operating";
import { ProviderMenu } from "./ProviderMenu";

interface ProviderListItemProps {
  provider: ProviderCard;
  isSelected: boolean;
  isDefault: boolean;
  onSelect: (p: ProviderCard) => void;
  onEdit: (p: ProviderCard) => void;
  onDeleted: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  connected: "Connected",
  error: "Error",
  testing: "Testing",
  unknown: "Offline",
};

export function ProviderListItem({
  provider,
  isSelected,
  isDefault,
  onSelect,
  onEdit,
  onDeleted,
  onRefresh,
  loading,
}: ProviderListItemProps) {
  const isActive = provider.status === "active";
  const displayName = provider.display_name || provider.name || provider.type;
  const latency = provider.health?.latency_ms;
  const connectionStatus = provider.connection_status;

  // Derive group label from group_slug (from DB, not hardcoded)
  const groupLabel = provider.group_slug
    ? provider.group_slug
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "Provider";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(provider)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(provider);
        }
      }}
      className={`
        group relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer
        transition-all duration-150 select-none
        ${isSelected
          ? "bg-primary/10 border border-primary/30 shadow-sm"
          : "hover:bg-muted/60 border border-transparent"
        }
      `}
      style={{ minHeight: "52px" }}
    >
      {/* Active indicator bar */}
      {isSelected && (
        <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary" />
      )}

      {/* Provider icon placeholder */}
      <div className={`
        w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-xs font-semibold
        ${isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}
      `}>
        {(displayName || "P").charAt(0).toUpperCase()}
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`
            text-sm font-medium truncate
            ${!isActive ? "text-muted-foreground" : ""}
          `}>
            {displayName}
          </span>
          {isDefault && (
            <Star className="size-3 text-amber-500 fill-amber-500 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-muted-foreground">
            {groupLabel}
          </span>
          {provider.model_name && (
            <>
              <span className="text-[10px] text-muted-foreground/40">·</span>
              <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[100px]">
                {provider.model_name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Status + actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Latency */}
        {latency != null && latency > 0 && (
          <span className="text-[10px] font-mono text-muted-foreground">
            {latency}ms
          </span>
        )}

        {/* Status indicator */}
        {connectionStatus === "connected" && (
          <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
        )}
        {connectionStatus === "error" && (
          <XCircle className="size-3 text-red-500" />
        )}
        {(!connectionStatus || connectionStatus === "unknown") && (
          <WifiOff className="size-3 text-muted-foreground/40" />
        )}

        {/* Menu */}
        <ProviderMenu
          provider={provider}
          onEdit={onEdit}
          onDeleted={onDeleted}
          onRefresh={onRefresh}
          loading={loading}
        />
      </div>
    </div>
  );
}
