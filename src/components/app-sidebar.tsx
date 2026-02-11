import { NavLink } from 'react-router-dom';
import {
  Sparkles,
  Video,
  Image as ImageIcon,
  Wand2,
  Library,
  User,
  Home,
  ChevronRight,
  Headphones,
  ImagePlay,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import { useAuth } from '@/context/AuthContext';
import { useCredits } from '@/context/CreditsContext';

export function AppSidebar() {
  const { user } = useAuth();
  const { balance, isLoading: creditsLoading } = useCredits();

  return (
    <Sidebar collapsible="offcanvas" className="flex border-none">
      <SidebarHeader className=" pb-3">
        <NavLink to="/" className="flex items-center gap-3 px-2 py-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm font-bold text-foreground">Clipify</h1>
            <p className="text-[11px] text-muted-foreground">AI Content Creation</p>
          </div>
        </NavLink>


      </SidebarHeader>

      <SidebarContent className="px-2 py-4 bg-transparent">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Home" className="rounded-lg">
                  <NavLink to="/" className={({ isActive }) => isActive ? 'bg-sidebar-accent font-medium' : 'hover:bg-sidebar-accent/50'}>
                    <Home className="w-4 h-4" />
                    <span className="text-sm">Home</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Video Generator" className="rounded-lg">
                  <NavLink to="/video" className={({ isActive }) => isActive ? 'bg-sidebar-accent font-medium' : 'hover:bg-sidebar-accent/50'}>
                    <Video className="w-4 h-4" />
                    <span className="text-sm">Video</span>
                  </NavLink>
                </SidebarMenuButton>
                <SidebarMenuBadge>New</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Image Generator" className="rounded-lg">
                  <NavLink to="/image" className={({ isActive }) => isActive ? 'bg-sidebar-accent font-medium' : 'hover:bg-sidebar-accent/50'}>
                    <ImageIcon className="w-4 h-4" />
                    <span className="text-sm">Image</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="AI Scene Builder" className="rounded-lg">
                  <NavLink to="/scene-builder" className={({ isActive }) => isActive ? 'bg-sidebar-accent font-medium' : 'hover:bg-sidebar-accent/50'}>
                    <Wand2 className="w-4 h-4" />
                    <span className="text-sm">AI Scene</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Pro */}
        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">
            Pro
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="ASMR Videos" className="rounded-lg">
                  <NavLink to="/asmr" className={({ isActive }) => isActive ? 'bg-sidebar-accent font-medium' : 'hover:bg-sidebar-accent/50'}>
                    <Headphones className="w-4 h-4" />
                    <span className="text-sm">ASMR Videos</span>
                  </NavLink>
                </SidebarMenuButton>
                <SidebarMenuBadge>Pro</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Video from Image" className="rounded-lg">
                  <NavLink to="/video-ref" className={({ isActive }) => isActive ? 'bg-sidebar-accent font-medium' : 'hover:bg-sidebar-accent/50'}>
                    <ImagePlay className="w-4 h-4" />
                    <span className="text-sm">Img to Video</span>
                  </NavLink>
                </SidebarMenuButton>
                <SidebarMenuBadge>Pro</SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Library */}
        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">
            Library
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="All Generations" className="rounded-lg">
                  <NavLink to="/library" className={({ isActive }) => isActive ? 'bg-sidebar-accent font-medium' : 'hover:bg-sidebar-accent/50'}>
                    <Library className="w-4 h-4" />
                    <span className="text-sm">All Generations</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border pt-3">
        {/* Credits Display */}
        <div className="px-3 py-2 mx-2 mb-2 rounded-lg bg-sidebar-accent/50 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Balance</p>
            <p className="font-bold text-base text-foreground">
              {creditsLoading ? '...' : `$${balance.toFixed(2)}`}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>

        {/* User Menu */}
        <div className="px-2 mb-2">
          <NavLink
            to="/profile"
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
              ${isActive ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent/50'}
            `}
          >
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-foreground truncate">{user?.email || 'User'}</span>
              <span className="text-[10px] text-muted-foreground truncate">View profile</span>
            </div>
          </NavLink>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
