import { Search, HelpCircle, Settings, LayoutGrid } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="flex items-center h-16 px-4 border-b border-border bg-background">
      {/* Logo Section */}
      <div className="flex items-center min-w-[256px]">
        <div className="flex items-center gap-2 px-2">
          <svg className="w-10 h-10" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
            <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
            <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
            <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
            <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
            <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
            <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
          </svg>
          <span className="text-[22px] text-google-gray-700 tracking-tight">Drive Clone</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-[720px] mx-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <Search className="w-5 h-5 text-muted-foreground" />
          </div>
          <Input
            type="text"
            placeholder="Search in Drive"
            className="w-full h-12 pl-12 pr-4 bg-google-gray-100 border-0 rounded-google text-base placeholder:text-muted-foreground focus:bg-background focus:shadow-google transition-all duration-200 focus-visible:ring-0"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1 ml-auto">
        <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full hover:bg-muted">
          <HelpCircle className="w-5 h-5 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full hover:bg-muted">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full hover:bg-muted">
          <LayoutGrid className="w-5 h-5 text-muted-foreground" />
        </Button>
        <div className="ml-2">
          <Avatar className="w-8 h-8 cursor-pointer">
            <AvatarImage src="https://lh3.googleusercontent.com/a/default-user=s40-c" />
            <AvatarFallback className="bg-google-blue text-primary-foreground text-sm">U</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
};

export default Header;
