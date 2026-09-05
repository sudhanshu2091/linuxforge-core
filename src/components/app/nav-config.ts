import {
  LayoutDashboard,
  GraduationCap,
  Swords,
  Bot,
  SquareTerminal,
  TrendingUp,
  Users,
  Settings,
  UserRound,
  Trophy,
  Bell,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";

export type AppRoute =
  | "/dashboard"
  | "/learn"
  | "/challenges"
  | "/tutor"
  | "/terminal"
  | "/progress"
  | "/achievements"
  | "/friends"
  | "/notifications"
  | "/profile"
  | "/settings";

export type NavItem = {
  to: AppRoute;
  label: string;
  icon: LucideIcon;
  hint: string;
};

/** Primary authenticated navigation — sidebar + mobile drawer. */
export const primaryNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, hint: "Your daily overview" },
  { to: "/learn", label: "Learning Paths", icon: GraduationCap, hint: "Structured Linux & security tracks" },
  { to: "/challenges", label: "Challenges", icon: Swords, hint: "Applied lab missions" },
  { to: "/tutor", label: "AI Tutor", icon: Bot, hint: "Ask your mentor" },
  { to: "/terminal", label: "Labs", icon: SquareTerminal, hint: "Sandboxed lab surface" },
  { to: "/progress", label: "Progression", icon: TrendingUp, hint: "Skill growth over time" },
  { to: "/friends", label: "Squad", icon: Users, hint: "Friends, requests and leaderboard" },
];

/** Account / social entries — live in the top-right user menu. */
export const userMenuNav: NavItem[] = [
  { to: "/profile", label: "Profile", icon: UserRound, hint: "Your forge identity" },
  { to: "/friends", label: "Squad", icon: Users, hint: "Friends and leaderboard" },
  { to: "/achievements", label: "Achievements", icon: Trophy, hint: "Badges and forge ranks" },
  { to: "/settings", label: "Settings", icon: Settings, hint: "Preferences and safety" },
  { to: "/notifications", label: "Notifications", icon: Bell, hint: "Streaks, squad and drills" },
  { to: "/tutor", label: "Help & tutor", icon: LifeBuoy, hint: "Ask your mentor anything" },
];

export const navGroups = [{ title: "Forge", items: primaryNav }];
