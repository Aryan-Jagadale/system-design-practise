import { useState } from "react";
import { 
  Plus, 
  HardDrive, 
  Monitor, 
  Users, 
  Clock, 
  Star, 
  Trash2,
  Cloud
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import NewButtonDropdown from "./NewButtonDropdown";

interface NavItem {
  icon: React.ElementType;
  label: string;
  id: string;
}

const navItems: NavItem[] = [
  { icon: HardDrive, label: "My Drive", id: "my-drive" },
  { icon: Monitor, label: "Computers", id: "computers" },
  { icon: Users, label: "Shared with me", id: "shared" },
  { icon: Clock, label: "Recent", id: "recent" },
  { icon: Star, label: "Starred", id: "starred" },
  { icon: Trash2, label: "Trash", id: "trash" },
];

interface SidebarProps {
  onFileUpload?: (files: FileList) => void;
  onFolderCreate?: (name: string) => void;
}

const Sidebar = ({ onFileUpload, onFolderCreate }: SidebarProps) => {
  const [activeItem, setActiveItem] = useState("my-drive");
  const storageUsed = 2.5;
  const storageTotal = 15;
  const storagePercent = (storageUsed / storageTotal) * 100;

  return (
    <aside className="w-[256px] h-full flex flex-col py-2 bg-background">
      {/* New Button */}
      <div className="px-3 mb-4">
        <NewButtonDropdown 
          onFileUpload={onFileUpload}
          onFolderCreate={onFolderCreate}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveItem(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-6 py-2 rounded-r-full text-sm font-medium transition-colors duration-150",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                      : "text-sidebar-foreground hover:bg-muted"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5",
                    isActive ? "text-sidebar-accent-foreground" : "text-muted-foreground"
                  )} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Storage */}
      <div className="px-6 py-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <Cloud className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Storage</span>
        </div>
        <Progress value={storagePercent} className="h-1 mb-2" />
        <p className="text-xs text-muted-foreground">
          {storageUsed} GB of {storageTotal} GB used
        </p>
        <Button 
          variant="outline" 
          className="mt-3 w-full h-9 text-sm font-medium text-primary border-primary hover:bg-primary/5 rounded-google-sm"
        >
          Buy storage
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
