import {
  LayoutDashboard,
  GraduationCap,
  Swords,
  Bot,
  SquareTerminal,
  TrendingUp,
  Trophy,
  Users,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  to:
    | "/dashboard"
    | "/learn"
    | "/challenges"
    | "/tutor"
    | "/terminal"
    | "/progress"
    | "/achievements"
    | "/friends"
    | "/profile"
    | "/settings";
  label: string;
  icon: LucideIcon;
  hint: string;
};

export const primaryNav: NavItem[] = [
  { to: "/dashboard", label: "Command Deck", icon: LayoutDashboard, hint: "Your daily overview" },
  { to: "/learn", label: "Learning Paths", icon: GraduationCap, hint: "Structured Linux & security tracks" },
  { to: "/challenges", label: "Challenges", icon: Swords, hint: "Applied lab missions" },
  { to: "/tutor", label: "AI Tutor", icon: Bot, hint: "Ask your mentor" },
  { to: "/terminal", label: "Practice Terminal", icon: SquareTerminal, hint: "Sandboxed shell surface" },
];

export const progressNav: NavItem[] = [
  { to: "/progress", label: "Progress", icon: TrendingUp, hint: "Skill growth over time" },
  { to: "/achievements", label: "Achievements", icon: Trophy, hint: "Badges and forge ranks" },
  { to: "/friends", label: "Squad", icon: Users, hint: "Friends and leaderboards" },
];

export const accountNav: NavItem[] = [
  { to: "/profile", label: "Profile", icon: UserRound, hint: "Your public forge identity" },
  { to: "/settings", label: "Settings", icon: Settings, hint: "Preferences and language" },
];

export const navGroups = [
  { title: "Forge", items: primaryNav },
  { title: "Growth", items: progressNav },
  { title: "Account", items: accountNav },
];
