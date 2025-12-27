import { 
  FileText, 
  FileSpreadsheet, 
  Presentation,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickAccessItem {
  id: string;
  name: string;
  type: "document" | "spreadsheet" | "presentation";
  thumbnail?: string;
}

const quickAccessItems: QuickAccessItem[] = [
  { id: "1", name: "Q4 Report.docx", type: "document" },
  { id: "2", name: "Budget 2025.xlsx", type: "spreadsheet" },
  { id: "3", name: "Team Presentation.pptx", type: "presentation" },
  { id: "4", name: "Project Plan.docx", type: "document" },
  { id: "5", name: "Analytics.xlsx", type: "spreadsheet" },
];

const getFileIcon = (type: QuickAccessItem["type"]) => {
  const iconClasses = "w-5 h-5";
  
  switch (type) {
    case "document":
      return <FileText className={cn(iconClasses, "text-google-blue")} />;
    case "spreadsheet":
      return <FileSpreadsheet className={cn(iconClasses, "text-google-green")} />;
    case "presentation":
      return <Presentation className={cn(iconClasses, "text-google-yellow")} />;
  }
};

const getFileColor = (type: QuickAccessItem["type"]) => {
  switch (type) {
    case "document":
      return "bg-blue-50";
    case "spreadsheet":
      return "bg-green-50";
    case "presentation":
      return "bg-yellow-50";
  }
};

const QuickAccess = () => {
  return (
    <div className="px-6 pt-4 pb-2">
      <h2 className="text-sm font-medium text-foreground mb-3">Quick Access</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {quickAccessItems.map((item) => (
          <div 
            key={item.id}
            className="group flex-shrink-0 w-[200px] flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-all duration-150"
          >
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              getFileColor(item.type)
            )}>
              {getFileIcon(item.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuickAccess;
