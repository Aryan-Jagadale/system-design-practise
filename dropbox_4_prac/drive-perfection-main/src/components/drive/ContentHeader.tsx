import { 
  ChevronDown, 
  LayoutGrid, 
  List, 
  Info,
  ArrowUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ContentHeaderProps {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

const ContentHeader = ({ viewMode, onViewModeChange }: ContentHeaderProps) => {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 px-3 gap-1 text-lg font-medium hover:bg-muted rounded-lg">
              My Drive
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem>My Drive</DropdownMenuItem>
            <DropdownMenuItem>Shared with me</DropdownMenuItem>
            <DropdownMenuItem>Recent</DropdownMenuItem>
            <DropdownMenuItem>Starred</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 gap-2 hover:bg-muted rounded-lg">
              <ArrowUpDown className="w-4 h-4" />
              <span className="text-sm">Name</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>Name</DropdownMenuItem>
            <DropdownMenuItem>Last modified</DropdownMenuItem>
            <DropdownMenuItem>Last modified by me</DropdownMenuItem>
            <DropdownMenuItem>Last opened by me</DropdownMenuItem>
            <DropdownMenuItem>Storage used</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Toggle */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden ml-2">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "w-9 h-9 rounded-none",
              viewMode === "list" && "bg-muted"
            )}
            onClick={() => onViewModeChange("list")}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "w-9 h-9 rounded-none",
              viewMode === "grid" && "bg-muted"
            )}
            onClick={() => onViewModeChange("grid")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>

        {/* Info */}
        <Button variant="ghost" size="icon" className="w-9 h-9 ml-1 hover:bg-muted rounded-lg">
          <Info className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ContentHeader;
