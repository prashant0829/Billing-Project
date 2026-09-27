"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import Button from "./Button";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return <Button variant="secondary" size="sm" icon={isDark ? <Sun size={16}/> : <Moon size={16}/>} onClick={toggleTheme}>
    {isDark ? "Light mode" : "Dark mode"}
  </Button>;
}
